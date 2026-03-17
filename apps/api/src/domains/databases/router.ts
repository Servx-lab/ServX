import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';

import { listDatabases, listCollections, listDocuments } from './controller';

const router = Router();

router.get('/explore/databases', requireAuth, listDatabases);
router.get('/explore/collections', requireAuth, listCollections);
router.post('/explore/documents', requireAuth, listDocuments);

export default router;
