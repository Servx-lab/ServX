import { Router } from 'express';
import requireAuth from '../../core/middleware/requireAuth';
import {
  createAttackPathsJob,
  cancelAttackPathsJob,
  streamAttackPathsJobProgress,
  getAttackPathsJobResult,
  getLatestAttackPathsJobResult,
  getAttackPathsQuota,
  warmAttackPaths,
} from './controllers/attackPathsController';
import requireAttackJobAccess from './middleware/requireAttackJobAccess';

const router = Router();

/**
 * Create a new Attack Paths scan job.
 * POST /api/attack-paths/jobs
 */
router.post('/jobs', requireAuth, createAttackPathsJob);
router.post('/warmup', requireAuth, warmAttackPaths);
router.get('/quota', requireAuth, getAttackPathsQuota);
router.get('/jobs/latest', requireAuth, getLatestAttackPathsJobResult);

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

router.post(
  '/jobs/:jobId/cancel',
  requireAuth,
  requireAttackJobAccess,
  cancelAttackPathsJob
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
