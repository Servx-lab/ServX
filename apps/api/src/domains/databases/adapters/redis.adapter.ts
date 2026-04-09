/**
 * redis.adapter.ts
 * Adapter for Redis connections using the `redis` (node-redis v4) package.
 */

import { createClient } from 'redis';
import type { IDbAdapter, AdapterDatabase, AdapterTable, DbStats } from './base.adapter';

interface RedisConfig {
  url?: string;
  password?: string;
}

export class RedisAdapter implements IDbAdapter {
  private readonly config: RedisConfig;

  constructor(config: Record<string, unknown>) {
    this.config = config as RedisConfig;
    if (!this.config.url) {
      throw new Error('Redis adapter requires a url (e.g. redis://host:6379)');
    }
  }

  private async withClient<T>(fn: (client: ReturnType<typeof createClient>) => Promise<T>): Promise<T> {
    const client = createClient({
      url: this.config.url,
      password: this.config.password,
      socket: { connectTimeout: 8000 },
    });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.disconnect();
    }
  }

  /**
   * Redis logical DBs are numbered 0–15 (default). We list the ones that have keys.
   */
  async listDatabases(): Promise<AdapterDatabase[]> {
    return this.withClient(async (client) => {
      const info = (await client.info('keyspace')) as string;
      const databases: AdapterDatabase[] = [];

      const lines = info.split('\n');
      for (const line of lines) {
        const match = line.match(/^db(\d+):keys=(\d+)/);
        if (match) {
          databases.push({ name: `db${match[1]}`, sizeOnDisk: 0 });
        }
      }

      if (databases.length === 0) {
        databases.push({ name: 'db0' });
      }

      return databases;
    });
  }

  /**
   * List keys in a Redis DB index (e.g. "db0" → SELECT 0).
   * Returns up to 200 keys.
   */
  async listTables(dbName: string): Promise<AdapterTable[]> {
    return this.withClient(async (client) => {
      const dbIndex = parseInt(dbName.replace('db', ''), 10) || 0;

      // Switch to correct DB
      if (dbIndex !== 0) {
        await client.select(dbIndex);
      }

      const keys: string[] = [];
      let cursor: string | number = 0;
      do {
        const result = await client.scan(cursor as any, { COUNT: 100, MATCH: '*' });
        cursor = result.cursor as string | number;
        keys.push(...result.keys.map(k => k.toString()));
      } while (cursor !== 0 && cursor !== '0' && keys.length < 200);

      return keys.slice(0, 200).map((key) => ({ name: key, type: 'key' }));
    });
  }

  /**
   * Fetch values for up to `limit` keys from the given DB.
   */
  async queryRows(dbName: string, table: string, limit = 50): Promise<unknown[]> {
    return this.withClient(async (client) => {
      const dbIndex = parseInt(dbName.replace('db', ''), 10) || 0;
      if (dbIndex !== 0) await client.select(dbIndex);

      const keyType = await client.type(table);
      let value: unknown;

      switch (keyType) {
        case 'string':
          value = await client.get(table);
          break;
        case 'hash':
          value = await client.hGetAll(table);
          break;
        case 'list':
          value = await client.lRange(table, 0, limit - 1);
          break;
        case 'set':
          value = await client.sMembers(table);
          break;
        case 'zset':
          value = await client.zRangeWithScores(table, 0, limit - 1);
          break;
        default:
          value = `(type: ${keyType})`;
      }

      const ttl = await client.ttl(table);
      return [{ key: table, type: keyType, ttl, value }];
    });
  }

  async ping(): Promise<true> {
    await this.withClient(async (client) => {
      const pong = await client.ping();
      if (pong !== 'PONG') throw new Error('Unexpected Redis ping response');
    });
    return true;
  }

  async getStats(): Promise<DbStats> {
    return this.withClient(async (client) => {
      const info = (await client.info()) as string;
      const parse = (key: string): string | undefined => {
        const match = info.match(new RegExp(`^${key}:(.+)$`, 'm'));
        return match ? match[1].trim() : undefined;
      };

      return {
        version: parse('redis_version'),
        uptime: parse('uptime_in_seconds') ? parseInt(parse('uptime_in_seconds')!, 10) : undefined,
        totalConnections: parse('connected_clients') ? parseInt(parse('connected_clients')!, 10) : undefined,
        memoryUsedBytes: parse('used_memory') ? parseInt(parse('used_memory')!, 10) : undefined,
        extra: {
          role: parse('role'),
          usedMemoryHuman: parse('used_memory_human'),
          keyspaceHits: parse('keyspace_hits'),
          keyspaceMisses: parse('keyspace_misses'),
          totalCommandsProcessed: parse('total_commands_processed'),
        },
      };
    });
  }
}
