import { Router } from 'express';

import requireAuth from '../../core/middleware/requireAuth';
import * as controller from './controller';

const router = Router();

router.get('/status', requireAuth, controller.getGitHubStatus);
router.post('/link', requireAuth, controller.linkInstallation);
router.get('/repos', requireAuth, controller.getRepos);
router.get('/repos/:owner/:repo/details', requireAuth, controller.getRepoDetails);
router.post('/collaborator/role', requireAuth, controller.updateCollaboratorRole);

export default router;
