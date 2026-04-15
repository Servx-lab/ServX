import type { Request, Response, NextFunction } from 'express';

import { ConflictError, NotFoundError, ValidationError } from '@servx/errors';

import {
  inviteUserAsAdmin,
  listAdmins as listAdminsService,
  revokeAdmin as revokeAdminService,
  getAdminPermissions,
  updateAdminPermissions,
  getAdminResources,
} from './service';
import type { AdminDoc, Permissions } from './types';

interface AdminRequest extends Request {
  uid: string;
  admin: AdminDoc;
}

export async function inviteAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, role } = req.body as { email?: string; role?: string };
    if (!email || !role) {
      throw new ValidationError('Email and role are required');
    }

    const admin = await inviteUserAsAdmin(email, role);
    res.status(201).json({ message: 'Admin invited successfully', admin });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
      next(error);
      return;
    }
    next(error);
  }
}

export async function listAdmins(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admins = await listAdminsService();
    res.json(admins);
  } catch (error) {
    next(error);
  }
}

export async function revokeAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { uid } = req.params as { uid: string };
    await revokeAdminService(uid);
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      next(error);
      return;
    }
    next(error);
  }
}

export async function getPermissions(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userUid } = req.params as { userUid: string };
    const ownerUid = req.uid;
    const permissions = await getAdminPermissions(ownerUid, userUid);
    res.json({ ownerUid, userUid, permissions });
  } catch (error) {
    next(error);
  }
}

export async function updatePermissions(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userUid, permissions } = req.body as { userUid: string; permissions: Permissions };
    const ownerUid = req.uid;
    const updated = await updateAdminPermissions(ownerUid, userUid, permissions);
    res.json({ ownerUid, userUid, permissions: updated });
  } catch (error) {
    next(error);
  }
}

export async function getResources(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const resources = await getAdminResources(req.admin);
    res.json(resources);
  } catch (error) {
    next(error);
  }
}
