import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import { ValidationError, NotFoundError } from '@servx/errors';

import * as db from './service';

interface AuthenticatedRequest extends Request {
  user: { uid: string };
}

export async function listDatabases(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { connectionId } = req.query as { connectionId?: string };
    if (!connectionId) {
      throw new ValidationError('connectionId is required');
    }
    if (!mongoose.isValidObjectId(connectionId)) {
      throw new ValidationError('connectionId is not a valid identifier');
    }

    const connectionString = await db.getConnectionString(connectionId, req.user.uid);
    const databases = await db.listDatabases(connectionString);
    res.json({ databases });
  } catch (err) {
    next(err);
  }
}

export async function listCollections(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { connectionId, dbName } = req.query as { connectionId?: string; dbName?: string };
    if (!connectionId || !dbName) {
      throw new ValidationError('connectionId and dbName are required');
    }
    if (!mongoose.isValidObjectId(connectionId)) {
      throw new ValidationError('connectionId is not a valid identifier');
    }

    const connectionString = await db.getConnectionString(connectionId, req.user.uid);
    const collections = await db.listCollections(connectionString, dbName);
    res.json({ collections });
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { connectionId, dbName, collectionName } = req.body as {
      connectionId?: string;
      dbName?: string;
      collectionName?: string;
    };
    if (!connectionId || !dbName || !collectionName) {
      throw new ValidationError('connectionId, dbName, and collectionName are required');
    }
    if (!mongoose.isValidObjectId(connectionId)) {
      throw new ValidationError('connectionId is not a valid identifier');
    }

    const connectionString = await db.getConnectionString(connectionId, req.user.uid);
    const documents = await db.listDocuments(connectionString, dbName, collectionName);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}
