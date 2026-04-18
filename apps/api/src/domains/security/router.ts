import { Router } from 'express';

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

export default router;
