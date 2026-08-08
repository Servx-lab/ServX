import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';

import { getSummary, listFindings, listAssets, startScan, createAsset } from './controller';

const router = Router();

// All exposure routes are tenant-scoped and require authentication.
router.get('/summary', requireAuth, getSummary);
router.get('/findings', requireAuth, listFindings);
router.get('/assets', requireAuth, listAssets);
router.post('/assets', requireAuth, createAsset);
router.post('/scan', requireAuth, startScan);

export default router;
