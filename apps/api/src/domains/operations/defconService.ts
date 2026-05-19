import { getRedisClient } from '../../core/services/redisCache';
import { auditEmitter } from './auditEmitter';

// Local Node.js memory caches
let localDefconState = 5; // Default is Normal (DEFCON 5)
let localJwtValidAfter = 0; // Timestamp in milliseconds

let isSubscribed = false;

/**
 * Initializes the DEFCON Service.
 * Fetches current Redis states and registers a Redis Pub/Sub subscriber.
 */
export async function initDefconService(): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    console.warn('[DEFCON] ⚠️ Redis client unavailable, running in isolated memory mode.');
    return;
  }

  try {
    // 1. Initial State Sync
    const savedState = await redis.get('global:defcon:state');
    if (savedState) {
      localDefconState = parseInt(savedState as string, 10);
      console.log(`[DEFCON] Synchronized current state from Redis: ${localDefconState}`);
    }

    const savedValidAfter = await redis.get('global:jwt:valid_after');
    if (savedValidAfter) {
      localJwtValidAfter = parseInt(savedValidAfter as string, 10);
      console.log(`[DEFCON] Synchronized JWT valid-after timestamp from Redis: ${localJwtValidAfter}`);
    }

    // 2. Setup Pub/Sub Subscription
    if (!isSubscribed) {
      const subClient = redis.duplicate();
      subClient.on('error', (err) => {
        console.error('[DEFCON] 🚨 Subscriber client connection error:', err.message);
      });
      await subClient.connect();
      
      await subClient.subscribe('channel:defcon_updates', (message) => {
        try {
          const payload = JSON.parse(message);
          localDefconState = payload.state;
          localJwtValidAfter = payload.jwtValidAfter || 0;
          console.log(`[DEFCON] 🔄 Pub/Sub Broadcast Received - New State: ${localDefconState}, JWT Limit: ${localJwtValidAfter}`);
        } catch {
          // Fallback if plain text integer is published
          localDefconState = parseInt(message, 10);
          if (localDefconState === 1 || localDefconState === 3) {
            localJwtValidAfter = Date.now();
          }
          console.log(`[DEFCON] 🔄 Plaintext Pub/Sub Received - New State: ${localDefconState}`);
        }
      });
      
      isSubscribed = true;
      console.log('✅ DEFCON Pub/Sub subscription active on channel:defcon_updates');
    }
  } catch (err: any) {
    console.error('[DEFCON] Failed to initialize DEFCON service pub/sub:', err.message);
  }
}

/**
 * Updates the global DEFCON state, syncs with Redis, and broadcasts to other Express nodes.
 */
export async function updateDefconState(state: number, userEmail = 'system@servx.dev'): Promise<void> {
  localDefconState = state;
  const isLockdown = state === 1 || state === 3;

  if (isLockdown) {
    localJwtValidAfter = Date.now();
  }

  const redis = await getRedisClient();
  if (redis) {
    try {
      // Persist in Redis
      await redis.set('global:defcon:state', String(state));
      await redis.set('global:jwt:valid_after', String(localJwtValidAfter));

      // Broadcast changes to Pub/Sub
      const payload = JSON.stringify({
        state,
        jwtValidAfter: localJwtValidAfter,
      });
      await redis.publish('channel:defcon_updates', payload);
      
      console.log(`[DEFCON] Persisted and published DEFCON level ${state} change.`);
    } catch (err: any) {
      console.error('[DEFCON] Failed to publish state update to Redis:', err.message);
    }
  }

  // Audit event logging
  let statusText = 'Normal baseline operations restored';
  if (state === 3 || state === 2) statusText = 'Elevated threat level initiated';
  if (state === 1) statusText = 'CRITICAL SYSTEM LOCKDOWN ENGAGED';

  auditEmitter.log(
    userEmail,
    'security',
    `DEFCON Threat Level updated to DEFCON ${state} (${statusText})`
  );
}

/**
 * Returns the local process in-memory DEFCON state.
 */
export function getLocalDefconState(): number {
  return localDefconState;
}

/**
 * Returns the local process in-memory JWT valid-after timestamp (ms).
 */
export function getLocalJwtValidAfter(): number {
  return localJwtValidAfter;
}
