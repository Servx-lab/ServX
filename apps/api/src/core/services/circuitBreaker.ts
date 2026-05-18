import { getRedisClient } from './redisCache';

export class CircuitBreakerError extends Error {
  constructor(public service: string) {
    super(`Circuit breaker for ${service} is OPEN.`);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Checks if a specific 3rd-party service circuit is OPEN.
 * If the circuit is OPEN, throws a CircuitBreakerError.
 */
export async function checkCircuit(service: string): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      const state = await redis.hGet('circuits', service);
      if (state === 'OPEN') {
        throw new CircuitBreakerError(service);
      }
    } catch (err) {
      if (err instanceof CircuitBreakerError) {
        throw err;
      }
      console.warn(`[CircuitBreaker] Failed to read Redis state for ${service}, defaulting to CLOSED.`, err);
    }
  }
}

/**
 * Toggles a service circuit state between CLOSED and OPEN.
 */
export async function setCircuitState(service: string, state: 'OPEN' | 'CLOSED'): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      await redis.hSet('circuits', service, state);
      console.log(`[CircuitBreaker] Circuit for ${service} set to ${state}`);
    } catch (err: any) {
      console.error(`[CircuitBreaker] Failed to set state in Redis:`, err.message);
    }
  }
}

/**
 * Retrieves the state of all circuit breakers.
 */
export async function getCircuitStates(): Promise<Record<string, 'OPEN' | 'CLOSED'>> {
  const defaultStates: Record<string, 'OPEN' | 'CLOSED'> = { openai: 'CLOSED', resend: 'CLOSED', vercel: 'CLOSED' };
  const redis = await getRedisClient();
  if (!redis) return defaultStates;

  try {
    const states = await redis.hGetAll('circuits');
    return {
      openai: (states.openai || 'CLOSED') as 'OPEN' | 'CLOSED',
      resend: (states.resend || 'CLOSED') as 'OPEN' | 'CLOSED',
      vercel: (states.vercel || 'CLOSED') as 'OPEN' | 'CLOSED',
    };
  } catch (err: any) {
    console.warn(`[CircuitBreaker] Failed to fetch states:`, err.message);
    return defaultStates;
  }
}
