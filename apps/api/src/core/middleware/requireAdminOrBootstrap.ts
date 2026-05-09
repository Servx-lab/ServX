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
      console.log(`[requireAdminOrBootstrap] Bootstrapping admin access for system owner: ${userEmail}`);
      adminRecord = {
        id,
        email: userEmail,
        role: 'owner',
      };
    }

    if (adminRecord) {
      req.admin = adminRecord as Record<string, unknown>;
      req.id = id;
      console.log(`[AdminOrBootstrap] Access GRANTED via Admin Record | User: ${userEmail}`);
      next();
      return;
    }

    // Fallback 2: Bootstrap mode if no admins exist at all
    const count = await AdminModel.countDocuments();
    if (count === 0) {
      console.log(`[requireAdminOrBootstrap] System is in Bootstrap mode (0 admins). Granting access to: ${userEmail}`);
      req.id = id;
      next();
      return;
    }

    console.warn(`[AdminOrBootstrap] Access DENIED | User: ${userEmail} | Admin Count: ${count} | Env Match: ${isEnvAdmin}`);
    res.status(403).json({ message: 'Forbidden: Admin access required' });
  } catch (error) {
    next(error);
  }
};


export default requireAdminOrBootstrap;
