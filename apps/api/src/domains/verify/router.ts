import { Router } from 'express';
import * as verifyController from './controller';

const router = Router();

// CLI Handshake Endpoints
router.post('/ping', verifyController.verifyPing);
router.post('/env', verifyController.verifyEnv);
router.get('/sse-test', verifyController.verifySseTest);

// Dashboard Live Status Listener
router.get('/status/:pin', verifyController.getVerifyStatus);

export default router;
