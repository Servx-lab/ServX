/**
 * postgres.adapter.ts
 * Adapter for PostgreSQL and AWS RDS (Postgres-flavour) connections.
 * Uses `pg` (node-postgres).
 */

import { Client } from 'pg';
import type { IDbAdapter, AdapterDatabase, AdapterTable, DbStats } from './base.adapter';

export class PostgresAdapter implements IDbAdapter {
  private readonly connectionUri: string;

  constructor(config: Record<string, unknown>) {
    if (!config.connectionUri || typeof config.connectionUri !== 'string') {
      throw new Error('PostgreSQL adapter requires a connectionUri');
    }
    this.connectionUri = config.connectionUri;
  }

  private async withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({
      connectionString: this.connectionUri,
      connectionTimeoutMillis: 8000,
      ssl: this.connectionUri.includes('sslmode=require') || this.connectionUri.includes('neon.tech') || this.connectionUri.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : undefined,
    });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.end();
    }
  }

  async listDatabases(): Promise<AdapterDatabase[]> {
    return this.withClient(async (client) => {
      const res = await client.query<{ datname: string; size: string }>(
        `SELECT datname, pg_database_size(datname)::text AS size
         FROM pg_database
         WHERE datistemplate = false
         ORDER BY datname`
      );
      return res.rows.map((r) => ({
        name: r.datname,
        sizeOnDisk: parseInt(r.size, 10) || 0,
      }));
    });
  }

  async listTables(dbName: string): Promise<AdapterTable[]> {
    // In Postgres we connect to a specific DB; dbName is used as the schema context.
    // Since pg connections are per-DB, we list tables in all non-system schemas.
    return this.withClient(async (client) => {
      const res = await client.query<{ table_name: string; table_schema: string; table_type: string }>(
        `SELECT table_name, table_schema, table_type
         FROM information_schema.tables
         WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
           AND table_catalog = current_database()
         ORDER BY table_schema, table_name`
      );
      return res.rows.map((r) => ({
        name: r.table_schema !== 'public' ? `${r.table_schema}.${r.table_name}` : r.table_name,
        type: r.table_type === 'VIEW' ? 'view' : 'table',
      }));
    });
  }

  async queryRows(dbName: string, table: string, limit = 50): Promise<unknown[]> {
    return this.withClient(async (client) => {
      // Safely quote the table identifier
      const safeTable = table.includes('.') ? table : `"${table}"`;
      const res = await client.query(`SELECT * FROM ${safeTable} LIMIT $1`, [limit]);
      return res.rows;
    });
  }

  async ping(): Promise<true> {
    await this.withClient(async (client) => {
      await client.query('SELECT 1');
    });
    return true;
  }

  async getStats(): Promise<DbStats> {
    return this.withClient(async (client) => {
      const [versionRes, connRes, sizeRes] = await Promise.allSettled([
        client.query<{ version: string }>('SELECT version()'),
        client.query<{ count: string }>('SELECT count(*) FROM pg_stat_activity'),
        client.query<{ size: string }>('SELECT pg_database_size(current_database())::text AS size'),
      ]);

      const version = versionRes.status === 'fulfilled' ? versionRes.value.rows[0]?.version : undefined;
      const connections = connRes.status === 'fulfilled' ? parseInt(connRes.value.rows[0]?.count, 10) : undefined;
      const storageBytes = sizeRes.status === 'fulfilled' ? parseInt(sizeRes.value.rows[0]?.size, 10) : undefined;

      return {
        version: version?.split(' ')[1],
        totalConnections: connections,
        storageUsedBytes: storageBytes,
      };
    });
  }
}
