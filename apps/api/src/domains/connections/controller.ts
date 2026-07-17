import type { Request, Response, NextFunction } from 'express';

import { ValidationError, NotFoundError } from '@servx/errors';
import { HOSTING_PROVIDERS } from '@servx/config';
import type { UserConnectionProvider } from '@servx/types';

import * as svc from './service';
import { getEffectivePermissions } from '../admin/service';
import { ForbiddenError } from '@servx/errors';



function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

// POST /api/connections
export async function createConnection(
  req: any,
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

    const result = await svc.saveConnection(req.user.uid, req.user.email, name, provider, config);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/connections
export async function listConnections(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const uid = req.user.uid;
    const perms = await getEffectivePermissions(uid, uid);

    const connections = await svc.getUserConnections(uid);
    
    // Filter by category toggles first
    let filtered = connections;
    
    if (!perms.global.canAccessHosting && !perms.global.canAccessDatabases && !perms.global.isFullControl) {
      res.json([]);
      return;
    }

    filtered = connections.filter(c => {
      const isHosting = HOSTING_PROVIDERS[c.provider.toLowerCase()] != null;
      const isDb = !isHosting; // Assuming anything not hosting is DB for simplicity here

      if (isHosting && !perms.global.canAccessHosting) return false;
      if (isDb && !perms.global.canAccessDatabases) return false;

      // Then filter by granular allow lists if they exist
      if (perms.granularAllow) {
        if (isHosting && perms.granularAllow.serverIds) {
          return perms.granularAllow.serverIds.includes(c._id);
        }
        if (isDb && perms.granularAllow.databaseIds) {
          return perms.granularAllow.databaseIds.includes(c._id);
        }
      }

      return true;
    });

    res.json(filtered);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/connections/:id
export async function deleteConnection(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getSingleParam(req.params.id as string | string[] | undefined);
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

// PUT /api/connections/:id/alias
export async function updateConnectionAlias(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getSingleParam(req.params.id as string | string[] | undefined);
    const { alias } = req.body;
    
    if (!alias) {
        throw new ValidationError('Alias is required');
    }

    await svc.updateConnectionAlias(id, req.user.uid, alias);
    res.json({ message: 'Alias updated successfully' });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ code: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

// POST /api/connections/hosting/:id/avatar
export async function uploadAvatar(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = getSingleParam(req.params.id as string | string[] | undefined);
    
    if (!req.file || !req.file.buffer) {
      throw new ValidationError('No image file provided');
    }

    const result = await svc.uploadAvatar(id, req.user.uid, req.file.buffer);
    res.json({ message: 'Avatar updated successfully', avatarUrl: result.avatarUrl });
  } catch (err) {
    next(err);
  }
}

// GET /api/connections/hosting/:provider/list
export async function getHostingConnectionsList(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerKey = getSingleParam(req.params.provider as string | string[] | undefined).toLowerCase();
    if (!HOSTING_PROVIDERS[providerKey]) {
      throw new ValidationError(`Unknown hosting provider: ${providerKey}`);
    }
    const accounts = await svc.getHostingProviderAccountsList(req.user.uid, providerKey);
    res.json({ connected: accounts.length > 0, accounts });
  } catch (err) {
    next(err);
  }
}

// GET /api/connections/hosting/:provider/status
export async function getHostingStatus(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerKey = getSingleParam(req.params.provider as string | string[] | undefined).toLowerCase();
    if (!HOSTING_PROVIDERS[providerKey]) {
      throw new ValidationError(`Unknown hosting provider: ${providerKey}`);
    }
    const forceRefresh = req.query.refresh === 'true';
    const connectionId = getSingleParam(req.query.connectionId as string | string[] | undefined);
    const result = await svc.getHostingProviderStatus(req.user.uid, providerKey, forceRefresh, connectionId);
    // svc.getHostingProviderStatus handles cache internal to service, 
    // but we can infer MISS if the service logs a fetch. 
    // For now, we mark as HIT if it returns promptly and contains data, 
    // but better would be the service returning the status.
    // However, since service already logs hits/misses, we add a generic header.
    res.setHeader('X-Cache-Status', 'BYPASS_OR_HIT'); // Hosting status is multi-layered
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/connections/hosting/:provider/env/:serviceId
export async function getHostingEnvForService(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerKey = getSingleParam(req.params.provider as string | string[] | undefined).toLowerCase();
    const serviceId = getSingleParam(req.params.serviceId as string | string[] | undefined);
    const variables = await svc.getHostingEnvironmentVariables(req.user.uid, providerKey, serviceId);
    res.json({ variables });
  } catch (err) {
    next(err);
  }
}

// GET /api/connections/hosting/:provider/logs/:serviceId
export async function getHostingServiceLogs(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerKey = getSingleParam(req.params.provider as string | string[] | undefined).toLowerCase();
    const serviceId = getSingleParam(req.params.serviceId as string | string[] | undefined);
    const connectionId = getSingleParam(req.query.connectionId as string | string[] | undefined);
    const logs = await svc.getHostingLogs(req.user.uid, providerKey, serviceId, connectionId);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

// POST /api/connections/hosting/:provider
export async function saveHostingConnection(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerKey = getSingleParam(req.params.provider as string | string[] | undefined).toLowerCase();
    if (!HOSTING_PROVIDERS[providerKey]) {
      throw new ValidationError(`Unknown hosting provider: ${providerKey}`);
    }

    const { name, alias, token, edgeConfigId } = req.body as {
      name?: string;
      alias?: string;
      token?: string;
      edgeConfigId?: string;
    };
    const providerLabel = HOSTING_PROVIDERS[providerKey].label;

    if (!token) {
      throw new ValidationError(`${providerLabel} API key is required.`);
    }

    const connectionName = name || providerLabel;
    const connectionAlias = alias ? alias.trim() : 'Default';

    try {
      const result = await svc.saveHostingToken(req.user.uid, req.user.email, providerKey, connectionName, connectionAlias, token, {
        edgeConfigId,
      });
      const statusCode = result.message.includes('updated') ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (dbErr: any) {
      if (dbErr.code === '23505') { // Postgres duplicate key error
        throw new ValidationError(`An account with the name '${connectionAlias}' already exists. Please rename your existing key in the sidebar first.`);
      }
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
}

// DELETE /api/connections/hosting/:provider
export async function deleteHostingConnection(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const providerKey = getSingleParam(req.params.provider as string | string[] | undefined).toLowerCase();
    if (!HOSTING_PROVIDERS[providerKey]) {
      throw new ValidationError(`Unknown hosting provider: ${providerKey}`);
    }
    
    await svc.deleteHostingToken(req.user.uid, providerKey);
    res.json({ message: 'Hosting connection deleted successfully' });
  } catch (err) {
    next(err);
  }
}
