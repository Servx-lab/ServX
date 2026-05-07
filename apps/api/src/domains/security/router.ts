import { Router } from 'express';
import { scanTarget, listGroups, saveGroup, deleteGroup } from './controller';
import requireAuth from '../../core/middleware/requireAuth';

const router = Router();

// Scanning
router.post('/scan-target', requireAuth, scanTarget);

// Project Groups
router.get('/groups', requireAuth, listGroups);
router.post('/groups', requireAuth, saveGroup);
router.delete('/groups/:id', requireAuth, deleteGroup);

export default router;
