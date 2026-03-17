export interface AdminRecord {
  uid: string;
  email: string;
  role: string;
  addedAt: string;
}

export interface RepoPermission {
  name: string;
  canViewLogs: boolean;
  canViewCommits: boolean;
  canTriggerPipeline: boolean;
}

export interface DbPermission {
  name: string;
  canView: boolean;
  canModify: boolean;
}

export interface GlobalPermission {
  isFullControl: boolean;
  canBanIPs: boolean;
  canViewDeviceUUIDs: boolean;
}

export interface Permissions {
  repos: RepoPermission[];
  dbs: DbPermission[];
  global: GlobalPermission;
}

export interface DbResource {
  name: string;
  provider: string;
}

export interface RepoResource {
  name: string;
  full_name: string;
}

export interface AdminDoc {
  _id?: string;
  uid: string;
  email?: string;
  role?: string;
  addedAt?: string | Date;
}
