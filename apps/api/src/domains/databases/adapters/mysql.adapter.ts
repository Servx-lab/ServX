/**
 * mysql.adapter.ts
 * Adapter for MySQL and MariaDB connections.
 * Uses `mysql2/promise` for async/await support.
 */

import mysql from 'mysql2/promise';
import type { IDbAdapter, AdapterDatabase, AdapterTable, DbStats } from './base.adapter';

interface MySqlConfig {
  connectionUri?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export class MySqlAdapter implements IDbAdapter {
  private readonly config: MySqlConfig;

  constructor(config: Record<string, unknown>) {
    this.config = config as MySqlConfig;
    if (!this.config.connectionUri && !this.config.host) {
      throw new Error('MySQL adapter requires either connectionUri or host/user/password/database');
    }
  }

  private getConnectionConfig(): mysql.ConnectionOptions {
    if (this.config.connectionUri) {
      return { uri: this.config.connectionUri, connectTimeout: 8000 };
    }
    return {
      host: this.config.host,
      port: this.config.port ?? 3306,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectTimeout: 8000,
    };
  }

  private async withConnection<T>(fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
    const conn = await mysql.createConnection(this.getConnectionConfig());
    try {
      return await fn(conn);
    } finally {
      await conn.end();
    }
  }

  async listDatabases(): Promise<AdapterDatabase[]> {
    return this.withConnection(async (conn) => {
      const [rows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT schema_name AS \`name\`,
                CAST(SUM(data_length + index_length) AS UNSIGNED) AS sizeOnDisk
         FROM information_schema.tables
         GROUP BY schema_name
         ORDER BY schema_name`
      );
      return (rows as { name: string; sizeOnDisk: number | null }[]).map((r) => ({
        name: r.name,
        sizeOnDisk: r.sizeOnDisk ?? 0,
      }));
    });
  }

  async listTables(dbName: string): Promise<AdapterTable[]> {
    return this.withConnection(async (conn) => {
      const [rows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT table_name AS \`name\`, table_type AS type,
                table_rows AS rowCount
         FROM information_schema.tables
         WHERE table_schema = ?
         ORDER BY table_name`,
        [dbName]
      );
      return (rows as { name: string; type: string; rowCount: number }[]).map((r) => ({
        name: r.name,
        type: r.type === 'VIEW' ? 'view' : 'table',
        rowCount: r.rowCount,
      }));
    });
  }

  async queryRows(dbName: string, table: string, limit = 50): Promise<unknown[]> {
    return this.withConnection(async (conn) => {
      await conn.query('USE ??', [dbName]);
      const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT * FROM ?? LIMIT ?`, [table, limit]);
      return rows;
    });
  }

  async ping(): Promise<true> {
    await this.withConnection(async (conn) => {
      await conn.ping();
    });
    return true;
  }

  async getStats(): Promise<DbStats> {
    return this.withConnection(async (conn) => {
      const [[versionRow]] = await conn.query<mysql.RowDataPacket[]>('SELECT VERSION() AS version');
      const [[statusRow]] = await conn.query<mysql.RowDataPacket[]>(
        `SHOW GLOBAL STATUS WHERE Variable_name IN ('Uptime', 'Threads_connected', 'Queries')`
      );

      // SHOW STATUS returns multiple rows; re-query individually for simplicity
      const statusMap: Record<string, string> = {};
      const [statusRows] = await conn.query<mysql.RowDataPacket[]>(
        `SHOW GLOBAL STATUS WHERE Variable_name IN ('Uptime', 'Threads_connected', 'Queries')`
      );
      for (const r of statusRows as { Variable_name: string; Value: string }[]) {
        statusMap[r.Variable_name] = r.Value;
      }

      return {
        version: (versionRow as any)['VERSION()'],
        uptime: statusMap['Uptime'] ? parseInt(statusMap['Uptime'], 10) : undefined,
        totalConnections: statusMap['Threads_connected'] ? parseInt(statusMap['Threads_connected'], 10) : undefined,
        queryCount: statusMap['Queries'] ? parseInt(statusMap['Queries'], 10) : undefined,
      };
    });
  }
}
