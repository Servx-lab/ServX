import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';
import requireAdminOrBootstrap from '../../core/middleware/requireAdminOrBootstrap';
import { getUserSearch } from './controller';

const router = Router();

router.get('/search', requireAuth, requireAdminOrBootstrap, getUserSearch);

export default router;
