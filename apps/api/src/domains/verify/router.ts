import { Router } from 'express';
import * as verifyController from './controller';

const router = Router();

// CLI Handshake Endpoints
router.post('/auth', verifyController.verifyAuth);
router.post('/env', verifyController.verifyEnv);
router.get('/stream', verifyController.verifyStream);

// Dashboard Live Status Listener
router.get('/status/:pin', verifyController.getVerifyStatus);

export default router;
