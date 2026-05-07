import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../utils/supabaseAdmin';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
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
<<<<<<< HEAD
    if (!supabaseAdmin) {
        throw new Error('Supabase Admin client not initialized');
    }

    const { data: { user }, error: supabaseError } = await supabaseAdmin.auth.getUser(token);
    
    if (supabaseError || !user) {
        throw new Error(supabaseError?.message || 'Invalid session');
    }

    console.log('[Auth] Supabase token verified for UID:', user.id);
    req.user = {
        uid: user.id,
        email: (user.email ?? '') as string,
    };
    next();
  } catch (error: any) {
    console.error('[Auth] Middleware Error:', error.message);
    res.status(401).json({
        error: 'Unauthorized',
        message: error.message || 'Invalid or expired token',
=======
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth Middleware Error:', error?.message || 'User not found');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    console.log('[Auth] Token verified for ID:', user.id);
    req.user = {
      id: user.id,
      email: (user.email ?? '') as string,
    };
    next();
  } catch (error) {
    console.error('Auth Middleware Unexpected Error:', (error as Error).message);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
>>>>>>> fork/supabase
    });
  }
};

export default requireAuth;

