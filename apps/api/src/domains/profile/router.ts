import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';
import * as profileController from './controller';

const router = Router();

router.get('/', requireAuth, profileController.getProfile);
router.get('/cloudinary-signature', requireAuth, profileController.getCloudinarySignature);
router.put('/', requireAuth, profileController.updateProfile);
router.post('/send-email-otp', requireAuth, profileController.sendEmailOTP);
router.post('/verify-email', requireAuth, profileController.verifyEmail);

export default router;
