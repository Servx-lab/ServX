import { decrypt } from '@servx/crypto';
import { HOSTING_PROVIDERS } from '@servx/config';
import { ValidationError } from '@servx/errors';
import type { HostingCreds, Project } from '@servx/types';

import { supabaseAdmin } from '../../utils/supabaseAdmin';

export async function getHostingCredentials(
  ownerUid: string,
  provider: 'vercel' | 'render'
): Promise<HostingCreds | null> {
  const providerInfo = HOSTING_PROVIDERS[provider];
  if (!providerInfo) return null;

  const { data: connection, error } = await supabaseAdmin
    .from('hosting_vault')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('provider', providerInfo.dbName)
    .single();

  if (!connection || error) return null;

  try {
    const decrypted = decrypt({
      iv: connection.iv,
      content: connection.encrypted_config,
    });
    const parsed = JSON.parse(decrypted) as { token?: string; apiKey?: string; edgeConfigId?: string };
    const token = parsed.token || parsed.apiKey;
    return token ? { token, edgeConfigId: parsed.edgeConfigId } : null;
  } catch {
    return null;
  }
}

export async function getHostingProjects(ownerUid: string): Promise<Project[]> {
  const [vercelCreds, renderCreds] = await Promise.all([
    getHostingCredentials(ownerUid, 'vercel'),
    getHostingCredentials(ownerUid, 'render'),
  ]);

  const [vercelResult, renderResult] = await Promise.allSettled([
    vercelCreds?.token
      ? fetch('https://api.vercel.com/v9/projects', {
          headers: { Authorization: `Bearer ${vercelCreds.token}` },
        }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Vercel ${r.status}`))))
      : Promise.resolve({ projects: [] }),
    renderCreds?.token
      ? fetch('https://api.render.com/v1/services', {
          headers: { Authorization: `Bearer ${renderCreds.token}` },
        }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Render ${r.status}`))))
      : Promise.resolve([]),
  ]);

  const projects: Project[] = [];

  if (vercelResult.status === 'fulfilled') {
    const data = vercelResult.value as any;
    const vercelProjects = Array.isArray(data) ? data : data?.projects || [];
    vercelProjects.forEach((p: any) => {
      projects.push({
        id: p.id,
        name: p.name || 'Unnamed',
        provider: 'vercel',
        status: p.readyState || p.state || 'unknown',
        framework: p.framework || p.settings?.framework || 'unknown',
      });
    });
  } else {
    console.warn('[Operations] Vercel projects fetch failed:', (vercelResult.reason as Error)?.message);
  }

  if (renderResult.status === 'fulfilled') {
    const data = renderResult.value as any;
    const renderServices = Array.isArray(data) ? data : data?.services || [];
    renderServices.forEach((s: any) => {
      const svc = s.service || s;
      const suspended = svc.suspended === 'suspended' || s.suspended === 'suspended';
      projects.push({
        id: svc.id || s.id,
        name: svc.name || s.name || 'Unnamed',
        provider: 'render',
        status: suspended ? 'suspended' : 'active',
        framework: svc.serviceDetails?.runtime || svc.type || s.type || 'unknown',
      });
    });
  } else {
    console.warn('[Operations] Render services fetch failed:', (renderResult.reason as Error)?.message);
  }

  return projects;
}

export async function toggleVercelMaintenance(
  token: string,
  projectId: string,
  edgeConfigId: string | undefined,
  isEnabled: boolean
): Promise<void> {
  let effectiveEdgeConfigId = edgeConfigId;

  if (!effectiveEdgeConfigId) {
    const ecRes = await fetch('https://api.vercel.com/v1/edge-config', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!ecRes.ok) {
      throw new ValidationError(
        'Could not fetch Edge Configs. Add edgeConfigId to your Vercel connection config.'
      );
    }

    const ecList = (await ecRes.json()) as any;
    const configs = Array.isArray(ecList) ? ecList : ecList?.edgeConfigs || [];
    const match = configs.find((c: any) => c.purpose?.projectId === projectId) || configs[0];
    effectiveEdgeConfigId = match?.id;
  }

  if (!effectiveEdgeConfigId) {
    throw new ValidationError(
      'No Edge Config found. Create one in Vercel or add edgeConfigId to your connection.'
    );
  }

  const url = `https://api.vercel.com/v1/edge-config/${effectiveEdgeConfigId}/items`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ operation: 'upsert', key: 'maintenance_mode', value: isEnabled }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vercel API error: ${response.status} ${errText}`);
  }
}

export async function toggleRenderMaintenance(
  token: string,
  projectId: string,
  isEnabled: boolean
): Promise<void> {
  const action = isEnabled ? 'suspend' : 'resume';
  const url = `https://api.render.com/v1/services/${projectId}/${action}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Render API error: ${response.status} ${errText}`);
  }
}

export function logTask(uid: string, task: string, targetId: string): void {
  console.log(JSON.stringify({
    type: 'operations.task.execute',
    uid,
    task,
    targetId,
    ts: new Date().toISOString(),
  }));
}
