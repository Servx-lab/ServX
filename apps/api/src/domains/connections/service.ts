import axios from 'axios';

import { encrypt, decrypt } from '@servx/crypto';
import { HOSTING_PROVIDERS } from '@servx/config';
import type { HostingProviderKey } from '@servx/config';
import type {
  ConnectionResponse,
  ConnectionListItem,
  HostingStatusResponse,
  HostingUser,
  HostingService,
  HostingDeployment,
  UserConnectionProvider,
  HostingEnvVariable,
} from '@servx/types';
import { NotFoundError, ValidationError } from '@servx/errors';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
export { supabaseAdmin };

function getVaultTable(provider: string): 'db_vault' | 'hosting_vault' {
  const hostingDbNames = Object.values(HOSTING_PROVIDERS).map(p => p.dbName);
  return hostingDbNames.includes(provider) ? 'hosting_vault' : 'db_vault';
}

// ─── Generic connections ──────────────────────────────────────────────────────

export async function saveConnection(
  ownerUid: string,
  name: string,
  provider: UserConnectionProvider,
  config: Record<string, unknown>
): Promise<ConnectionResponse> {
  const table = getVaultTable(provider);
  const configString = JSON.stringify(config);
  const encrypted = encrypt(configString);

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert({
      name,
      user_id: ownerUid,
      provider: provider,
      encrypted_config: encrypted.content,
      iv: encrypted.iv,
    })
    .select()
    .single();

  if (error || !data) throw error || new Error('Failed to insert connection');

  const connectionData = data as any;

  return {
    message: 'Connection saved successfully',
    connection: {
      _id: connectionData.id,
      name: connectionData.name,
      provider: connectionData.provider as UserConnectionProvider,
      createdAt: connectionData.created_at,
    },
  };
}

export async function getUserConnections(ownerUid: string): Promise<ConnectionListItem[]> {
  const [dbRes, hostingRes] = await Promise.all([
    supabaseAdmin.from('db_vault').select('id, name, provider, created_at, status').eq('user_id', ownerUid),
    supabaseAdmin.from('hosting_vault').select('id, name, provider, created_at').eq('user_id', ownerUid),
  ]);

  const dbConns: ConnectionListItem[] = (dbRes.data || []).map(d => ({
    _id: d.id,
    name: d.name,
    provider: d.provider as UserConnectionProvider,
    status: d.status,
    isActive: true,
    createdAt: d.created_at,
  }));

  const hostingConns: ConnectionListItem[] = (hostingRes.data || []).map(d => ({
    _id: d.id,
    name: d.name,
    provider: d.provider as UserConnectionProvider,
    isActive: true,
    createdAt: d.created_at,
  }));

  return [...dbConns, ...hostingConns];
}

export async function deleteConnection(id: string, ownerUid: string): Promise<void> {
  // Try both vaults
  const [{ error: dbError }, { error: hostingError }] = await Promise.all([
    supabaseAdmin.from('db_vault').delete().eq('id', id).eq('user_id', ownerUid),
    supabaseAdmin.from('hosting_vault').delete().eq('id', id).eq('user_id', ownerUid),
  ]);

  if (dbError && hostingError) {
    throw new NotFoundError('Connection not found or already deleted');
  }
}

// ─── Hosting providers ────────────────────────────────────────────────────────

export async function getHostingProviderStatus(
  ownerUid: string,
  providerKey: HostingProviderKey
): Promise<HostingStatusResponse> {
  const providerInfo = HOSTING_PROVIDERS[providerKey];

  const { data: connection, error } = await supabaseAdmin
    .from('hosting_vault')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('provider', providerInfo.dbName)
    .single();

  if (!connection || error) {
    return { connected: false };
  }

  let token: string;
  try {
    const decrypted = decrypt({ iv: connection.iv, content: connection.encrypted_config });
    const parsed = JSON.parse(decrypted) as { token?: string; apiKey?: string };
    token = (parsed.token ?? parsed.apiKey) as string;
  } catch {
    return {
      connected: true,
      connectionId: connection.id,
      createdAt: connection.created_at,
      services: [],
      deployments: [],
      error: 'Failed to decrypt token',
    };
  }

  let services: HostingService[] = [];
  let deployments: HostingDeployment[] = [];
  let user: HostingUser | null = null;

  try {
    if (providerKey === 'vercel') {
      ({ user, services, deployments } = await fetchVercel(token));
    } else if (providerKey === 'render') {
      ({ user, services, deployments } = await fetchRender(token));
    } else if (providerKey === 'railway') {
      ({ user, services } = await fetchRailway(token));
    } else if (providerKey === 'digitalocean') {
      ({ user, services } = await fetchDigitalOcean(token));
    } else if (providerKey === 'fly') {
      ({ user, services } = await fetchFly(token));
    }
  } catch (apiErr) {
    console.error(`${providerInfo.label} API fetch error:`, (apiErr as Error).message);
  }

  const conn = connection as any;

  return {
    connected: true,
    connectionId: conn.id,
    createdAt: conn.created_at,
    user,
    services,
    deployments,
  };
}

export async function saveHostingToken(
  ownerUid: string,
  providerKey: HostingProviderKey,
  name: string,
  token: string,
  extras: { edgeConfigId?: string } = {}
): Promise<ConnectionResponse> {
  const providerInfo = HOSTING_PROVIDERS[providerKey];

  const config: Record<string, unknown> = { token };
  if (providerKey === 'vercel' && extras.edgeConfigId) {
    config.edgeConfigId = extras.edgeConfigId;
  }

  const encrypted = encrypt(JSON.stringify(config));

  const { data, error } = await supabaseAdmin
    .from('hosting_vault')
    .upsert({
      user_id: ownerUid,
      provider: providerInfo.dbName,
      encrypted_config: encrypted.content,
      iv: encrypted.iv,
      name: name,
    })
    .select()
    .single();

  if (error || !data) throw error || new Error('Failed to insert hosting connection');
  const connData = data as any;

  return {
    message: `${providerInfo.label} connection saved successfully`,
    connection: {
      _id: connData.id,
      name: connData.name,
      provider: providerInfo.dbName as UserConnectionProvider,
      createdAt: connData.created_at,
    },
  };
}

// ─── Per-provider fetch helpers ───────────────────────────────────────────────

async function fetchVercel(token: string): Promise<{
  user: HostingUser | null;
  services: HostingService[];
  deployments: HostingDeployment[];
}> {
  const headers = { Authorization: `Bearer ${token}` };
  const [userRes, projRes, deplRes] = await Promise.all([
    axios.get('https://api.vercel.com/v2/user', { headers }).catch(() => null),
    axios.get('https://api.vercel.com/v9/projects?limit=20', { headers }).catch(() => null),
    axios.get('https://api.vercel.com/v6/deployments?limit=15', { headers }).catch(() => null),
  ]);

  let user: HostingUser | null = null;
  if (userRes?.data?.user) {
    user = {
      username: userRes.data.user.username,
      name: userRes.data.user.name,
      email: userRes.data.user.email,
      avatar: userRes.data.user.avatar,
    };
  }

  const services: HostingService[] = projRes?.data?.projects
    ? projRes.data.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.framework || 'project',
        status: p.latestDeployments?.[0]?.readyState || 'unknown',
        url: p.alias?.[0] ? `https://${p.alias[0]}` : null,
        updatedAt: p.updatedAt,
      }))
    : [];

  const deployments: HostingDeployment[] = deplRes?.data?.deployments
    ? deplRes.data.deployments.map((d: any) => ({
        id: d.uid,
        name: d.name,
        url: d.url ? `https://${d.url}` : null,
        state: d.state || d.readyState,
        created: d.created || d.createdAt,
        commit: d.meta?.githubCommitMessage || null,
        branch: d.meta?.githubCommitRef || null,
      }))
    : [];

  return { user, services, deployments };
}

async function fetchRender(token: string): Promise<{
  user: HostingUser | null;
  services: HostingService[];
  deployments: HostingDeployment[];
}> {
  const headers = { Authorization: `Bearer ${token}` };
  const [svcRes, deplData] = await Promise.all([
    axios.get('https://api.render.com/v1/services?limit=20', { headers }).catch(() => null),
    axios
      .get('https://api.render.com/v1/services?limit=5', { headers })
      .then(async (svcList: any) => {
        if (!svcList?.data?.length) return [];
        const allDeploys = await Promise.all(
          svcList.data.slice(0, 5).map((s: any) =>
            axios
              .get(`https://api.render.com/v1/services/${s.service.id}/deploys?limit=3`, { headers })
              .catch(() => ({ data: [] }))
          )
        );
        return allDeploys.flatMap((r: any, i: number) =>
          (r.data || []).map((d: any) => ({ ...d, serviceName: svcList.data[i].service.name }))
        );
      })
      .catch(() => []),
  ]);

  let user: HostingUser | null = null;
  const services: HostingService[] = svcRes?.data
    ? svcRes.data.map((s: any) => ({
        id: s.service.id,
        name: s.service.name,
        type: s.service.type || 'web_service',
        status: s.service.suspended === 'suspended' ? 'suspended' : 'active',
        url: s.service.serviceDetails?.url || null,
        updatedAt: new Date(s.service.updatedAt).getTime(),
      }))
    : [];

  if (svcRes?.data?.[0]?.service?.ownerId) {
    user = { username: svcRes.data[0].service.ownerId, name: '', email: '' };
  }

  const deployments: HostingDeployment[] = Array.isArray(deplData)
    ? deplData.map((d: any) => ({
        id: d.deploy?.id || d.id,
        name: d.serviceName || '',
        url: null,
        state: d.deploy?.status || 'unknown',
        created: new Date(d.deploy?.createdAt || d.deploy?.finishedAt || Date.now()).getTime(),
        commit: d.deploy?.commit?.message || null,
        branch: null,
      }))
    : [];

  return { user, services, deployments };
}

async function fetchRailway(token: string): Promise<{
  user: HostingUser | null;
  services: HostingService[];
}> {
  const gql = `{ me { name email } projects(first: 20) { edges { node { id name services { edges { node { id name } } } updatedAt } } } }`;
  const res = await axios
    .post(
      'https://backboard.railway.app/graphql/v2',
      { query: gql },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )
    .catch(() => null);

  let user: HostingUser | null = null;
  if (res?.data?.data?.me) {
    user = { username: res.data.data.me.name, name: res.data.data.me.name, email: res.data.data.me.email || '' };
  }

  const services: HostingService[] = res?.data?.data?.projects?.edges
    ? res.data.data.projects.edges.map((e: any) => ({
        id: e.node.id,
        name: e.node.name,
        type: 'project',
        status: 'active',
        url: null,
        updatedAt: new Date(e.node.updatedAt).getTime(),
      }))
    : [];

  return { user, services };
}

async function fetchDigitalOcean(token: string): Promise<{
  user: HostingUser | null;
  services: HostingService[];
}> {
  const headers = { Authorization: `Bearer ${token}` };
  const [acctRes, appRes] = await Promise.all([
    axios.get('https://api.digitalocean.com/v2/account', { headers }).catch(() => null),
    axios.get('https://api.digitalocean.com/v2/apps?per_page=20', { headers }).catch(() => null),
  ]);

  let user: HostingUser | null = null;
  if (acctRes?.data?.account) {
    user = { username: acctRes.data.account.email, name: '', email: acctRes.data.account.email };
  }

  const services: HostingService[] = appRes?.data?.apps
    ? appRes.data.apps.map((a: any) => ({
        id: a.id,
        name: a.spec?.name || a.id,
        type: 'app',
        status: a.active_deployment?.phase || 'unknown',
        url: a.live_url || null,
        updatedAt: new Date(a.updated_at).getTime(),
      }))
    : [];

  return { user, services };
}

async function fetchFly(token: string): Promise<{
  user: HostingUser | null;
  services: HostingService[];
}> {
  const gql = `{ viewer { name email } apps(first: 20) { nodes { id name status hostname } } }`;
  const res = await axios
    .post(
      'https://api.fly.io/graphql',
      { query: gql },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )
    .catch(() => null);

  let user: HostingUser | null = null;
  if (res?.data?.data?.viewer) {
    user = { username: res.data.data.viewer.name, name: res.data.data.viewer.name, email: res.data.data.viewer.email || '' };
  }

  const services: HostingService[] = res?.data?.data?.apps?.nodes
    ? res.data.data.apps.nodes.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: 'app',
        status: a.status || 'unknown',
        url: a.hostname ? `https://${a.hostname}` : null,
        updatedAt: Date.now(),
      }))
    : [];

  return { user, services };
}

// ─── Hosting environment variables (Vercel / Render) ───────────────────────────

function formatVercelEnvTarget(target: unknown): string | undefined {
  if (target == null) return undefined;
  if (Array.isArray(target)) return target.join(', ');
  return String(target);
}

async function fetchVercelProjectEnvVars(token: string, projectId: string): Promise<HostingEnvVariable[]> {
  const headers = { Authorization: `Bearer ${token}` };
  let teamId: string | undefined;
  try {
    const projRes = await axios.get(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`, {
      headers,
    });
    teamId = projRes.data?.teamId ?? projRes.data?.team?.id;
  } catch {
    /* hobby / name lookup may differ; env call may still succeed */
  }

  const collected: unknown[] = [];
  let until: string | number | undefined;
  let resolvedTeamId = teamId;

  for (let page = 0; page < 25; page++) {
    const params: Record<string, string | number | undefined> = { decrypt: 'true' };
    if (resolvedTeamId) params.teamId = resolvedTeamId;
    if (until != null) params.until = until;

    let res;
    try {
      res = await axios.get(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env`, {
        headers,
        params,
      });
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number } };
      if ((ax.response?.status === 400 || ax.response?.status === 404) && !resolvedTeamId) {
        const projRes = await axios
          .get(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`, { headers })
          .catch(() => null);
        resolvedTeamId = projRes?.data?.teamId ?? projRes?.data?.team?.id;
        if (resolvedTeamId) {
          const retryParams: Record<string, string | number | undefined> = {
            decrypt: 'true',
            teamId: resolvedTeamId,
          };
          if (until != null) retryParams.until = until;
          res = await axios.get(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env`, {
            headers,
            params: retryParams,
          });
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const envs = (res as { data?: { envs?: unknown[]; pagination?: { next?: number } } }).data?.envs ?? [];
    collected.push(...envs);
    const next = (res as { data?: { pagination?: { next?: number } } }).data?.pagination?.next;
    if (next == null) break;
    until = next;
  }

  return collected.map((raw: unknown) => {
    const e = raw as { key?: string; value?: unknown; target?: unknown };
    return {
      key: e.key ?? '',
      value: e.value != null ? String(e.value) : '',
      target: formatVercelEnvTarget(e.target),
    };
  });
}

async function fetchRenderServiceEnvVars(token: string, serviceId: string): Promise<HostingEnvVariable[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const collected: unknown[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 25; page++) {
    const res = await axios.get(`https://api.render.com/v1/services/${encodeURIComponent(serviceId)}/env-vars`, {
      headers,
      params: cursor ? { cursor } : {},
    });
    const body = res.data as { envVars?: unknown[]; cursor?: string } | unknown[];
    const chunk = Array.isArray(body) ? body : body?.envVars ?? [];
    collected.push(...chunk);
    cursor = Array.isArray(body) ? undefined : body?.cursor;
    if (!cursor) break;
  }

  return collected.map((raw: unknown) => {
    const e = raw as { key?: string; value?: unknown; envVar?: { key?: string; value?: unknown } };
    const key = e.key ?? e.envVar?.key ?? '';
    const val = e.value ?? e.envVar?.value;
    return {
      key,
      value: val != null ? String(val) : '',
    };
  });
}

/**
 * Lists environment variables for a Vercel project or Render service using the user's stored API token
 * (decrypted server-side; never logged).
 */
export async function getHostingEnvironmentVariables(
  ownerUid: string,
  providerKey: string,
  serviceId: string
): Promise<HostingEnvVariable[]> {
  const pk = providerKey.toLowerCase();
  if (pk !== 'vercel' && pk !== 'render') {
    throw new ValidationError('Environment variables are only available for Vercel and Render.');
  }
  const trimmedId = (serviceId || '').trim();
  if (!trimmedId) {
    throw new ValidationError('Service or project ID is required.');
  }

  const creds = await getHostingCredentials(ownerUid, pk as 'vercel' | 'render');
  if (!creds?.token) {
    const label = HOSTING_PROVIDERS[pk].label;
    throw new ValidationError(`Connect your ${label} account in Hosting settings to load environment variables.`);
  }

  try {
    if (pk === 'vercel') {
      return await fetchVercelProjectEnvVars(creds.token, trimmedId);
    }
    return await fetchRenderServiceEnvVars(creds.token, trimmedId);
  } catch (err: unknown) {
    const ax = err as {
      response?: { data?: { error?: { message?: string }; message?: string }; status?: number };
      message?: string;
    };
    const apiMsg =
      ax.response?.data?.error?.message ||
      (typeof ax.response?.data?.message === 'string' ? ax.response.data.message : undefined) ||
      ax.message;
    const status = ax.response?.status;
    throw new ValidationError(
      `Failed to load environment variables from ${HOSTING_PROVIDERS[pk].label}${apiMsg ? `: ${apiMsg}` : ''}${status ? ` (HTTP ${status})` : ''}`
    );
  }
}

export async function getHostingCredentials(
  ownerUid: string,
  provider: 'vercel' | 'render'
): Promise<{ token: string; edgeConfigId?: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('hosting_vault')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('provider', provider)
    .single();

  if (!data || error) return null;

  try {
    const decrypted = decrypt({ iv: data.iv, content: data.encrypted_config });
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}
