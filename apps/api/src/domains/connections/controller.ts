import type { Request, Response, NextFunction } from 'express';

import { ValidationError, NotFoundError } from '@servx/errors';
import { HOSTING_PROVIDERS } from '@servx/config';
import type { UserConnectionProvider } from '@servx/types';

import * as svc from './service';

interface AuthenticatedRequest extends Request {
  user: { uid: string };
}

// POST /api/connections
export async function createConnection(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, provider, config } = req.body as {
      name?: string;
      provider?: UserConnectionProvider;
      config?: Record<string, unknown>;
    };

    if (!name || !provider || !config) {
      throw new ValidationError('name, provider, and config are required');
    }

    // Firebase-specific input validation
    if (provider === 'Firebase') {
      const raw = config.serviceAccountJson as string | undefined;
      if (!raw) {
        throw new ValidationError('Service Account JSON is required for Firebase.');
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new ValidationError('Invalid Service Account JSON format.');
      }
      if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
        throw new ValidationError(
          'Service Account JSON missing required fields: project_id, private_key, client_email.'
        );
      }
    }

    const result = await svc.saveConnection(req.user.uid, name, provider, config);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/connections
export async function listConnections(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const connections = await svc.getUserConnections(req.user.uid);
    res.json(connections);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/connections/:id
export async function deleteConnection(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    await svc.deleteConnection(id, req.user.uid);
    res.json({ message: 'Connection deleted successfully' });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

// GET /api/connections/hosting/:provider/status
export async function getHostingStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerKey = req.params.provider.toLowerCase();
    if (!HOSTING_PROVIDERS[providerKey]) {
      throw new ValidationError(`Unknown hosting provider: ${providerKey}`);
    }
    const result = await svc.getHostingProviderStatus(req.user.uid, providerKey);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/connections/hosting/:provider
export async function saveHostingConnection(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerKey = req.params.provider?.toLowerCase() ?? '';
    if (!HOSTING_PROVIDERS[providerKey]) {
      throw new ValidationError(`Unknown hosting provider: ${providerKey}`);
    }

    const { name, token, edgeConfigId } = req.body as {
      name?: string;
      token?: string;
      edgeConfigId?: string;
    };
    const providerLabel = HOSTING_PROVIDERS[providerKey].label;

    if (!name || !token) {
      throw new ValidationError(`Connection name and ${providerLabel} API key are required.`);
    }

    const result = await svc.saveHostingToken(req.user.uid, providerKey, name, token, {
      edgeConfigId,
    });
    const statusCode = result.message.includes('updated') ? 200 : 201;
    res.status(statusCode).json(result);
  } catch (err) {
    next(err);
  }
}
