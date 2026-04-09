import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';
import { getProjects, toggleMaintenance, executeTask } from './controller';

const router = Router();

router.get('/projects', requireAuth, getProjects);
router.post('/toggle-maintenance', requireAuth, toggleMaintenance);
router.post('/tasks/execute', requireAuth, executeTask);

// Alias so mounting this same router at /api/tasks preserves POST /api/tasks/execute.
router.post('/execute', requireAuth, executeTask);

export default router;
