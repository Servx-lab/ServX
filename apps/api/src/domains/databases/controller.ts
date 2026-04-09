import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import { ValidationError } from '@servx/errors';
import * as db from './service';
import { resolveAdapter } from './adapters';

interface AuthenticatedRequest extends Request {
  user: { uid: string; email: string; [key: string]: any };
}

// Helper to get initialized adapter
async function getAdapter(connectionId: string, ownerUid: string) {
  if (!connectionId) {
    throw new ValidationError('connectionId is required');
  }
  if (!mongoose.isValidObjectId(connectionId)) {
    throw new ValidationError('connectionId is not a valid identifier');
  }
  const { provider, config } = await db.getDecryptedConfig(connectionId, ownerUid);
  return resolveAdapter(provider, config);
}

export async function listDatabases(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { connectionId } = req.query as { connectionId?: string };
    const adapter = await getAdapter(connectionId!, req.user.uid);
    const databases = await adapter.listDatabases();
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
    if (!dbName) throw new ValidationError('dbName is required');
    
    // We alias collections to tables in the response for backward compatibility,
    // though the new adapter returns 'tables' semantically. We'll return it as collections
    // for now and let the frontend adapt, or we can just send it as collections.
    const adapter = await getAdapter(connectionId!, req.user.uid);
    const result = await adapter.listTables(dbName);
    
    // Map to just names if it's an array of strings natively, else map the object name
    const collections = result.map((t: any) => typeof t === 'string' ? t : t.name);
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
    if (!dbName || !collectionName) {
      throw new ValidationError('dbName and collectionName are required');
    }

    const adapter = await getAdapter(connectionId!, req.user.uid);
    const documents = await adapter.queryRows(dbName, collectionName);
    
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}

export async function testConnection(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { connectionId, provider, config } = req.body as { 
      connectionId?: string; 
      provider?: string; 
      config?: Record<string, unknown> 
    };
    
    let adapter;
    if (connectionId) {
      adapter = await getAdapter(connectionId, req.user.uid);
    } else if (provider && config) {
      adapter = resolveAdapter(provider as any, config);
    } else {
      throw new ValidationError('Either connectionId or provider/config must be provided');
    }

    const start = Date.now();
    await adapter.ping();
    const latencyMs = Date.now() - start;
    
    res.json({ ok: true, latencyMs });
  } catch (err: any) {
    res.json({ ok: false, message: err.message || 'Connection failed' });
  }
}

export async function getStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { connectionId } = req.query as { connectionId?: string };
    const adapter = await getAdapter(connectionId!, req.user.uid);
    
    if (adapter.getStats) {
      const stats = await adapter.getStats();
      res.json({ stats });
    } else {
      res.json({ stats: null });
    }
  } catch (err) {
    next(err);
  }
}
