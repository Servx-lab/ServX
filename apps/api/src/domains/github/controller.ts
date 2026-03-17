import { AuthError, ValidationError } from '@servx/errors';

import {
  clearInvalidToken,
  fetchRepoDetails,
  fetchRepos,
  getGithubToken,
  updateCollaboratorRole as updateCollaboratorRoleService,
} from './service';

export async function getRepos(req: any, res: any, next: any): Promise<void> {
  const uid = req.user?.uid;

  if (!uid) {
    next(new AuthError('Missing authenticated user context'));
    return;
  }

  try {
    const token = await getGithubToken(uid);
    const repos = await fetchRepos(token);
    res.json(repos);
  } catch (error: any) {
    if (error?.response?.status === 401) {
      try {
        await clearInvalidToken(uid);
      } catch (dbErr: any) {
        console.error('[GitHub Auth] Failed to clear invalid token from DB:', dbErr.message);
      }
      next(new AuthError('GitHub token invalid or expired.'));
      return;
    }

    next(error);
  }
}

export async function getRepoDetails(req: any, res: any, next: any): Promise<void> {
  const uid = req.user?.uid;

  if (!uid) {
    next(new AuthError('Missing authenticated user context'));
    return;
  }

  const owner = req.params?.owner as string;
  const repo = req.params?.repo as string;

  try {
    const token = await getGithubToken(uid);
    const details = await fetchRepoDetails(token, owner, repo);
    res.json({ details });
  } catch (error) {
    next(error);
  }
}

export async function updateCollaboratorRole(req: any, res: any, next: any): Promise<void> {
  const uid = req.user?.uid;

  if (!uid) {
    next(new AuthError('Missing authenticated user context'));
    return;
  }

  const { repoName, githubUsername, status } = req.body || {};

  if (!repoName || !githubUsername || !status) {
    next(new ValidationError('Missing required fields'));
    return;
  }

  try {
    const token = await getGithubToken(uid);
    await updateCollaboratorRoleService(token, repoName, githubUsername, status);
    const permission = status === 'locked' ? 'pull' : 'push';

    res.json({
      success: true,
      message: `Successfully updated ${githubUsername} to ${permission} access.`,
    });
  } catch (error) {
    next(error);
  }
}
