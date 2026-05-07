import type { Request, Response, NextFunction } from 'express';
<<<<<<< HEAD
import { supabaseAdmin } from '../../utils/supabaseAdmin';
=======
import { supabaseAdmin } from '../../../utils/supabaseAdmin';
>>>>>>> fork/supabase

const AdminModel = require('../../../models/Admin');

declare global {
  namespace Express {
    interface Request {
      admin?: Record<string, unknown>;
<<<<<<< HEAD
      uid?: string;
      user?: { uid: string; email: string };
=======
      id?: string;
>>>>>>> fork/supabase
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
<<<<<<< HEAD
    if (!supabaseAdmin) {
      throw new Error('Supabase Admin client not initialized');
    }

    const { data: { user }, error: supabaseError } = await supabaseAdmin.auth.getUser(token);
    
    if (supabaseError || !user) {
      throw new Error(supabaseError?.message || 'Invalid session');
    }

    const uid = user.id;
=======
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(idToken);
    
    if (error || !user) {
      res.status(401).json({ message: 'Unauthorized: Invalid token' });
      return;
    }
>>>>>>> fork/supabase

    const id = user.id;
    const adminRecord = await AdminModel.findOne({ id });

    if (!adminRecord) {
      res.status(403).json({ message: 'Forbidden: Admin access required' });
      return;
    }

    req.admin = adminRecord as Record<string, unknown>;
<<<<<<< HEAD
    req.uid = uid;
    req.user = {
      uid,
      email: user.email || '',
    };
    
    next();
  } catch (error: any) {
    console.error('isAdmin Middleware Error:', error.message);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
=======
    req.id = id;
    next();
  } catch (error) {
    console.error('isAdmin Middleware Error:', (error as Error).message);
    res.status(401).json({ message: 'Unauthorized: Unexpected error' });
>>>>>>> fork/supabase
  }
};

export default isAdmin;

