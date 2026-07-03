import type { Request, Response, NextFunction } from 'express';

import { getAttackPathsJobById } from '../services/attackPathsJobService';

/**
 * Authorize access to an attack-paths job.
 * Rules (v1):
 * - job must exist
 * - job.requestedBy must match req.user.id
 */
export default async function requireAttackJobAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const jobId = String(req.params.jobId || '');
    if (!jobId) {
      res.status(400).json({ error: 'BadRequest', message: 'Missing jobId' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing authenticated user' });
      return;
    }

    const job = await getAttackPathsJobById(jobId);
    if (!job) {
      res.status(404).json({ error: 'NotFound', message: 'Attack paths job not found' });
      return;
    }

    if (String(job.requestedBy) !== String(userId)) {
      res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this job' });
      return;
    }

    next();
  } catch (err: any) {
    res.status(500).json({
      error: 'ServerError',
      message: err?.message || 'Failed to authorize job access',
    });
  }
}
