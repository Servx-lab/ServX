import axios from 'axios';

import { ConflictError, NotFoundError } from '@servx/errors';

import { Admin, AccessControl, User } from './model';
import type {
  AdminDoc,
  AdminRecord,
  AdminResource,
  DbResource,
  Permissions,
  RepoResource,
  ServerResource,
} from './types';

import { decrypt } from '@servx/crypto';
import { supabaseAdmin } from '../../utils/supabaseAdmin';

const HOSTING_PROVIDERS = new Set(['Vercel', 'Render', 'Railway', 'DigitalOcean', 'Fly.io', 'AWS']);
const DATABASE_PROVIDERS = new Set([
  'Firebase',
  'MongoDB',
  'Supabase',
  'MySQL',
  'PostgreSQL',
  'AWS RDS',
  'Oracle',
  'Redis',
  'MariaDB',
]);

function defaultPermissions(): Permissions {
  return {
    repos: [],
    dbs: [],
    global: {
      isFullControl: false,
      canBanIPs: false,
      canViewDeviceUUIDs: false,
      canAccessHosting: false,
      canAccessGithub: false,
      canAccessDatabases: false,
    },
    granularAllow: null,
  };
}

export async function inviteUserAsAdmin(email: string, role: string): Promise<AdminRecord> {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;

  const userRecord = (users as any[]).find(u => u.email === email);

  if (!userRecord) {
    throw new NotFoundError('User must sign up first');
  }

  const id = userRecord.id;
  const existingAdmin = await (Admin as any).findOne({ id });
  if (existingAdmin) {
    throw new ConflictError('User is already an administrator');
  }

  const newAdmin = new (Admin as any)({
    id,
    email,
    role,
    addedAt: new Date(),
  });
  await newAdmin.save();

  return {
    id,
    email,
    role,
    addedAt: newAdmin.addedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function listAdmins(): Promise<AdminRecord[]> {
  const admins = await (Admin as any).find().sort({ addedAt: -1 });
  const userIds = admins.map((a: any) => a.id);

  // 1. Fetch from MongoDB (Secondary/Legacy source)
  const mongoUsers = await (User as any).find({ id: { $in: userIds } });
  const mongoMap = new Map(mongoUsers.map((u: any) => [u.id, u]));

  // 2. Fetch from Supabase (Primary source for profiles)
  const { data: supabaseProfiles } = await supabaseAdmin
    .from('user_profiles')
    .select('id, avatar_url')
    .in('id', userIds);
  const supabaseMap = new Map((supabaseProfiles || []).map((p: any) => [p.id, p]));

  return admins.map((a: any) => {
    const mongoUser = mongoMap.get(a.id) as any;
    const supabaseProfile = supabaseMap.get(a.id) as any;
    
    // Prefer Supabase avatar, fall back to MongoDB
    const avatarUrl = supabaseProfile?.avatar_url || mongoUser?.avatarUrl;

    return {
      id: a.id,
      email: a.email,
      role: a.role,
      avatarUrl,
      addedAt: a.addedAt?.toISOString?.() ?? String(a.addedAt),
    };
  });
}

export async function revokeAdmin(id: string): Promise<void> {
  const deleted = await (Admin as any).findOneAndDelete({ id });
  if (!deleted) {
    throw new NotFoundError('Admin not found');
  }
}

export async function getAdminPermissions(ownerId: string, userId: string): Promise<Permissions> {
  const { data, error } = await supabaseAdmin
    .from('team_access_control')
    .select('permissions')
    .eq('owner_id', ownerId)
    .eq('user_id', userId)
    .single();

  if (error || !data?.permissions) {
    // Fallback to MongoDB if Supabase record not found yet (for migration)
    const found = await (AccessControl as any).findOne({ ownerId, userId });
    if (found?.permissions) {
      return {
        ...(typeof found.toObject === 'function' ? found.toObject().permissions : found.permissions),
      } as Permissions;
    }
    return defaultPermissions();
  }

  const p = data.permissions as Permissions;
  if (p.granularAllow === undefined) {
    p.granularAllow = null;
  }
  return p;
}

export async function updateAdminPermissions(
  ownerId: string,
  userId: string,
  permissions: Permissions
): Promise<Permissions> {
  // 1. Update Supabase (Primary Source of Truth)
  const { error } = await supabaseAdmin
    .from('team_access_control')
    .upsert({
      owner_id: ownerId,
      user_id: userId,
      permissions: permissions,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id,user_id' });

  if (error) {
    console.error('[Admin] Failed to update permissions in Supabase:', error.message);
    // Continue to MongoDB for backward compatibility during transition
  }

  // 2. Also update MongoDB (Secondary/Backup for now)
  await (AccessControl as any).findOneAndUpdate(
    { ownerId, userId },
    { permissions },
    { upsert: true, new: true }
  );

  return permissions;
}

export async function getAdminResources(
  adminRecord: AdminDoc
): Promise<AdminResource> {
  // 1. Fetch DB and Hosting Connections from Vault
  const [dbRes, hostingRes] = await Promise.all([
    supabaseAdmin.from('db_vault').select('id, name, provider'),
    supabaseAdmin.from('hosting_vault').select('id, name, provider'),
  ]);

  const databases: DbResource[] = (dbRes.data || []).map(d => ({
    id: d.id,
    name: d.name,
    provider: d.provider,
  }));

  // 2. Fetch Services/Deployments for each Hosting Connection
  const allDeployments: ServerResource[] = [];
  const connections = hostingRes.data || [];
  
  // We use the hosting service to fetch the actual services inside each connection
  const { getHostingProviderStatus } = require('../connections/service');
  const { HOSTING_PROVIDERS: HP_CONFIG } = require('@servx/config');

  await Promise.all(connections.map(async (conn) => {
    try {
      // Find the provider key (e.g. 'vercel') from the dbName (e.g. 'Vercel')
      const providerKey = Object.keys(HP_CONFIG).find(
        key => HP_CONFIG[key].dbName === conn.provider
      );

      if (providerKey) {
        const status = await getHostingProviderStatus(adminRecord.id, providerKey);
        if (status.connected) {
          const services = status.services || [];
          services.forEach((s: any) => {
            allDeployments.push({
              id: s.id,
              name: s.name,
              provider: conn.provider,
              // We'll try to guess or use metadata if available in future
              // For now, let's assume the service name or its linked repo info
              repo_full_name: s.repo_full_name || s.metadata?.repo_full_name
            });
          });
        }
      }
    } catch (err) {
      console.error(`[Admin] Failed to fetch services for ${conn.name}:`, err);
    }
  }));

  // 3. Fetch GitHub Repos
  let repos: RepoResource[] = [];
  const { data: githubData } = await supabaseAdmin
    .from('github_vault')
    .select('*')
    .eq('user_id', adminRecord.id)
    .single();

  if (githubData) {
    try {
      const accessToken = githubData.encrypted_access_token;
      const repoResponse = await axios.get('https://api.github.com/user/repos', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { sort: 'updated', per_page: 50 },
      });
      repos = (repoResponse.data as any[]).map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name,
        deployments: [] // Will be populated below
      }));
    } catch (error) {
      console.error('Failed to fetch GitHub repos for resources:', (error as any)?.message || error);
    }
  }

  // 4. Map Deployments to Repos and group Standalone
  const standaloneDeployments: ServerResource[] = [];
  
  allDeployments.forEach(depl => {
    // Try to find a matching repo. 
    // Logic: Exact match on repo_full_name, OR name match (e.g. repo 'servx' matches vercel project 'servx')
    const matchingRepo = repos.find(r => 
      r.full_name === depl.repo_full_name || 
      r.name.toLowerCase() === depl.name.toLowerCase()
    );

    if (matchingRepo) {
      matchingRepo.deployments.push(depl);
    } else {
      standaloneDeployments.push(depl);
    }
  });

  return {
    databases,
    repos,
    standaloneDeployments,
  };
}

/**
 * Returns permissions for a given user under a given owner.
 * If the user is the owner themselves, they get full control.
 */
export async function getEffectivePermissions(
  ownerId: string,
  userId: string
): Promise<Permissions> {
  if (ownerId === userId) {
    return {
      repos: [],
      dbs: [],
      global: {
        isFullControl: true,
        canBanIPs: true,
        canViewDeviceUUIDs: true,
        canAccessHosting: true,
        canAccessGithub: true,
        canAccessDatabases: true,
      },
      granularAllow: null,
    };
  }
  return getAdminPermissions(ownerId, userId);
}
