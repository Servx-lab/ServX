import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';

import {
  createConnection,
  listConnections,
  deleteConnection,
  getHostingStatus,
  getHostingEnvForService,
  saveHostingConnection,
} from './controller';

const router = Router();

// Generic connections
router.post('/', requireAuth, createConnection);
router.get('/', requireAuth, listConnections);
router.delete('/:id', requireAuth, deleteConnection);

// Hosting provider routes (generic)
router.get('/hosting/:provider/env/:serviceId', requireAuth, getHostingEnvForService);
router.get('/hosting/:provider/status', requireAuth, getHostingStatus);
router.post('/hosting/:provider', requireAuth, saveHostingConnection);

// Legacy Vercel aliases — delegate to the same handlers with provider forced to 'vercel'
router.get('/vercel/status', requireAuth, (req, res, next) => {
  (req.params as Record<string, string>).provider = 'vercel';
  getHostingStatus(req as any, res, next);
});
router.post('/vercel', requireAuth, (req, res, next) => {
  (req.params as Record<string, string>).provider = 'vercel';
  saveHostingConnection(req as any, res, next);
});

export default router;
