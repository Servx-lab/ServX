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

const firebaseAdmin = require('../../../utils/firebaseAdmin');
const UserConnection = require('../../../models/UserConnection');

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
  let userRecord;
  try {
    userRecord = await firebaseAdmin.auth().getUserByEmail(email);
  } catch (error) {
    if ((error as any)?.code === 'auth/user-not-found') {
      throw new NotFoundError('User must sign up first');
    }
    throw error;
  }

  const uid = userRecord.uid as string;
  const existingAdmin = await (Admin as any).findOne({ uid });
  if (existingAdmin) {
    throw new ConflictError('User is already an administrator');
  }

  const newAdmin = new (Admin as any)({
    uid,
    email,
    role,
    addedAt: new Date(),
  });
  await newAdmin.save();

  return {
    uid,
    email,
    role,
    addedAt: newAdmin.addedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function listAdmins(): Promise<AdminRecord[]> {
  const admins = await (Admin as any).find().sort({ addedAt: -1 });
  return admins.map((a: any) => ({
    uid: a.uid,
    email: a.email,
    role: a.role,
    addedAt: a.addedAt?.toISOString?.() ?? String(a.addedAt),
  }));
}

export async function revokeAdmin(uid: string): Promise<void> {
  const deleted = await (Admin as any).findOneAndDelete({ uid });
  if (!deleted) {
    throw new NotFoundError('Admin not found');
  }
}

export async function getAdminPermissions(ownerUid: string, userUid: string): Promise<Permissions> {
  const found = await (AccessControl as any).findOne({ ownerUid, userUid });
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
  ownerUid: string,
  userUid: string,
  permissions: Permissions
): Promise<Permissions> {
  const updated = await (AccessControl as any).findOneAndUpdate(
    { ownerUid, userUid },
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
  const connections = await UserConnection.find({}, 'name provider');

  const databases: DbResource[] = [];
  const servers: ServerResource[] = [];

  for (const c of connections as any[]) {
    const rowBase = { id: String(c._id), name: c.name as string, provider: c.provider as string };
    if (DATABASE_PROVIDERS.has(c.provider)) {
      databases.push(rowBase);
    }
    if (HOSTING_PROVIDERS.has(c.provider)) {
      servers.push(rowBase);
    }
  }

  let repos: RepoResource[] = [];
  const user = await (User as any).findOne({ uid: adminRecord.uid }).select('+githubAccessToken');

  if (user?.githubAccessToken) {
    try {
      const githubRes = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      repos = (githubRes.data as any[]).map((repo: any) => ({
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
