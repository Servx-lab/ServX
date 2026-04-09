import type { Request, Response, NextFunction } from 'express';

import admin from '../../../utils/firebaseAdmin';

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

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('[Auth] Token verified for UID:', decodedToken.uid);
    req.user = {
      uid: decodedToken.uid as string,
      email: (decodedToken.email ?? '') as string,
    };
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', (error as Error).message);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
};

export default requireAuth;
