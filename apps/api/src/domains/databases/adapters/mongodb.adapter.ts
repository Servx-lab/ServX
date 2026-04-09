/**
 * mongodb.adapter.ts
 * Adapter for MongoDB connections using the official `mongodb` driver.
 */

import { MongoClient } from 'mongodb';
import type { IDbAdapter, AdapterDatabase, AdapterTable, DbStats } from './base.adapter';

export class MongoDbAdapter implements IDbAdapter {
  private readonly uri: string;

  constructor(config: Record<string, unknown>) {
    if (!config.connectionUri || typeof config.connectionUri !== 'string') {
      throw new Error('MongoDB adapter requires a connectionUri');
    }
    this.uri = config.connectionUri;
  }

  private async withClient<T>(fn: (client: MongoClient) => Promise<T>): Promise<T> {
    const client = new MongoClient(this.uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.close();
    }
  }

  async listDatabases(): Promise<AdapterDatabase[]> {
    return this.withClient(async (client) => {
      const result = await client.db().admin().listDatabases();
      return result.databases
        .map((db) => ({
          name: db.name as string,
          sizeOnDisk: (db.sizeOnDisk ?? 0) as number,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async listTables(dbName: string): Promise<AdapterTable[]> {
    return this.withClient(async (client) => {
      const collections = await client.db(dbName).listCollections().toArray();
      return collections
        .map((c) => ({ name: c.name, type: 'collection' }))
        .sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async queryRows(dbName: string, table: string, limit = 50): Promise<unknown[]> {
    return this.withClient(async (client) => {
      return client.db(dbName).collection(table).find({}).limit(limit).toArray();
    });
  }

  async ping(): Promise<true> {
    await this.withClient(async (client) => {
      await client.db().admin().ping();
    });
    return true;
  }

  async getStats(): Promise<DbStats> {
    return this.withClient(async (client) => {
      const admin = client.db().admin();
      const [serverStatus, buildInfo] = await Promise.allSettled([
        admin.command({ serverStatus: 1 }),
        admin.command({ buildInfo: 1 }),
      ]);

      const status = serverStatus.status === 'fulfilled' ? serverStatus.value : {};
      const info = buildInfo.status === 'fulfilled' ? buildInfo.value : {};

      return {
        version: (info as any).version,
        uptime: (status as any).uptimeSeconds,
        totalConnections: (status as any).connections?.current,
        memoryUsedBytes: ((status as any).mem?.resident ?? 0) * 1024 * 1024,
        queryCount: (status as any).opcounters?.query,
        extra: {
          host: (status as any).host,
          storageEngine: (status as any).storageEngine?.name,
        },
      };
    });
  }
}
