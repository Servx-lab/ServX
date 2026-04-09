/**
 * base.adapter.ts
 * Central contract for all database provider adapters.
 * Every adapter must implement IDbAdapter.
 */

export interface AdapterDatabase {
  name: string;
  sizeOnDisk?: number;
}

export interface AdapterTable {
  name: string;
  rowCount?: number;
  sizeBytes?: number;
  type?: string; // e.g. "table", "view", "collection", "key"
}

export interface DbStats {
  version?: string;
  uptime?: number;          // seconds
  totalConnections?: number;
  memoryUsedBytes?: number;
  storageUsedBytes?: number;
  queryCount?: number;
  extra?: Record<string, unknown>;
}

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  message?: string;
}

export interface IDbAdapter {
  /**
   * List top-level "databases" or "schemas" or logical partitions.
   * For Redis: returns DB index list (db0, db1…).
   * For Firebase/Supabase: returns a single pseudo-database entry.
   */
  listDatabases(): Promise<AdapterDatabase[]>;

  /**
   * List tables / collections / keys within a logical database.
   */
  listTables(dbName: string): Promise<AdapterTable[]>;

  /**
   * Fetch up to `limit` rows/documents/keys from a table/collection.
   */
  queryRows(dbName: string, table: string, limit?: number): Promise<unknown[]>;

  /**
   * Verify connectivity. Resolves true on success, throws on any failure.
   */
  ping(): Promise<true>;

  /**
   * Optional server-level metrics/stats.
   */
  getStats?(): Promise<DbStats>;
}
