import type { Request, Response, NextFunction } from 'express';

import admin from '../../../utils/firebaseAdmin';

const AdminModel = require('../../../models/Admin');

declare global {
  namespace Express {
    interface Request {
      admin?: Record<string, unknown>;
      uid?: string;
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
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid as string;

    const adminRecord = await AdminModel.findOne({ uid });

    if (!adminRecord) {
      res.status(403).json({ message: 'Forbidden: Admin access required' });
      return;
    }

    req.admin = adminRecord as Record<string, unknown>;
    req.uid = uid;
    next();
  } catch (error) {
    console.error('isAdmin Middleware Error:', (error as Error).message);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

export default isAdmin;
