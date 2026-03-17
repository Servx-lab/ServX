import { Router } from 'express';

import isAdmin from 'core/middleware/isAdmin';
import {
  inviteAdmin,
  listAdmins,
  revokeAdmin,
  getPermissions,
  updatePermissions,
  updateWorkspaceLogo,
  getResources,
} from './controller';

const router = Router();

router.post('/invite', inviteAdmin);
router.get('/list', listAdmins);
router.delete('/revoke/:uid', revokeAdmin);
router.get('/permissions/:userUid', isAdmin, getPermissions);
router.post('/permissions/update', isAdmin, updatePermissions);
router.post('/workspace/logo', isAdmin, updateWorkspaceLogo);
router.get('/resources', isAdmin, getResources);

export default router;
