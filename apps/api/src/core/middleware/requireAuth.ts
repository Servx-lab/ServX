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

const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    if (!supabaseAdmin) {
        throw new Error('Supabase Admin client not initialized');
    }

    const { data: { user }, error: supabaseError } = await supabaseAdmin.auth.getUser(token);
    
    if (supabaseError || !user) {
        throw new Error(supabaseError?.message || 'Invalid session');
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

