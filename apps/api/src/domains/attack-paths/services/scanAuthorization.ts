import { ForbiddenError, ValidationError } from '@servx/errors';
import { getEffectivePermissions } from '../../admin/service';
import { fetchRepos, getGithubToken } from '../../github/service';

export async function assertScanRepositoryAccess(params: {
  userId: string;
  repoId: string;
  repoFullName: string;
}): Promise<void> {
  const repoId = String(params.repoId).trim();
  const repoFullName = params.repoFullName.trim();
  if (!repoId || !repoFullName) throw new ValidationError('Repository selection is required.');

  const permissions = await getEffectivePermissions(params.userId, params.userId);
  if (!permissions.global.canAccessGithub && !permissions.global.isFullControl) {
    throw new ForbiddenError('GitHub access is disabled for your account.');
  }

  if (permissions.granularAllow?.repoKeys && !permissions.global.isFullControl) {
    if (!permissions.granularAllow.repoKeys.includes(repoFullName)) {
      throw new ForbiddenError('You are not allowed to scan this repository.');
    }
  }

  const { accessToken } = await getGithubToken(params.userId);
  const repositories = await fetchRepos(accessToken);
  const allowed = repositories.some((repo) => String(repo.id) === repoId && repo.full_name === repoFullName);
  if (!allowed) throw new ForbiddenError('This repository is no longer available through your GitHub connection.');
}
