import { Router } from 'express';
import requireAuth from '../../core/middleware/requireAuth';
import { 
  getProjects, 
  toggleMaintenance, 
  executeTask, 
  getLatestIncident,
  getAuditStream,
  assessTask,
  logClientEvent,
  getDefconState,
  setDefconState,
  getCircuits,
  toggleCircuit
} from './controller';

const router = Router();

// Infrastructure Routes
router.get('/projects', requireAuth, getProjects);
router.post('/toggle-maintenance', requireAuth, toggleMaintenance);
router.post('/tasks/execute', requireAuth, executeTask);

// DEFCON Threat Level Controls
router.get('/defcon', requireAuth, getDefconState);
router.post('/defcon', requireAuth, setDefconState);

// Granular Circuit Breakers Controls
router.get('/circuits', requireAuth, getCircuits);
router.post('/circuits/toggle', requireAuth, toggleCircuit);

// Auto-Medic Incident Routes
router.get('/incidents/latest', requireAuth, getLatestIncident);

// Live Audit SSE Stream (uses query param auth inside controller for SSE standard compatibility)
router.get('/audit/stream', getAuditStream);

// Task Pre-Flight Assessment
router.post('/tasks/assess', requireAuth, assessTask);

// Client-side Audit Event Logging
router.post('/audit/log', requireAuth, logClientEvent);

// Alias so mounting this same router at /api/tasks preserves POST /api/tasks/execute.
router.post('/execute', requireAuth, executeTask);

export default router;

