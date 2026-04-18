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
  user: {
    id: string;
    email: string;
  };
  admin: any;
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
    const { id } = req.params as { id: string };
    await revokeAdminService(id);
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      next(error);
      return;
    }
    next(error);
  }
}

export async function getPermissions(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params as { userId: string };
    const ownerId = req.user.id;
    const permissions = await getAdminPermissions(ownerId, userId);
    res.json({ ownerId, userId, permissions });
  } catch (error) {
    next(error);
  }
}

export async function updatePermissions(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, permissions } = req.body as { userId: string; permissions: Permissions };
    const ownerId = req.user.id;
    const updated = await updateAdminPermissions(ownerId, userId, permissions);
    res.json({ ownerId, userId, permissions: updated });
  } catch (error) {
    next(error);
  }
}

export async function getResources(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const resources = await getAdminResources(req.admin);
    res.json(resources);
  } catch (error) {
    next(error);
  }
}
