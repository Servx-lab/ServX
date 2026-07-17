import { Router } from 'express';
import multer from 'multer';

import requireAuth from '../../core/middleware/requireAuth';

import {
  createConnection,
  listConnections,
  deleteConnection,
  updateConnectionAlias,
  getHostingStatus,
  getHostingEnvForService,
  saveHostingConnection,
  deleteHostingConnection,
  uploadAvatar,
} from './controller';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 }
});

const router = Router();

// Generic connections
router.post('/', requireAuth, createConnection);
router.get('/', requireAuth, listConnections);
router.delete('/:id', requireAuth, deleteConnection);
router.put('/:id/alias', requireAuth, updateConnectionAlias);
router.post('/:id/avatar', requireAuth, upload.single('avatar'), uploadAvatar);

// Hosting provider routes (generic)
router.get('/hosting/:provider/env/:serviceId', requireAuth, getHostingEnvForService);
router.get('/hosting/:provider/status', requireAuth, getHostingStatus);
router.post('/hosting/:provider', requireAuth, saveHostingConnection);
router.delete('/hosting/:provider', requireAuth, deleteHostingConnection);

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
