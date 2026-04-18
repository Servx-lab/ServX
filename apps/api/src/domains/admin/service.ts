import axios from 'axios';

import { ConflictError, NotFoundError } from '@servx/errors';

import { Admin, AccessControl, User } from './model';
import type {
  AdminDoc,
  AdminRecord,
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
  return admins.map((a: any) => ({
    id: a.id,
    email: a.email,
    role: a.role,
    addedAt: a.addedAt?.toISOString?.() ?? String(a.addedAt),
  }));
}

export async function revokeAdmin(id: string): Promise<void> {
  const deleted = await (Admin as any).findOneAndDelete({ id });
  if (!deleted) {
    throw new NotFoundError('Admin not found');
  }
}

export async function getAdminPermissions(ownerId: string, userId: string): Promise<Permissions> {
  const found = await (AccessControl as any).findOne({ ownerId, userId });
  if (!found?.permissions) {
    return defaultPermissions();
  }
  const p = {
    ...(typeof found.toObject === 'function' ? found.toObject().permissions : found.permissions),
  } as Permissions;
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
  const updated = await (AccessControl as any).findOneAndUpdate(
    { ownerId, userId },
    { permissions },
    { upsert: true, new: true }
  );

  return (updated?.permissions as Permissions) ?? defaultPermissions();
}

export async function getAdminResources(
  adminRecord: AdminDoc
): Promise<{
  dbs: DbResource[];
  databases: DbResource[];
  servers: ServerResource[];
  repos: RepoResource[];
}> {
  const [dbRes, hostingRes] = await Promise.all([
    supabaseAdmin.from('db_vault').select('id, name, provider'),
    supabaseAdmin.from('hosting_vault').select('id, name, provider'),
  ]);

  const databases: DbResource[] = (dbRes.data || []).map(d => ({
    id: d.id,
    name: d.name,
    provider: d.provider,
  }));

  const servers: ServerResource[] = (hostingRes.data || []).map(h => ({
    id: h.id,
    name: h.name,
    provider: h.provider,
  }));

  let repos: RepoResource[] = [];
  // Fetch GitHub token from vault
  const { data: githubData } = await supabaseAdmin
    .from('github_vault')
    .select('*')
    .eq('user_id', adminRecord.id)
    .single();

  if (githubData) {
    try {
      const accessToken = decrypt({
        content: githubData.encrypted_access_token,
        iv: githubData.iv,
      });
      const repoResponse = await axios.get('https://api.github.com/user/repos', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { sort: 'updated', per_page: 50 },
      });
      repos = (repoResponse.data as any[]).map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name,
      }));
    } catch (error) {
      console.error('Failed to fetch GitHub repos for resources:', (error as any)?.message || error);
      repos = [];
    }
  }

  return {
    dbs: databases,
    databases,
    servers,
    repos,
  };
}
