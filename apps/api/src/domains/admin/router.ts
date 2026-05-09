import { Router } from 'express';

import isAdmin from '../../core/middleware/isAdmin';
import {
  inviteAdmin,
  listAdmins,
  revokeAdmin,
  getPermissions,
  updatePermissions,
  getResources,
} from './controller';

const router = Router();

router.use(isAdmin);

router.post('/invite', inviteAdmin);
router.get('/list', listAdmins);
router.delete('/revoke/:id', revokeAdmin);
router.get('/permissions/:userId', getPermissions);
router.post('/permissions/update', updatePermissions);
router.get('/resources', getResources);

export default router;
