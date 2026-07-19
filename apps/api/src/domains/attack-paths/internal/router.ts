import { Router } from 'express';
import { requireExecutorServiceAuth } from '../services/serviceAuth';
import {
  completeRemoteJob,
  failRemoteJob,
  getRemoteJobInput,
  updateRemoteJobProgress,
} from './controller';

const router = Router();

router.use(requireExecutorServiceAuth);
router.get('/jobs/:jobId/input', getRemoteJobInput);
router.post('/jobs/:jobId/progress', updateRemoteJobProgress);
router.post('/jobs/:jobId/complete', completeRemoteJob);
router.post('/jobs/:jobId/fail', failRemoteJob);

export default router;
