import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { getLocalJwtValidAfter } from '../../domains/operations/defconService';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; uid: string; email: string };
    }
  }
}

// In-memory short-lived cache of verified tokens to avoid a Supabase network
// round-trip on every single authenticated request. Entries are keyed by the
// raw JWT string and expire quickly so revocations/DEFCON lockdowns still
// take effect within a bounded window.
interface CachedAuthEntry {
  user: { id: string; uid: string; email: string };
  expiresAt: number;
}

const AUTH_CACHE_TTL_MS = 30_000; // 30 seconds
const authCache = new Map<string, CachedAuthEntry>();

function getCachedAuth(token: string): CachedAuthEntry['user'] | null {
  const entry = authCache.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    authCache.delete(token);
    return null;
  }
  return entry.user;
}

function setCachedAuth(token: string, user: CachedAuthEntry['user']): void {
  authCache.set(token, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
  // Opportunistic cleanup so the map doesn't grow unbounded under heavy traffic.
  if (authCache.size > 5000) {
    const now = Date.now();
    for (const [key, value] of authCache) {
      if (value.expiresAt < now) authCache.delete(key);
    }
  }
}

const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if (req.query.token) {
    token = String(req.query.token);
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header or token query parameter',
    });
    return;
  }

  try {
    let user = getCachedAuth(token);

    if (!user) {
      if (!supabaseAdmin) {
          throw new Error('Supabase Admin client not initialized');
      }

      const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAdmin.auth.getUser(token);

      if (supabaseError || !supabaseUser) {
          throw new Error(supabaseError?.message || 'Invalid session');
      }

      user = {
        id: supabaseUser.id,
        uid: supabaseUser.id,
        email: (supabaseUser.email ?? '') as string,
      };
      setCachedAuth(token, user);
    }

    // --- JWT Invalidation check for DEFCON Lockdown ---
    const localJwtValidAfter = getLocalJwtValidAfter();
    if (localJwtValidAfter > 0) {
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          const iatMs = (payload.iat || 0) * 1000;
          if (iatMs < localJwtValidAfter) {
            authCache.delete(token);
            console.warn(
              `[Auth] Rejected token for ${user.email} - issued at ${new Date(iatMs).toISOString()} before lockdown threshold ${new Date(localJwtValidAfter).toISOString()}`
            );
            res.status(401).json({
              error: 'Unauthorized',
              message: 'Session invalidated due to system lockdown. Please log in again.',
            });
            return;
          }
        }
      } catch (err: any) {
        console.warn('[Auth] Failed to parse JWT payload for lockdown verification:', err.message);
      }
    }

    console.log('[Auth] Supabase token verified for ID:', user.id);
    req.user = {
        id: user.id,
        uid: user.id,
        email: (user.email ?? '') as string,
    };
    next();
  } catch (error: any) {
    console.error('[Auth] Middleware Error:', error.message);
    res.status(401).json({
        error: 'Unauthorized',
        message: error.message || 'Invalid or expired token',
    });
  }
};

export default requireAuth;

