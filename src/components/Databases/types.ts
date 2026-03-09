export type DatabaseType = 'Firebase' | 'MongoDB' | 'Supabase' | 'MySQL' | 'AWS' | 'Oracle' | 'Google Sheets';

export interface UniversalRecord {
  id: string;
  source: DatabaseType;
  collection: string; // Table or Sheet name
  createdAt: string;
  updatedAt: string;
  data: Record<string, any>; // The dynamic data field
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  status: 'connected' | 'disconnected' | 'error';
  lastSynced?: string;
}
