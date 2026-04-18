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

router.post('/invite', inviteAdmin);
router.get('/list', listAdmins);
router.delete('/revoke/:id', revokeAdmin);
router.get('/permissions/:userId', isAdmin, getPermissions);

router.post('/permissions/update', isAdmin, updatePermissions);
router.get('/resources', isAdmin, getResources);

export default router;
