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

/** When set, only listed resource keys/ids are visible; when omitted, all connected resources are allowed. */
export interface GranularAllow {
  repoKeys?: string[];
  serverIds?: string[];
  databaseIds?: string[];
}

export interface Permissions {
  repos: RepoPermission[];
  dbs: DbPermission[];
  global: GlobalPermission;
  granularAllow?: GranularAllow | null;
}

export interface DbResource {
  id: string;
  name: string;
  provider: string;
}

export interface RepoResource {
  name: string;
  full_name: string;
}

export interface ServerResource {
  id: string;
  name: string;
  provider: string;
}

export interface AdminDoc {
  _id?: string;
  uid: string;
  email?: string;
  role?: string;
  addedAt?: string | Date;
}
