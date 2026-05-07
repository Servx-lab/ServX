import { Router } from 'express';
import requireAuth from '../../core/middleware/requireAuth';
import requireRepoEditorOrAdmin from '../../core/middleware/requireRepoEditorOrAdmin';
import { 
  scanTarget, 
  listGroups, 
  saveGroup, 
  deleteGroup,
  getRepositoryVulnerabilities,
  saveInstallationToken 
} from './controller';

const router = Router();

// Scanning
router.post('/scan-target', requireAuth, scanTarget);

// GitHub Security
router.post('/installation-token', requireAuth, saveInstallationToken);
router.get(
  '/vulnerabilities/:owner/:repo',
  requireAuth,
  requireRepoEditorOrAdmin,
  getRepositoryVulnerabilities
);

// Project Groups
router.get('/groups', requireAuth, listGroups);
router.post('/groups', requireAuth, saveGroup);
router.delete('/groups/:id', requireAuth, deleteGroup);

export default router;
