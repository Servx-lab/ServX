import { Router } from 'express';
import requireAuth from '../../core/middleware/requireAuth';
import {
  listenRequests,
  listenApproval,
  approveDevice,
  listDevices,
  revokeDevice
} from './controller';

const router = Router();

// SSE Channels
router.get('/listen-requests', requireAuth, listenRequests);
router.get('/listen-approval/:fingerprint', requireAuth, listenApproval);

// Standard endpoints
router.get('/', requireAuth, listDevices);
router.delete('/:id', requireAuth, revokeDevice);

// Action mutations
router.post('/approve', requireAuth, approveDevice);

export default router;
