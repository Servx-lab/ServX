/**
 * oracle.adapter.ts
 * Adapter for Oracle Database using `node-oracledb` in thin mode (no Oracle Instant Client needed).
 */

import type { IDbAdapter, AdapterDatabase, AdapterTable, DbStats } from './base.adapter';

interface OracleConfig {
  user: string;
  password: string;
  connectString: string; // e.g. "host:1521/XEPDB1" or "host:1521/service_name"
}

export class OracleAdapter implements IDbAdapter {
  private readonly config: OracleConfig;

  constructor(config: Record<string, unknown>) {
    const c = config as Partial<OracleConfig>;
    if (!c.user || !c.password || !c.connectString) {
      throw new Error('Oracle adapter requires user, password, and connectString');
    }
    this.config = c as OracleConfig;
  }

  private async withConnection<T>(fn: (conn: any) => Promise<T>): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const oracledb = require('oracledb');
    // Use thin mode — no Oracle Instant Client required
    oracledb.initOracleClient = undefined; // ensure thin mode
    oracledb.thin = true;

    const conn = await oracledb.getConnection({
      user: this.config.user,
      password: this.config.password,
      connectString: this.config.connectString,
    });
    try {
      return await fn(conn);
    } finally {
      await conn.close();
    }
  }

  /**
   * In Oracle a "database" maps to a Schema/User.
   * We list all accessible schemas for the connected user.
   */
  async listDatabases(): Promise<AdapterDatabase[]> {
    return this.withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT username AS name FROM all_users WHERE account_status = 'OPEN' ORDER BY username`,
        [],
        { outFormat: 0x0002 } // OUT_FORMAT_OBJECT
      );
      return (result.rows as { NAME: string }[]).map((r) => ({ name: r.NAME }));
    });
  }

  async listTables(dbName: string): Promise<AdapterTable[]> {
    return this.withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT table_name AS name, 'table' AS type, num_rows AS "rowCount"
         FROM all_tables
         WHERE owner = UPPER(:owner)
         ORDER BY table_name`,
        { owner: dbName },
        { outFormat: 0x0002 }
      );
      return (result.rows as { name: string; type: string; rowCount: number }[]).map((r) => ({
        name: r.name,
        type: r.type,
        rowCount: r.rowCount,
      }));
    });
  }

  async queryRows(dbName: string, table: string, limit = 50): Promise<unknown[]> {
    return this.withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT * FROM "${dbName}"."${table}" FETCH FIRST :lim ROWS ONLY`,
        { lim: limit },
        { outFormat: 0x0002 }
      );
      return result.rows as unknown[];
    });
  }

  async ping(): Promise<true> {
    await this.withConnection(async (conn) => {
      await conn.execute('SELECT 1 FROM DUAL');
    });
    return true;
  }

  async getStats(): Promise<DbStats> {
    return this.withConnection(async (conn) => {
      const [versionResult, instanceResult] = await Promise.allSettled([
        conn.execute(
          `SELECT version FROM v$instance`,
          [],
          { outFormat: 0x0002 }
        ),
        conn.execute(
          `SELECT startup_time FROM v$instance`,
          [],
          { outFormat: 0x0002 }
        ),
      ]);

      const version =
        versionResult.status === 'fulfilled'
          ? (versionResult.value.rows as { VERSION: string }[])[0]?.VERSION
          : undefined;

      return {
        version,
        extra: {
          note: 'Session-level stats. Full metrics require DBA_HIST access.',
        },
      };
    });
  }
}
