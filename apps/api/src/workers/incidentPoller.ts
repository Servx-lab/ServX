import axios from 'axios';
import { supabaseAdmin } from '../utils/supabaseAdmin';
import { HOSTING_DB_NAME_TO_KEY } from '@servx/config';
import { decrypt } from '@servx/crypto';
import { auditEmitter } from '../domains/operations/auditEmitter';
import { syncDeploymentIncidents } from '../domains/connections/service';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const AXIOS_TIMEOUT = 5000;
const POLL_CONCURRENCY = 5;
let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Runs an async mapper over `items` with a bounded number of in-flight
 * operations at a time.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Fetches deployments from Render for a given token and returns failed ones.
 */
async function fetchRenderFailedDeploys(token: string): Promise<any[]> {
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const svcRes = await axios.get('https://api.render.com/v1/services?limit=5', {
      headers,
      timeout: AXIOS_TIMEOUT,
    });
    if (!svcRes?.data?.length) return [];

    const allDeploys = await Promise.all(
      svcRes.data.slice(0, 5).map((s: any) =>
        axios
          .get(`https://api.render.com/v1/services/${s.service.id}/deploys?limit=3`, {
            headers,
            timeout: AXIOS_TIMEOUT,
          })
          .then((r: any) =>
            (r.data || []).map((d: any) => ({
              id: d.deploy?.id || d.id,
              name: s.service.name,
              state: normalizeRenderStatus(d.deploy?.status || ''),
              created: new Date(d.deploy?.createdAt || Date.now()).getTime(),
              commit: d.deploy?.commit?.message || null,
            }))
          )
          .catch(() => [])
      )
    );

    const deployments = allDeploys.flat();
    return deployments.filter((dep: any) => {
      const state = (dep.state || '').toUpperCase();
      return (
        ['ERROR', 'FAILED', 'CRASHED', 'DOWN', 'UNHEALTHY'].includes(state) ||
        state.includes('FAIL') ||
        state.includes('ERR')
      );
    });
  } catch (err: any) {
    console.warn('[Poller] Render fetch failed:', err.message);
    return [];
  }
}

function normalizeRenderStatus(raw: string): string {
  if (['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled'].includes(raw)) return 'ERROR';
  if (['build_in_progress', 'update_in_progress', 'pre_deploy_in_progress'].includes(raw)) return 'BUILDING';
  if (raw === 'live') return 'READY';
  if (raw === 'deactivated') return 'CANCELED';
  if (raw === 'created') return 'QUEUED';
  return raw.toUpperCase();
}

/**
 * Fetches deployments from Vercel for a given token and returns failed ones.
 */
async function fetchVercelFailedDeploys(token: string): Promise<any[]> {
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const res = await axios.get('https://api.vercel.com/v6/deployments?limit=10&state=ERROR', {
      headers,
      timeout: AXIOS_TIMEOUT,
    });
    const deployments = res.data?.deployments || [];
    return deployments.map((d: any) => ({
      id: d.uid || d.id,
      name: d.name || d.project || 'Unknown',
      state: 'ERROR',
      created: d.created || d.createdAt || Date.now(),
      commit: d.meta?.githubCommitMessage || null,
    }));
  } catch (err: any) {
    console.warn('[Poller] Vercel fetch failed:', err.message);
    return [];
  }
}

/**
 * Main polling function. Iterates all active hosting connections and syncs failures.
 */
async function pollAllConnections(): Promise<void> {
  try {
    console.log('[Poller] Starting reconciliation sweep...');

    const { data: connections, error } = await supabaseAdmin
      .from('hosting_vault')
      .select('id, user_id, provider, encrypted_config, iv');

    if (error || !connections || connections.length === 0) {
      console.log('[Poller] No active connections to poll.');
      return;
    }

    // Process connections with bounded concurrency instead of one-at-a-time,
    // since each connection's decrypt + provider API call + Supabase upsert
    // is fully independent of the others.
    interface PollOutcome {
      userId: string;
      providerKey: string;
      newCount: number;
    }

    const outcomes = await mapWithConcurrency(connections as any[], POLL_CONCURRENCY, async (conn): Promise<PollOutcome | null> => {
      try {
        // Decrypt the API token
        let rawConfig = conn.encrypted_config;
        if (conn.iv && conn.iv !== '') {
          rawConfig = decrypt({ iv: conn.iv, content: conn.encrypted_config });
        }
        const parsedConfig = JSON.parse(rawConfig) as { token?: string; apiKey?: string };
        const token = (parsedConfig.token ?? parsedConfig.apiKey) as string;
        if (!token) return null;

        // Determine provider key from dbName via the precomputed reverse lookup map
        const providerKey = HOSTING_DB_NAME_TO_KEY[String(conn.provider)];
        if (!providerKey) return null;

        let failedDeploys: any[] = [];

        if (providerKey === 'render') {
          failedDeploys = await fetchRenderFailedDeploys(token);
        } else if (providerKey === 'vercel') {
          failedDeploys = await fetchVercelFailedDeploys(token);
        }
        // Skip other providers (railway, digitalocean, coolify) for now

        if (failedDeploys.length === 0) return null;

        const newCount = await syncDeploymentIncidents(
          conn.user_id,
          conn.id,
          providerKey,
          failedDeploys
        );

        return newCount > 0 ? { userId: conn.user_id, providerKey, newCount } : null;
      } catch (connErr: any) {
        console.warn(`[Poller] Failed to poll connection ${conn.id}:`, connErr.message);
        return null;
      }
    });

    const withNewIncidents = outcomes.filter((o): o is PollOutcome => o !== null);
    const totalSynced = withNewIncidents.reduce((sum, o) => sum + o.newCount, 0);

    if (withNewIncidents.length > 0) {
      // Batch-fetch all needed profiles in a single query instead of one
      // Supabase call per connection with new incidents.
      const uniqueUserIds = [...new Set(withNewIncidents.map((o) => o.userId))];
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email')
        .in('id', uniqueUserIds);

      const emailByUserId = new Map<string, string>((profiles || []).map((p: any) => [String(p.id), String(p.email)]));

      for (const outcome of withNewIncidents) {
        const userEmail = emailByUserId.get(outcome.userId) || 'system@servx.dev';
        auditEmitter.log(
          userEmail,
          'incident',
          `🔍 Poller detected ${outcome.newCount} new deployment failure(s) on ${outcome.providerKey}`
        );
      }
    }

    console.log(`[Poller] Reconciliation complete. ${totalSynced} new incident(s) synced.`);
  } catch (err: any) {
    console.error('[Poller] Critical polling error:', err.message);
  }
}

/**
 * Starts the background incident reconciliation poller.
 */
export function startIncidentPoller(): void {
  if (pollTimer) {
    console.warn('[Poller] Already running, skipping duplicate start.');
    return;
  }

  console.log(`[Poller] ✅ Incident reconciliation poller started (interval: ${POLL_INTERVAL_MS / 1000}s)`);

  // Run immediately on boot, then every POLL_INTERVAL_MS
  pollAllConnections().catch(err => {
    console.error('[Poller] Initial sweep failed:', err.message);
  });

  pollTimer = setInterval(() => {
    pollAllConnections().catch(err => {
      console.error('[Poller] Scheduled sweep failed:', err.message);
    });
  }, POLL_INTERVAL_MS);
}

/**
 * Stops the background poller (for graceful shutdown).
 */
export function stopIncidentPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('[Poller] Stopped.');
  }
}
