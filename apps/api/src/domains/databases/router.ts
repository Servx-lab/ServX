import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';

import { 
  listDatabases, 
  listCollections, 
  listDocuments, 
  testConnection, 
  getStats 
} from './controller';

const router = Router();

// Backward-compatible routes
router.get('/explore/databases', requireAuth, listDatabases);
router.get('/explore/collections', requireAuth, listCollections);
router.post('/explore/documents', requireAuth, listDocuments);

// New adapter-aware / generic routes
router.get('/explore/tables', requireAuth, listCollections); // Aliased for now
router.post('/explore/rows', requireAuth, listDocuments); // Aliased for now
router.post('/test-connection', requireAuth, testConnection);
router.get('/stats', requireAuth, getStats);

export default router;
