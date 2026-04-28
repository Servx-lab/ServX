import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let isConnecting = false;
let lastConnectAttempt = 0;
let circuitBreakerUntil = 0;
const CIRCUIT_BREAKER_DURATION_MS = 300000;

// RAM Cache (Layer 1)
const ramCache = new Map<string, { data: any; expires: number }>();
const DEFAULT_RAM_TTL = 300000; // 5 minutes

/**
 * Returns a connected Redis client instance.
 * Implements a singleton pattern with automatic reconnection strategy.
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

  // If already connecting, return the client
  if (isConnecting) return client;

  if (!client) {
    client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          // If we are failing, back off hard
          if (retries > 3) return new Error('Max retries exceeded');
          return 1000;
        },
        connectTimeout: 1000, // Fail fast: 1 second
      },
    });

    client.on('error', (err) => {
      console.error('[Redis] Client error:', err.message);
      // Trip circuit breaker on critical errors
      circuitBreakerUntil = Date.now() + CIRCUIT_BREAKER_DURATION_MS;
      console.warn('[Redis] 🚨 Circuit Breaker Triggered (5-min lockout)');
    });

    client.on('ready', () => {
      console.log('✅ Redis');
      circuitBreakerUntil = 0; // Reset on success
    });
  }

  try {
    isConnecting = true;
    
    // Wrap connect in a timeout to ensure it doesn't block
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 1500)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    return client;
  } catch (err: any) {
    console.warn('[Redis] Connection failed:', err.message);
    // Trip circuit breaker
    circuitBreakerUntil = Date.now() + CIRCUIT_BREAKER_DURATION_MS;
    console.warn('[Redis] 🚨 Circuit Breaker Triggered (5-min lockout)');
    return null;
  } finally {
    isConnecting = false;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const now = Date.now();
  
  // 1. Check RAM Cache (Layer 1)
  const inRam = ramCache.get(key);
  if (inRam && inRam.expires > now) {
    return inRam.data as T;
  } else if (inRam) {
    ramCache.delete(key); // Cleanup expired
  }

  // 2. Check Redis (Layer 2)
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const getPromise = redis.get(key);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis GET timeout')), 1000)
    );

    const raw = await Promise.race([getPromise, timeoutPromise]) as string | null;
    if (!raw) return null;
    
    const parsed = JSON.parse(raw) as T;
    
    // Backfill RAM cache for future instant access
    ramCache.set(key, { data: parsed, expires: now + DEFAULT_RAM_TTL });
    
    return parsed;
  } catch (err: any) {
    console.warn(`[Redis] GET failed for ${key}:`, err.message);
    return null;
  }
}

export async function cacheSet(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  const expires = Date.now() + (ttlSeconds * 1000);
  
  // 1. Update RAM Cache (Layer 1)
  ramCache.set(key, { data, expires });

  // 2. Update Redis (Layer 2)
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    const setPromise = redis.set(key, JSON.stringify(data), { EX: ttlSeconds });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis SET timeout')), 1000)
    );

    await Promise.race([setPromise, timeoutPromise]);
  } catch (err: any) {
    console.warn(`[Redis] SET failed for ${key}:`, err.message);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  // 1. Clear RAM
  keys.forEach(k => ramCache.delete(k));

  // 2. Clear Redis
  const redis = await getRedisClient();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(keys);
  } catch {
    // Non-critical
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  // Clear RAM matching pattern (simple includes check for pattern-like strings)
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
  } catch {
    // Non-critical
  }
}
