export type AdminRole = 'owner' | 'editor' | 'viewer';

export interface UserSearchHit {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatarUrl?: string;
}

export interface AdminRecord {
  uid: string;
  email: string;
  role: AdminRole;
  addedAt: string;
}

export interface RepoPermissions {
  name: string;
  canViewLogs: boolean;
  canViewCommits: boolean;
  canTriggerPipeline: boolean;
}

export interface DbPermissions {
  name: string;
  canView: boolean;
  canModify: boolean;
}

export interface GlobalPermissions {
  isFullControl: boolean;
  canBanIPs: boolean;
  canViewDeviceUUIDs: boolean;
}

export interface GranularAllow {
  repoKeys?: string[];
  serverIds?: string[];
  databaseIds?: string[];
}

export interface AccessPermissions {
  repos: RepoPermissions[];
  dbs: DbPermissions[];
  global: GlobalPermissions;
  granularAllow?: GranularAllow | null;
}

export interface ServerResource {
  id: string;
  name: string;
  provider: string;
}

export interface AdminResource {
  dbs: { id: string; name: string; provider: string }[];
  databases: { id: string; name: string; provider: string }[];
  servers: ServerResource[];
  repos: { name: string; full_name: string }[];
}

export interface InviteAdminBody {
  email: string;
  role: AdminRole;
}

export interface UpdatePermissionsBody {
  userUid: string;
  permissions: AccessPermissions;
}
