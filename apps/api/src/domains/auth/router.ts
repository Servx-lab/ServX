import { Router } from 'express';

import requireAuth from '../../../middleware/requireAuth';
import {
  disconnectGitHub,
  getGitHubAuthUrl,
  handleGitHubCallback,
  listUsers,
  redirectToGitHub,
  searchUsers,
  syncUser,
} from './controller';

const router = Router();

router.get('/github/url', requireAuth, getGitHubAuthUrl);
router.get('/github', requireAuth, redirectToGitHub);
router.get('/github/callback', handleGitHubCallback);
router.post('/sync', requireAuth, syncUser);
router.post('/github/disconnect', requireAuth, disconnectGitHub);
router.get('/users/search', searchUsers);
router.get('/users/list', listUsers);

export default router;
