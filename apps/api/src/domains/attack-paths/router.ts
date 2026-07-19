import { Router } from 'express';
import requireAuth from '../../core/middleware/requireAuth';
import {
  createAttackPathsJob,
  streamAttackPathsJobProgress,
  getAttackPathsJobResult,
} from './controllers/attackPathsController';
import requireAttackJobAccess from './middleware/requireAttackJobAccess';

const router = Router();

/**
 * Create a new Attack Paths scan job.
 * POST /api/attack-paths/jobs
 */
router.post('/jobs', requireAuth, createAttackPathsJob);

/**
 * Stream job progress via SSE.
 * GET /api/attack-paths/jobs/:jobId/stream
 */
router.get(
  '/jobs/:jobId/stream',
  requireAuth,
  requireAttackJobAccess,
  streamAttackPathsJobProgress
);

/**
 * Retrieve completed job results.
 * GET /api/attack-paths/jobs/:jobId
 */
router.get(
  '/jobs/:jobId',
  requireAuth,
  requireAttackJobAccess,
  getAttackPathsJobResult
);

export default router;
