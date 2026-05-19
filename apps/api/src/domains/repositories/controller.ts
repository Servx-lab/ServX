import type { Response, NextFunction } from 'express';
import { ValidationError } from '@servx/errors';
import * as repoService from './service';

export async function registerRepository(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { githubRepoId, githubRepoFullName } = req.body;
    if (!githubRepoId || !githubRepoFullName) {
      throw new ValidationError('Missing githubRepoId or githubRepoFullName');
    }

    const result = await repoService.registerRepository(req.user.uid, String(githubRepoId), githubRepoFullName);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function toggleMaintenance(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pin } = req.params;
    const { isMaintenance } = req.body;

    if (!pin || typeof isMaintenance !== 'boolean') {
      throw new ValidationError('Missing PIN or isMaintenance boolean');
    }

    await repoService.toggleMaintenance(req.user.uid, pin, isMaintenance);
    res.json({ success: true, message: `Maintenance mode ${isMaintenance ? 'enabled' : 'disabled'} for repository.` });
  } catch (err) {
    next(err);
  }
}

export async function getSdkMaintenanceStatus(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { pin } = req.params;
    if (!pin) {
       throw new ValidationError('Missing SERVX_PIN');
    }

    const isMaintenance = await repoService.checkMaintenance(pin);
    
    // Disable caching for live SDK updates
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    res.json({ isMaintenance });
  } catch (err) {
    next(err);
  }
}

export async function getUserRepositories(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const repos = await repoService.getUserRepositories(req.user.uid);
    res.json({ success: true, repositories: repos });
  } catch (err) {
    next(err);
  }
}
