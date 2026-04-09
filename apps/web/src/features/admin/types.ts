export type AdminRole = 'owner' | 'editor' | 'viewer';

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

export interface AccessPermissions {
  repos: RepoPermissions[];
  dbs: DbPermissions[];
  global: GlobalPermissions;
}

export interface AdminResource {
  dbs: { name: string; provider: string }[];
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
