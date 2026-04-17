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
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const adminRecord = await AdminModel.findOne({ uid });
    if (adminRecord) {
      req.admin = adminRecord as Record<string, unknown>;
      req.uid = uid;
      next();
      return;
    }

    const count = await AdminModel.countDocuments();
    if (count === 0) {
      req.uid = uid;
      next();
      return;
    }

    res.status(403).json({ message: 'Forbidden: Admin access required' });
  } catch (error) {
    next(error);
  }
};

export default requireAdminOrBootstrap;
