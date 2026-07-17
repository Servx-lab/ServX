import axios from 'axios';


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
import { cacheGet, cacheSet, cacheDel } from '../../core/services/redisCache';
import { encrypt, decrypt } from '@servx/crypto';
import cloudinary from '../../config/cloudinary';

export { supabaseAdmin };

const HOSTING_CACHE_TTL = 300; // 5 minutes
const AXIOS_TIMEOUT = 5000; // 5 seconds
const hostingStatusKey = (uid: string, provider: string, connectionId?: string) => 
  connectionId ? `hosting:status:${uid}:${provider}:${connectionId}` : `hosting:status:${uid}:${provider}`;

// Deduplication Map to prevent "Cache Stampede"
const pendingRequests = new Map<string, Promise<HostingStatusResponse>>();

function getVaultTable(provider: string): 'db_vault' | 'hosting_vault' {
  const hostingDbNames = Object.values(HOSTING_PROVIDERS).map(p => p.dbName);
  return hostingDbNames.includes(provider) ? 'hosting_vault' : 'db_vault';
}

/**
 * Ensures a entry exists in user_profiles before inserting dependent rows.
 * This prevents foreign key constraint violations (23503).
 */
async function ensureUserProfile(uid: string, email: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('id', uid)
    .single();

  if (!profile) {
    console.log(`[Connections] Creating fallback profile for UID: ${uid}`);
    const { error } = await supabaseAdmin.from('user_profiles').upsert({
      id: uid,
      email: email,
      display_name: email.split('@')[0],
      avatar_url: '',
    });
    if (error) throw error;
  }
}

// ─── Generic connections ──────────────────────────────────────────────────────

export async function saveConnection(
  ownerUid: string,
  email: string,
  name: string,
  provider: UserConnectionProvider,
  config: Record<string, unknown>
): Promise<ConnectionResponse> {
  await ensureUserProfile(ownerUid, email);
  const table = getVaultTable(provider);
  const configString = JSON.stringify(config);
  
  // Re-enabling manual encryption for all vault entries
  const { iv, content: encryptedConfig } = encrypt(configString);

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert({
      name,
      user_id: ownerUid,
      provider: provider,
      encrypted_config: encryptedConfig,
      iv: iv,
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
    supabaseAdmin.from('hosting_vault').select('*').eq('user_id', ownerUid),
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
    alias: d.alias,
    provider: d.provider as UserConnectionProvider,
    isActive: true,
    createdAt: d.created_at,
    avatarUrl: d.avatar_url,
  }));

  return [...dbConns, ...hostingConns];
}

export async function updateConnectionAlias(id: string, ownerUid: string, alias: string): Promise<void> {
  if (!alias || alias.trim() === '') {
      throw new ValidationError('Alias cannot be empty');
  }

  // Assuming alias is currently only on hosting_vault
  const { error } = await supabaseAdmin
    .from('hosting_vault')
    .update({ alias: alias.trim() })
    .eq('id', id)
    .eq('user_id', ownerUid);
    
  if (error) {
    if (error.code === '23505') { // Unique constraint violation
        throw new ValidationError('An API key with this alias already exists for this provider.');
    }
    throw new Error('Failed to update alias');
  }
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

  // Attempt to delete any associated avatar from Cloudinary
  try {
    const publicId = `servx/avatars/${ownerUid}/${id}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err: any) {
    console.warn('[Cloudinary Delete Error] Could not delete avatar for', id, err.message);
  }
}

export async function uploadAvatar(
  id: string,
  ownerUid: string,
  fileBuffer: Buffer
): Promise<{ avatarUrl: string }> {
  // 1. Fetch existing connection to check for an old avatar
  const { data: connection } = await supabaseAdmin
    .from('hosting_vault')
    .select('avatar_url')
    .eq('id', id)
    .eq('user_id', ownerUid)
    .single();

  // 2. Explicitly destroy the old avatar to prevent storage leaks from format changes
  if (connection?.avatar_url) {
    try {
      // The publicId pattern we use is: servx/avatars/{ownerUid}/{id}
      const publicId = `servx/avatars/${ownerUid}/${id}`;
      await cloudinary.uploader.destroy(publicId);
      console.log(`[Cloudinary] Successfully destroyed old avatar: ${publicId}`);
    } catch (err: any) {
      console.warn('[Cloudinary] Failed to delete previous avatar during replacement:', err.message);
    }
  }

  // 3. We stream the new buffer to Cloudinary
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `servx/avatars/${ownerUid}`,
        public_id: id,
        overwrite: true,
        resource_type: 'image',
      },
      async (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]', error);
          return reject(new Error('Failed to upload image'));
        }
        if (!result) {
          return reject(new Error('No result from Cloudinary'));
        }
        
        // Save URL to Supabase
        const avatarUrl = result.secure_url;
        const { error: dbError } = await supabaseAdmin
          .from('hosting_vault')
          .update({ avatar_url: avatarUrl })
          .eq('id', id)
          .eq('user_id', ownerUid);

        if (dbError) {
          console.error('[Supabase Update Error]', dbError);
          return reject(new Error('Failed to update avatar in database'));
        }

        resolve({ avatarUrl });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

// ─── Hosting providers ────────────────────────────────────────────────────────

export async function getHostingProviderAccountsList(
  ownerUid: string,
  providerKey: HostingProviderKey
): Promise<any[]> {
  const providerInfo = HOSTING_PROVIDERS[providerKey];
  if (!providerInfo) return [];

  const { data: connections, error } = await supabaseAdmin
    .from('hosting_vault')
    .select('id, name, alias, created_at')
    .eq('user_id', ownerUid)
    .eq('provider', providerInfo.dbName)
    .order('created_at', { ascending: false });

  if (error || !connections) return [];
  
  return connections.map(c => ({
    connectionId: c.id,
    alias: c.alias || c.name || 'Default',
    createdAt: c.created_at
  }));
}

export async function getHostingProviderStatus(
  ownerUid: string,
  providerKey: HostingProviderKey,
  forceRefresh: boolean = false,
  connectionId?: string
): Promise<HostingStatusResponse> {
  const cacheKey = hostingStatusKey(ownerUid, providerKey, connectionId);
  
  // 0. Request Deduplication (Layer 0)
  // If a request for this user+provider+connection is already in-flight, return that promise.
  const existing = pendingRequests.get(cacheKey);
  if (existing && !forceRefresh) {
    console.log(`[Hosting] Joining pending request for ${providerKey}:${connectionId}`);
    return existing;
  }

  const promise = performHostingStatusFetch(ownerUid, providerKey, forceRefresh, connectionId);
  pendingRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

async function performHostingStatusFetch(
  ownerUid: string,
  providerKey: HostingProviderKey,
  forceRefresh: boolean = false,
  connectionId?: string
): Promise<HostingStatusResponse> {
  const cacheKey = hostingStatusKey(ownerUid, providerKey, connectionId);
  const providerInfo = HOSTING_PROVIDERS[providerKey];

  // 1. Try Cache First
  if (!forceRefresh) {
    try {
      const cached = await cacheGet<HostingStatusResponse>(cacheKey);
      if (cached) {
        console.log(`[Hosting] Cache Hit: ${providerKey}:${connectionId} for ${ownerUid}`);
        return cached;
      }
    } catch (err: any) {
      console.warn(`[Hosting] Cache check failed:`, err.message);
    }
  } else {
    try {
      await cacheDel(cacheKey);
      console.log(`[Hosting] Force Refresh: Cleared cache for ${providerKey}:${connectionId}`);
    } catch (err) {
      console.warn(`[Hosting] Force Refresh cache delete failed:`, err);
    }
  }

  // 2. Fetch connections from Supabase
  let query = supabaseAdmin
    .from('hosting_vault')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('provider', providerInfo.dbName);
    
  // Granular Fetch: If connectionId is provided, ONLY fetch that connection!
  if (connectionId) {
    query = query.eq('id', connectionId);
  } else {
    // If not provided, fallback to the latest one (or limit to a small number to prevent 429)
    query = query.limit(3);
  }

  const { data: connections, error } = await query.order('created_at', { ascending: false });

  if (!connections || connections.length === 0 || error) {
    return { connected: false };
  }

  const accounts = await Promise.all(
    connections.map(async (connection) => {
      let parsedConfig: any;
      let token: string;
      try {
        let rawConfig = connection.encrypted_config;
        if (connection.iv && connection.iv !== '') {
          rawConfig = decrypt({ iv: connection.iv, content: connection.encrypted_config });
        }
        parsedConfig = JSON.parse(rawConfig) as { token?: string; apiKey?: string; instanceUrl?: string };
        token = (parsedConfig.token ?? parsedConfig.apiKey) as string;
      } catch (err: any) {
        console.error('[Connections] Decryption failed:', err.message);
        return {
          connectionId: connection.id,
          alias: connection.alias || connection.name || 'Default',
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
        } else if (providerKey === 'coolify') {
          const instanceUrl = (connection.config as any)?.instanceUrl || parsedConfig?.instanceUrl;
          ({ user, services, deployments } = await fetchCoolify(instanceUrl, token));
        }
      } catch (apiErr: any) {
        console.error(`${providerInfo.label} API fetch error:`, apiErr.message);
        const status = apiErr.response?.status;
        let errorMsg = 'Failed to fetch data from provider';
        if (status === 401 || status === 403) {
            errorMsg = 'Invalid API Key. Please reconnect.';
        } else if (apiErr.message) {
            errorMsg = `API Error: ${apiErr.message}`;
        }
        return {
            connectionId: connection.id,
            alias: connection.alias || connection.name || 'Default',
            createdAt: connection.created_at,
            services: [],
            deployments: [],
            error: errorMsg,
        };
      }

      return {
        connectionId: connection.id,
        alias: connection.alias || connection.name || 'Default',
        createdAt: connection.created_at,
        user,
        services,
        deployments,
      };
    })
  );

  const result: HostingStatusResponse = {
    connected: true,
    accounts,
  };

  // 5. Update Cache (Updates RAM and Redis)
  await cacheSet(cacheKey, result, HOSTING_CACHE_TTL).catch(err => {
    console.warn(`[Hosting] Cache update failed:`, err.message);
  });

  console.log(`[Hosting] ${providerKey} status ready for ${ownerUid}.`);
  return result;
}


/**
 * Pre-fetches hosting statuses for all connected providers for a user
 * and stores them in Redis. This is intended to be called in the background
 * during the login/sync process.
 */
export async function prefetchHostingStatuses(ownerUid: string): Promise<void> {
  try {
    console.log(`[Hosting] Pre-fetching statuses for ${ownerUid}...`);
    
    // Get unique connected providers for this user
    const { data: connections } = await supabaseAdmin
      .from('hosting_vault')
      .select('provider')
      .eq('user_id', ownerUid);

    if (!connections || connections.length === 0) return;

    const uniqueProviders = [...new Set(connections.map(c => c.provider))];

    // For each provider, map the dbName back to the HostingProviderKey and fetch
    for (const dbName of uniqueProviders) {
      const providerKey = (Object.keys(HOSTING_PROVIDERS) as HostingProviderKey[]).find(
        key => HOSTING_PROVIDERS[key].dbName === dbName
      );

      if (providerKey) {
        // This will call getHostingProviderStatus which will fetch and cache
        await getHostingProviderStatus(ownerUid, providerKey).catch(err => {
          console.error(`[Hosting] Pre-fetch failed for ${providerKey}:`, err.message);
        });
      }
    }
    
    console.log(`[Hosting] Pre-fetch complete for ${ownerUid}.`);
  } catch (err: any) {
    console.error(`[Hosting] Global pre-fetch failed for ${ownerUid}:`, err.message);
  }
}

export async function saveHostingToken(
  ownerUid: string,
  email: string,
  providerKey: HostingProviderKey,
  name: string,
  alias: string,
  token: string,
  extras: { edgeConfigId?: string } = {}
): Promise<ConnectionResponse> {
  await ensureUserProfile(ownerUid, email);
  const providerInfo = HOSTING_PROVIDERS[providerKey];

  const config: Record<string, unknown> = { token };
  if (providerKey === 'vercel' && extras.edgeConfigId) {
    config.edgeConfigId = extras.edgeConfigId;
  }
  if (providerKey === 'coolify' && (extras as any).instanceUrl) {
    config.instanceUrl = (extras as any).instanceUrl;
  }

  // 1. Validate the token before saving
  try {
    if (providerKey === 'vercel') {
      await fetchVercel(token);
    } else if (providerKey === 'render') {
      await fetchRender(token);
    } else if (providerKey === 'railway') {
      await fetchRailway(token);
    } else if (providerKey === 'digitalocean') {
      await fetchDigitalOcean(token);
    } else if (providerKey === 'coolify') {
      await fetchCoolify(config.instanceUrl as string, token);
    }
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
        throw new ValidationError('Invalid API Key provided for ' + providerInfo.label);
    }
    // If it's a 500 or timeout, we might still want to fail or just allow it. For now, if it's explicitly auth error, we reject it.
  }

  // Re-enabling encryption for stored credentials
  const { iv, content } = encrypt(JSON.stringify(config));

  const { data: connData, error: dbError } = await supabaseAdmin
    .from('hosting_vault')
    .insert([{
      user_id: ownerUid,
      name,
      alias,
      provider: providerInfo.dbName,
      encrypted_config: content,
      iv: iv
    }])
    .select()
    .single();

  if (dbError || !connData) throw dbError || new Error('Failed to insert hosting connection');

  // Populating cache immediately in the background so the UI is instant
  getHostingProviderStatus(ownerUid, providerKey).catch(e => {
    console.error('[Hosting] Immediate cache population failed:', e.message);
  });

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

export async function deleteHostingToken(
  ownerUid: string,
  providerKey: string
): Promise<void> {
  const providerInfo = HOSTING_PROVIDERS[providerKey];
  if (!providerInfo) {
    throw new ValidationError(`Unknown provider: ${providerKey}`);
  }

  // First fetch the connections so we can delete their avatars
  const { data: connectionsToDel } = await supabaseAdmin
    .from('hosting_vault')
    .select('id')
    .eq('user_id', ownerUid)
    .eq('provider', providerInfo.dbName);

  if (connectionsToDel && connectionsToDel.length > 0) {
    for (const c of connectionsToDel) {
      try {
        await cloudinary.uploader.destroy(`servx/avatars/${ownerUid}/${c.id}`);
      } catch (err: any) {
        console.warn('[Cloudinary Bulk Delete Error]', c.id, err.message);
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('hosting_vault')
    .delete()
    .eq('user_id', ownerUid)
    .eq('provider', providerInfo.dbName);

  if (error) {
    throw error;
  }
}

async function fetchCoolify(instanceUrl: string | undefined, token: string): Promise<{
  user: HostingUser | null;
  services: HostingService[];
  deployments: HostingDeployment[];
}> {
  if (!instanceUrl) {
    throw new Error('Coolify instance URL is required.');
  }

  const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Fetch Projects (which contain applications/services)
  const [projRes, serverRes] = await Promise.all([
    axios.get(`${baseUrl}/api/v1/projects`, { headers, timeout: AXIOS_TIMEOUT }).catch(() => null),
    axios.get(`${baseUrl}/api/v1/servers`, { headers, timeout: AXIOS_TIMEOUT }).catch(() => null),
  ]);

  const services: HostingService[] = [];
  const deployments: HostingDeployment[] = [];

  if (projRes?.data) {
    // Coolify projects have resources (applications, databases, etc.)
    projRes.data.forEach((project: any) => {
      if (project.applications) {
        project.applications.forEach((app: any) => {
          services.push({
            id: app.uuid,
            name: app.name,
            type: app.build_pack || 'application',
            status: app.status || 'unknown',
            url: app.fqdn || null,
            updatedAt: new Date(app.updated_at).getTime(),
          });
        });
      }
    });
  }

  let user: HostingUser | null = null;
  if (serverRes?.data?.[0]) {
    // We can use the first server's metadata as a hint for the "user" context
    user = {
      username: 'Coolify Instance',
      name: baseUrl,
      email: '',
    };
  }

  return { user, services, deployments };
}

// ─── Per-provider fetch helpers ───────────────────────────────────────────────

async function fetchVercel(token: string): Promise<{
  user: HostingUser | null;
  services: HostingService[];
  deployments: HostingDeployment[];
}> {
  const headers = { Authorization: `Bearer ${token}` };
  const [userRes, projRes, deplRes] = await Promise.all([
    axios.get('https://api.vercel.com/v2/user', { headers, timeout: AXIOS_TIMEOUT }),
    axios.get('https://api.vercel.com/v9/projects?limit=20', { headers, timeout: AXIOS_TIMEOUT }).catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) throw err;
        return null;
    }),
    axios.get('https://api.vercel.com/v6/deployments?limit=15', { headers, timeout: AXIOS_TIMEOUT }).catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) throw err;
        return null;
    }),
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
    axios.get('https://api.render.com/v1/services?limit=20', { headers, timeout: AXIOS_TIMEOUT }),
    axios
      .get('https://api.render.com/v1/services?limit=5', { headers, timeout: AXIOS_TIMEOUT })
      .then(async (svcList: any) => {
        if (!svcList?.data?.length) return [];
        const allDeploys = await Promise.all(
          svcList.data.slice(0, 5).map((s: any) =>
            axios
              .get(`https://api.render.com/v1/services/${s.service.id}/deploys?limit=3`, { headers, timeout: AXIOS_TIMEOUT })
              .catch(() => ({ data: [] }))
          )
        );
        return allDeploys.flatMap((r: any, i: number) =>
          (r.data || []).map((d: any) => ({ ...d, serviceName: svcList.data[i].service.name }))
        );
      })
      .catch((err) => {
          // If it's a 401/403, bubble it up so the main catch block handles it
          if (err.response?.status === 401 || err.response?.status === 403) throw err;
          return [];
      }),
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
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: AXIOS_TIMEOUT }
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
    axios.get('https://api.digitalocean.com/v2/account', { headers, timeout: AXIOS_TIMEOUT }).catch(() => null),
    axios.get('https://api.digitalocean.com/v2/apps?per_page=20', { headers, timeout: AXIOS_TIMEOUT }).catch(() => null),
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
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: AXIOS_TIMEOUT }
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
  const token = creds?.token || (creds as any)?.apiKey;

  if (!token) {
    const label = HOSTING_PROVIDERS[pk].label;
    throw new ValidationError(`Connect your ${label} account in Hosting settings to load environment variables.`);
  }

  try {
    if (pk === 'vercel') {
      return await fetchVercelProjectEnvVars(token, trimmedId);
    }
    return await fetchRenderServiceEnvVars(token, trimmedId);
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
  provider: 'vercel' | 'render',
  connectionId?: string
): Promise<{ token: string; edgeConfigId?: string } | null> {
  const providerInfo = HOSTING_PROVIDERS[provider as keyof typeof HOSTING_PROVIDERS];
  if (!providerInfo) return null;

  let query = supabaseAdmin
    .from('hosting_vault')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('provider', providerInfo.dbName);

  if (connectionId) {
    query = query.eq('id', connectionId);
  }

  // Use limit(1).single() to prevent multiple rows crashing the backend if connectionId is missing
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).single();

  if (!data || error) return null;

  try {
    let rawConfig = data.encrypted_config;
    if (data.iv && data.iv !== '') {
      rawConfig = decrypt({ iv: data.iv, content: data.encrypted_config });
    }
    const parsed = JSON.parse(rawConfig);
    return {
        ...parsed,
        token: parsed.token || parsed.apiKey // Normalize token field
    };
  } catch {
    return null;
  }
}

export async function getHostingLogs(
  ownerUid: string,
  providerKey: string,
  serviceId: string,
  connectionId?: string
): Promise<string[]> {
  const pk = providerKey.toLowerCase();
  const trimmedId = (serviceId || '').trim();
  if (!trimmedId) {
    throw new ValidationError('Service ID is required.');
  }

  // We reuse getHostingCredentials which works for vercel/render
  const creds = await getHostingCredentials(ownerUid, pk as 'vercel' | 'render', connectionId);
  const token = creds?.token || (creds as any)?.apiKey;

  if (!token) {
    throw new ValidationError(`Connect your account to view logs.`);
  }

  try {
    if (pk === 'render') {
      // Step 1: Fetch service metadata to retrieve the strict ownerId required by Render's Log API
      const serviceRes = await axios.get(`https://api.render.com/v1/services/${encodeURIComponent(trimmedId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: AXIOS_TIMEOUT
      });
      
      const type = serviceRes.data?.type;
      if (type === 'static_site') {
        return ['[system] Connection established. However, Static Sites do not emit runtime logs.'];
      }
      
      const ownerId = serviceRes.data?.ownerId || serviceRes.data?.owner?.id;
      if (!ownerId) {
        throw new Error('Could not determine Workspace/Owner ID for this Render service.');
      }

      // Step 2: Fetch logs using both resource ID and ownerId
      // Deep fetch: Expand Render's default 1-hour window to the last 7 days
      const startTimeISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const res = await axios.get(`https://api.render.com/v1/logs?resource=${encodeURIComponent(trimmedId)}&ownerId=${encodeURIComponent(ownerId)}&limit=100&startTime=${startTimeISO}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: AXIOS_TIMEOUT
      });
      
      const logsArray = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      
      if (logsArray.length === 0) {
        return ['[system] Connection established. No recent logs emitted by this service.'];
      }

      // Render returns newest logs first usually, we map and reverse for terminal
      const logsList = logsArray.map((entry: any) => {
        const timestamp = entry.log?.timestamp ? new Date(entry.log.timestamp).toLocaleTimeString([], { hour12: false }) : '';
        const text = entry.log?.text || '';
        return `[${timestamp}] ${text}`;
      });
      
      return logsList.reverse();
    }
    
    if (pk === 'vercel') {
      return [
        '[system] Real-time Vercel logs require a Log Drain configuration.',
        '[system] Please visit the Vercel Dashboard for live invocation logs.'
      ];
    }

    return [`[system] Live logs not supported via API for ${pk}.`];
  } catch (err: any) {
    console.error(`[Hosting Logs] Error fetching logs for ${pk}:`, err.message);
    return [`[error] Failed to fetch logs from ${pk}: ${err.message}`];
  }
}
