import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../utils/supabaseAdmin';

const AdminModel = require('../../../models/Admin');

declare global {
  namespace Express {
    interface Request {
      admin?: Record<string, unknown>;
      uid?: string;
      user?: { uid: string; email: string };
    }
  }
}

const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
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

    const uid = user.id;

    const adminRecord = await AdminModel.findOne({ uid });

    if (!adminRecord) {
      res.status(403).json({ message: 'Forbidden: Admin access required' });
      return;
    }

    req.admin = adminRecord as Record<string, unknown>;
    req.uid = uid;
    req.user = {
      uid,
      email: user.email || '',
    };
    
    next();
  } catch (error: any) {
    console.error('isAdmin Middleware Error:', error.message);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

export default isAdmin;
