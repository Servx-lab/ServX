import { Router } from 'express';
import requireAuth from '../../core/middleware/requireAuth';
import { 
  getProjects, 
  toggleMaintenance, 
  executeTask, 
  getLatestIncident 
} from './controller';

const router = Router();

// Infrastructure Routes
router.get('/projects', requireAuth, getProjects);
router.post('/toggle-maintenance', requireAuth, toggleMaintenance);
router.post('/tasks/execute', requireAuth, executeTask);

// Auto-Medic Incident Routes
router.get('/incidents/latest', requireAuth, getLatestIncident);

// Alias so mounting this same router at /api/tasks preserves POST /api/tasks/execute.
router.post('/execute', requireAuth, executeTask);

export default router;
