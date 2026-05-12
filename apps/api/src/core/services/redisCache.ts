import { createClient, type RedisClientType } from 'redis';
import { gzipSync, gunzipSync } from 'zlib';

let client: RedisClientType | null = null;
let isConnecting = false;
let circuitBreakerUntil = 0;
let failureCount = 0;

const INITIAL_CIRCUIT_DURATION_MS = 10000; // 10 seconds
const MAX_CIRCUIT_DURATION_MS = 300000; // 5 minutes
const COMPRESSION_THRESHOLD_BYTES = 10240; // 10KB
const COMPRESSION_PREFIX = 'gz:';

// RAM Cache (Layer 1)
const ramCache = new Map<string, { data: any; expires: number }>();
const DEFAULT_RAM_TTL = 300000; // 5 minutes

/**
 * Returns a connected Redis client instance.
 * Implements a singleton pattern with exponential circuit breaker backoff.
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  // 1. Check Circuit Breaker
  const now = Date.now();
  if (now < circuitBreakerUntil) {
    return null;
  }

  if (client?.isOpen) return client;

  if (isConnecting) return client;

  if (!client) {
    client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          const delay = Math.min(Math.pow(2, retries) * 1000, 30000);
          console.warn(`[Redis] 🔄 Reconnect attempt ${retries}. Delaying ${delay}ms`);
          return delay;
        },
        connectTimeout: 500,
      },
    });

    client.on('error', (err) => {
      console.error('[Redis] 🚨 Client error:', err.message);
      failureCount++;
      const duration = Math.min(INITIAL_CIRCUIT_DURATION_MS * Math.pow(2, failureCount - 1), MAX_CIRCUIT_DURATION_MS);
      circuitBreakerUntil = Date.now() + duration;
      console.warn(`[Redis] 🛡️ Circuit Breaker Trip #${failureCount} (${(duration / 1000).toFixed(0)}s lockout)`);
    });

    client.on('ready', () => {
      console.log('✅ Redis Connected');
      circuitBreakerUntil = 0;
      failureCount = 0;
    });
  }

  try {
    isConnecting = true;
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 1000)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    return client;
  } catch (err: any) {
    console.warn('[Redis] 🛑 Connection failed:', err.message);
    if (Date.now() >= circuitBreakerUntil) {
        failureCount++;
        const duration = Math.min(INITIAL_CIRCUIT_DURATION_MS * Math.pow(2, failureCount - 1), MAX_CIRCUIT_DURATION_MS);
        circuitBreakerUntil = Date.now() + duration;
    }
    return null;
  } finally {
    isConnecting = false;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const start = performance.now();
  const now = Date.now();
  
  if (now < circuitBreakerUntil) {
    console.warn(`[Redis] ⚡ SKIP (Circuit Open) for ${key}`);
    return null;
  }

  const inRam = ramCache.get(key);
  if (inRam && inRam.expires > now) {
    const end = performance.now();
    console.log(`[Redis] 🟢 L1 HIT (RAM) for ${key} (${(end - start).toFixed(2)}ms)`);
    // Return a clone to prevent mutation of the cached entry
    return JSON.parse(JSON.stringify(inRam.data)) as T;
  } else if (inRam) {
    ramCache.delete(key);
  }

  const redis = await getRedisClient();
  if (!redis) {
    console.warn(`[Redis] 🟡 MISS (Connection Failed) for ${key}`);
    return null;
  }

  try {
    const getPromise = redis.get(key);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis GET timeout')), 1000)
    );

    const raw = await Promise.race([getPromise, timeoutPromise]) as string | null;
    if (!raw) {
      const end = performance.now();
      console.log(`[Redis] ⚪ MISS for ${key} (${(end - start).toFixed(2)}ms)`);
      return null;
    }
    
    let processedRaw = raw;
    let wasCompressed = false;

    if (raw.startsWith(COMPRESSION_PREFIX)) {
      wasCompressed = true;
      const buffer = Buffer.from(raw.slice(COMPRESSION_PREFIX.length), 'base64');
      processedRaw = gunzipSync(buffer).toString();
    }

    const parseStart = performance.now();
    const parsed = JSON.parse(processedRaw) as T;
    const parseEnd = performance.now();
    
    if (parseEnd - parseStart > 10) {
      console.warn(`[Redis] ⚠️ Heavy JSON.parse: ${(parseEnd - parseStart).toFixed(2)}ms for ${key} ${wasCompressed ? '(decompressed)' : ''}`);
    }

    // Backfill RAM cache with a clone to prevent mutation issues
    const clone = JSON.parse(JSON.stringify(parsed));
    ramCache.set(key, { data: clone, expires: now + DEFAULT_RAM_TTL });
    
    const end = performance.now();
    console.log(`[Redis] 🔵 L2 HIT (Redis) for ${key} (${(end - start).toFixed(2)}ms) ${wasCompressed ? '📦 COMPRESSED' : ''}`);
    return parsed;
  } catch (err: any) {
    console.error(`[Redis] ❌ GET error for ${key}:`, err.message);
    return null;
  }
}

export async function cacheSet(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  const expires = Date.now() + (ttlSeconds * 1000);
  // Update RAM Cache with a clone to prevent mutation
  const clone = JSON.parse(JSON.stringify(data));
  ramCache.set(key, { data: clone, expires });

  const redis = await getRedisClient();
  if (!redis) return;

  try {
    let value = JSON.stringify(data);
    let isCompressed = false;

    if (value.length > COMPRESSION_THRESHOLD_BYTES) {
      const compressed = gzipSync(Buffer.from(value));
      value = COMPRESSION_PREFIX + compressed.toString('base64');
      isCompressed = true;
    }

    const setPromise = redis.set(key, value, { EX: ttlSeconds });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis SET timeout')), 1000)
    );

    await Promise.race([setPromise, timeoutPromise]);
    
    if (isCompressed) {
      console.log(`[Redis] 📦 Compressed payload for ${key} (${(value.length / 1024).toFixed(1)}KB)`);
    }
  } catch (err: any) {
    console.warn(`[Redis] SET failed for ${key}:`, err.message);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  keys.forEach(k => ramCache.delete(k));
  const redis = await getRedisClient();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(keys);
  } catch {}
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const regexPattern = pattern.replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  for (const key of ramCache.keys()) {
    if (regex.test(key)) ramCache.delete(key);
  }

  const redis = await getRedisClient();
  if (!redis) return;

  try {
    for await (const key of redis.scanIterator({
      MATCH: pattern,
      COUNT: 100
    })) {
      await redis.del(key);
    }
  } catch {}
}
