import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';

const AdminModel = require('../../../models/Admin');

declare global {
  namespace Express {
    interface Request {
      admin?: Record<string, unknown>;
      id?: string;
    }
  }
}

const isAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(idToken);
    
    if (error || !user) {
      res.status(401).json({ message: 'Unauthorized: Invalid token' });
      return;
    }

    const id = user.id;
    const adminRecord = await AdminModel.findOne({ id });

    if (!adminRecord) {
      res.status(403).json({ message: 'Forbidden: Admin access required' });
      return;
    }

    req.admin = adminRecord as Record<string, unknown>;
    req.id = id;
    next();
  } catch (error) {
    console.error('isAdmin Middleware Error:', (error as Error).message);
    res.status(401).json({ message: 'Unauthorized: Unexpected error' });
  }
};

export default isAdmin;

