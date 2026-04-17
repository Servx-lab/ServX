import type { Request, Response, NextFunction } from 'express';

import admin from '../../../utils/firebaseAdmin';
import { supabaseAdmin } from '../../utils/supabaseAdmin';

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email: string };
    }
  }
}

const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] Missing or malformed header:', authHeader);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Try Firebase Verification
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('[Auth] Firebase token verified for UID:', decodedToken.uid);
    req.user = {
      uid: decodedToken.uid as string,
      email: (decodedToken.email ?? '') as string,
    };
    next();
    return;
  } catch (firebaseError) {
    // 2. Try Supabase Verification if Firebase fails
    try {
        const { data: { user }, error: supabaseError } = await supabaseAdmin.auth.getUser(token);
        
        if (supabaseError || !user) {
            throw new Error(supabaseError?.message || 'Invalid Supabase token');
        }

        console.log('[Auth] Supabase token verified for UID:', user.id);
        req.user = {
            uid: user.id,
            email: (user.email ?? '') as string,
        };
        next();
    } catch (error) {
        console.error('Auth Middleware Error (Both providers failed):', (error as Error).message);
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token',
        });
    }
  }
};

export default requireAuth;
