import { AuthError, ValidationError } from '@servx/errors';

import {
  fetchRepoDetails,
  fetchRepos,
  getGithubToken,
  refreshGithubToken,
  updateCollaboratorRole as updateCollaboratorRoleService,
} from './service';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { cacheGet, cacheSet } from '../../core/services/redisCache';

const REPOS_TTL = 45;       // 45 seconds
const DETAILS_TTL = 30;     // 30 seconds

function reposCacheKey(uid: string) { return `gh:repos:${uid}`; }
function detailsCacheKey(uid: string, owner: string, repo: string) { return `gh:details:${uid}:${owner}/${repo}`; }
export function userGhCachePattern(uid: string) { return `gh:*:${uid}*`; }

import { getEffectivePermissions } from '../admin/service';
import { ForbiddenError } from '@servx/errors';

const pendingRefreshes = new Map<string, Promise<string>>();

async function handleGithubRequest<T>(
  uid: string,
  requestFn: (token: string) => Promise<T>
): Promise<T> {
  const { accessToken, refreshToken, expiry } = await getGithubToken(uid);
  
  if (expiry && expiry.getTime() < Date.now() && refreshToken) {
    let newToken: string | undefined;
    try {
      if (pendingRefreshes.has(uid)) {
        console.log(`[GitHub Auth] Re-using existing pre-emptive refresh process for user ${uid}...`);
        newToken = await pendingRefreshes.get(uid)!;
      } else {
        const refreshPromise = refreshGithubToken(uid, refreshToken);
        pendingRefreshes.set(uid, refreshPromise);
        try {
          newToken = await refreshPromise;
        } finally {
          pendingRefreshes.delete(uid);
        }
      }
    } catch (refreshErr) {
      console.error(`[GitHub Auth] Pre-emptive refresh failed for user ${uid}:`, refreshErr);
    }

    if (newToken) {
      return await requestFn(newToken);
    }
  }

  try {
    return await requestFn(accessToken);
  } catch (error: any) {
    if ((error?.response?.status === 401 || error?.status === 401) && refreshToken) {
      try {
        console.log(`[GitHub Auth] 401 detected for user ${uid}, attempting refresh...`);
        let newToken: string;
        if (pendingRefreshes.has(uid)) {
          console.log(`[GitHub Auth] Re-using existing refresh process for user ${uid}...`);
          newToken = await pendingRefreshes.get(uid)!;
        } else {
          const refreshPromise = refreshGithubToken(uid, refreshToken);
          pendingRefreshes.set(uid, refreshPromise);
          try {
            newToken = await refreshPromise;
          } finally {
            pendingRefreshes.delete(uid);
          }
        }
        return await requestFn(newToken);
      } catch (refreshErr: any) {
        console.error(`[GitHub Auth] Refresh attempt failed after 401 for user ${uid}:`, refreshErr);
        throw new AuthError(`GitHub authentication failed: ${refreshErr?.message || 'Token refresh failed'}`);
      }
    }
    if (error?.response?.status === 401 || error?.status === 401) {
      throw new AuthError('GitHub authentication failed: Token is invalid or expired.');
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
    // 1. Check Permissions (Master Toggle)
    const perms = await getEffectivePermissions(uid, uid); 
    if (!perms.global.canAccessGithub && !perms.global.isFullControl) {
      throw new ForbiddenError('GitHub access is disabled for your account');
    }

    // 2. Check Cache
    const cached = !forceRefresh ? await cacheGet<any[]>(reposCacheKey(uid)) : null;
    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      res.json(cached);
      return;
    }

    // 3. Fetch Fresh
    const repos = await handleGithubRequest(uid, (token) => fetchRepos(token));

    // 4. Filter by Granular Allow List (only if not full control admin)
    let filtered = repos;
    if (perms.granularAllow && perms.granularAllow.repoKeys && !perms.global.isFullControl) {
      const allowed = new Set(perms.granularAllow.repoKeys);
      filtered = repos.filter(r => allowed.has(r.full_name));
    }

    await cacheSet(reposCacheKey(uid), filtered, REPOS_TTL);
    res.setHeader('X-Cache-Status', 'MISS');
    res.json(filtered);
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
      res.setHeader('X-Cache-Status', 'HIT');
      res.json(cached);
      return;
    }

    const result = await handleGithubRequest(uid, (token) => fetchRepoDetails(token, owner, repo));
    await cacheSet(cacheKey, result, DETAILS_TTL);
    res.setHeader('X-Cache-Status', 'MISS');
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

  // Link a GitHub App installation_id to the authenticated user in Supabase
  const { error } = await supabaseAdmin
    .from('github_vault')
    .upsert({
      user_id: ownerUid,
      installation_id: installation_id,
      status: 'connected',
      iv: '', // Matches schema requirement
      encrypted_access_token: 'managed-by-app', // Placeholder for app-managed connections
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('[GitHub] Failed to link installation:', error.message);
    res.status(500).json({ success: false, message: 'Failed to link GitHub App' });
    return;
  }

  res.json({ success: true, message: 'GitHub App linked successfully' });
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
