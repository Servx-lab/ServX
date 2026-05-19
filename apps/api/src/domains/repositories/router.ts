import { Router } from 'express';
import requireAuth from '../../core/middleware/requireAuth';
import * as controller from './controller';

const router = Router();

// Dashboard UI specific endpoints
router.post('/', requireAuth, controller.registerRepository);
router.get('/', requireAuth, controller.getUserRepositories);
router.patch('/:pin/maintenance', requireAuth, controller.toggleMaintenance);

// Public SDK polling endpoint
router.get('/sdk/:pin/status', controller.getSdkMaintenanceStatus);

export default router;
