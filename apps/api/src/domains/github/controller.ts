import { AuthError, ValidationError } from '@servx/errors';

import {
  fetchRepoDetails,
  fetchRepos,
  getGithubToken,
  refreshGithubToken,
  updateCollaboratorRole as updateCollaboratorRoleService,
} from './service';
import { cacheGet, cacheSet } from '../../core/services/redisCache';

const REPOS_TTL = 45;       // 45 seconds
const DETAILS_TTL = 30;     // 30 seconds

function reposCacheKey(uid: string) { return `gh:repos:${uid}`; }
function detailsCacheKey(uid: string, owner: string, repo: string) { return `gh:details:${uid}:${owner}/${repo}`; }
export function userGhCachePattern(uid: string) { return `gh:*:${uid}*`; }

async function handleGithubRequest<T>(
  uid: string,
  requestFn: (token: string) => Promise<T>
): Promise<T> {
  const { accessToken, refreshToken, expiry } = await getGithubToken(uid);
  
  if (expiry && expiry.getTime() < Date.now() && refreshToken) {
    try {
      const newToken = await refreshGithubToken(uid, refreshToken);
      return await requestFn(newToken);
    } catch (refreshErr) {
      console.error(`[GitHub Auth] Pre-emptive refresh failed for user ${uid}:`, refreshErr);
    }
  }

  try {
    return await requestFn(accessToken);
  } catch (error: any) {
    if (error?.response?.status === 401 && refreshToken) {
      try {
        console.log(`[GitHub Auth] 401 detected for user ${uid}, attempting refresh...`);
        const newToken = await refreshGithubToken(uid, refreshToken);
        return await requestFn(newToken);
      } catch (refreshErr) {
        console.error(`[GitHub Auth] Refresh attempt failed after 401 for user ${uid}:`, refreshErr);
      }
    }
    throw error;
  }
}

export async function getRepos(req: any, res: any, next: any): Promise<void> {
  const uid = req.user?.uid;
  const forceRefresh = req.query?.refresh === '1' || req.query?.refresh === 'true';

  if (!uid) {
    next(new AuthError('Missing authenticated user context'));
    return;
  }

  try {
    const cached = !forceRefresh ? await cacheGet<any[]>(reposCacheKey(uid)) : null;
    if (cached) {
      res.json(cached);
      return;
    }

    const repos = await handleGithubRequest(uid, (token) => fetchRepos(token));
    await cacheSet(reposCacheKey(uid), repos, REPOS_TTL);
    res.json(repos);
  } catch (error) {
    next(error);
  }
}

export async function getRepoDetails(req: any, res: any, next: any): Promise<void> {
  const uid = req.user?.uid;
  const forceRefresh = req.query?.refresh === '1' || req.query?.refresh === 'true';

  if (!uid) {
    next(new AuthError('Missing authenticated user context'));
    return;
  }

  const owner = req.params?.owner as string;
  const repo = req.params?.repo as string;

  try {
    const cacheKey = detailsCacheKey(uid, owner, repo);
    const cached = !forceRefresh ? await cacheGet<any>(cacheKey) : null;
    if (cached) {
      res.json(cached);
      return;
    }

    const result = await handleGithubRequest(uid, (token) => fetchRepoDetails(token, owner, repo));
    await cacheSet(cacheKey, result, DETAILS_TTL);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Link a GitHub App installation_id to the authenticated user.
 */
export async function linkInstallation(req: any, res: any): Promise<void> {
  const { installation_id } = req.body;
  const ownerUid = req.user.uid;

  if (!installation_id) {
    throw new ValidationError('installation_id is required');
  }

  // Find or create a GitHub connection for this user
  let connection = await UserConnection.findOne({ ownerUid, provider: 'GitHub' });

  if (connection) {
    connection.installationId = installation_id;
    connection.status = 'connected';
    await connection.save();
  } else {
    connection = await UserConnection.create({
      name: 'GitHub App Main',
      provider: 'GitHub',
      ownerUid,
      installationId: installation_id,
      status: 'connected',
      iv: 'managed-by-app', // Placeholder for app-managed connections
      encryptedConfig: 'null'
    });
  }

  res.json({ success: true, connectionId: connection._id });
}

export async function getGitHubStatus(req: any, res: any, next: any): Promise<void> {
  const uid = req.user?.uid;

  if (!uid) {
    next(new AuthError('Missing authenticated user context'));
    return;
  }

  try {
    const { accessToken, expiry } = await getGithubToken(uid);
    const isExpired = expiry ? expiry.getTime() < Date.now() : false;
    res.json({ connected: true, tokenPresent: !!accessToken, expired: isExpired });
  } catch (error: any) {
    if (error?.message?.includes('not connected') || error?.message?.includes('not found')) {
      res.json({ connected: false, tokenPresent: false, expired: false });
      return;
    }
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
    await handleGithubRequest(uid, (token) => 
      updateCollaboratorRoleService(token, repoName, githubUsername, status)
    );
    const permission = status === 'locked' ? 'pull' : 'push';

    res.json({
      success: true,
      message: `Successfully updated ${githubUsername} to ${permission} access.`,
    });
  } catch (error) {
    next(error);
  }
}
