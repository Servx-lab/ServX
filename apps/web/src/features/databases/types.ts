// DatabaseType is identical in both @servx/types and the original local types.ts.
// Import from the shared package and re-export so existing consumer imports don't break.
export type { DatabaseType } from '@servx/types';
import type { DatabaseType } from '@servx/types';

export interface UniversalRecord {
  id: string;
  source: DatabaseType;
  collection: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, any>;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  status: 'connected' | 'disconnected' | 'error';
  lastSynced?: string;
}

export const SOURCE_COLORS: Record<string, string> = {
  MongoDB: '#00EC65',
  Firebase: '#FEA001',
  Supabase: '#3ECE8F',
  PostgreSQL: '#326691',
  MySQL: '#01748F',
  'AWS RDS': '#FE9901',
  Oracle: '#F80101',
  MariaDB: '#C0775B',
};

// ── API response / payload types ────────────────────────────────────────────

export interface ConnectionListItem {
  _id: string;
  name: string;
  provider: string;
  status: 'connected' | 'error' | 'pending';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectionResponse {
  _id: string;
  name: string;
  provider: string;
  status: string;
}

export interface DbInfo {
  name: string;
  sizeOnDisk: number;
}

export interface AuthUserDetail {
  id: string;
  email: string;
  displayName: string;
  creationTime: string;
  lastSignInTime: string;
  disabled: boolean;
}

export interface AuthUserListResponse {
  users: AuthUserDetail[];
}

