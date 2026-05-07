import { Router } from 'express';
<<<<<<< HEAD
import { scanTarget, listGroups, saveGroup, deleteGroup } from './controller';
import requireAuth from '../../core/middleware/requireAuth';

const router = Router();

// Scanning
router.post('/scan-target', requireAuth, scanTarget);

// Project Groups
router.get('/groups', requireAuth, listGroups);
router.post('/groups', requireAuth, saveGroup);
router.delete('/groups/:id', requireAuth, deleteGroup);
=======

import requireAuth from '../../core/middleware/requireAuth';
import requireRepoEditorOrAdmin from '../../core/middleware/requireRepoEditorOrAdmin';
import { getRepositoryVulnerabilities, saveInstallationToken } from './controller';

const router = Router();

router.post('/installation-token', requireAuth, saveInstallationToken);

router.get(
  '/vulnerabilities/:owner/:repo',
  requireAuth,
  requireRepoEditorOrAdmin,
  getRepositoryVulnerabilities
);
>>>>>>> fork/supabase

export default router;
