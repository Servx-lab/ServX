import type { Request, Response, NextFunction } from 'express';

const AdminModel = require('../../../models/Admin');

/**
 * After requireAuth: allow if the user is in the Admin collection, or if there are
 * no admins yet (bootstrap — first deployment so someone can search/invite the first team).
 */
const requireAdminOrBootstrap = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const id = req.user?.id;
  if (!id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const userEmail = (req.user?.email || '').toLowerCase();
    let adminRecord = await AdminModel.findOne({ id });

    // Fallback 1: Check if user is among the system admins defined in .env
    const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
    const isEnvAdmin = userEmail && adminEmails.includes(userEmail);
    
    if (!adminRecord && isEnvAdmin) {
      adminRecord = {
        id,
        email: userEmail,
        role: 'owner',
      };
    }

    if (adminRecord) {
      req.admin = adminRecord as Record<string, unknown>;
      req.id = id;
      next();
      return;
    }

    // Fallback 2: Bootstrap mode if no admins exist at all
    const count = await AdminModel.countDocuments();
    if (count === 0) {
      req.id = id;
      next();
      return;
    }

    res.status(403).json({ message: 'Forbidden: Admin access required' });
  } catch (error) {
    next(error);
  }
};


export default requireAdminOrBootstrap;
