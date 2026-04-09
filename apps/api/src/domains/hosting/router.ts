import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';

import {
  startVercelOAuth,
  handleVercelCallback,
  startDigitalOceanOAuth,
  handleDigitalOceanCallback,
  startRailwayOAuth,
} from './controller';

const router = Router();

// Vercel — auth required to start; callback comes from external redirect (no auth)
router.get('/vercel', requireAuth, startVercelOAuth);
router.get('/vercel/callback', handleVercelCallback);

// DigitalOcean
router.get('/digitalocean', startDigitalOceanOAuth);
router.get('/digitalocean/callback', handleDigitalOceanCallback);

// Railway
router.get('/railway', startRailwayOAuth);

export default router;
