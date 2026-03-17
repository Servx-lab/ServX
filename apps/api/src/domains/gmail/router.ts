import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getGmailStatus,
  getInbox,
} from './controller';

const router = Router();

router.get('/auth/google/url', requireAuth, getGoogleAuthUrl);
router.get('/auth/google/callback', handleGoogleCallback);
router.get('/gmail/status', requireAuth, getGmailStatus);
router.get('/gmail/inbox', requireAuth, getInbox);

export default router;
