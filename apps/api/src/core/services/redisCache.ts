import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let connectionFailed = false;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (connectionFailed) return null;
  if (client?.isOpen) return client;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    client = createClient({ url: redisUrl });
    client.on('error', (err) => {
      console.error('[Redis] Client error:', err.message);
    });
    await client.connect();
    console.log('[Redis] Cache client connected');
    return client;
  } catch (err: any) {
    console.warn('[Redis] Failed to connect cache client:', err.message);
    connectionFailed = true;
    client = null;
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(data), { EX: ttlSeconds });
  } catch {
    // Non-critical — log nothing, fall through gracefully
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const redis = await getRedisClient();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(keys);
  } catch {
    // Non-critical
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    let cursor = 0;
    do {
      const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) {
        await redis.del(result.keys);
      }
    } while (cursor !== 0);
  } catch {
    // Non-critical
  }
}
