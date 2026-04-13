import axios from 'axios';
import { Octokit } from '@octokit/rest';

import { AuthError, ForbiddenError, NotFoundError, ValidationError } from '@servx/errors';
import type { RepoDetails, RepoSummary } from '@servx/types';

import User from './model';
import { cacheDelPattern } from '../../core/services/redisCache';

export async function getGithubToken(uid: string): Promise<{ accessToken: string; refreshToken?: string; expiry?: Date }> {
  const user = await User.findOne({ uid }).select('+githubAccessToken +githubRefreshToken +githubTokenExpiry');

  if (!user) {
    throw new NotFoundError('User record not found in database.');
  }

  if (!user.githubAccessToken) {
    throw new AuthError('GitHub account not connected.');
  }

  return {
    accessToken: user.githubAccessToken as string,
    refreshToken: user.githubRefreshToken as string,
    expiry: user.githubTokenExpiry as Date,
  };
}

export async function clearInvalidToken(uid: string): Promise<void> {
  await User.findOneAndUpdate(
    { uid }, 
    { $unset: { githubAccessToken: '', githubRefreshToken: '', githubTokenExpiry: '' } }
  );
}

export async function refreshGithubToken(uid: string, refreshToken: string): Promise<string> {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error('GitHub Client credentials not configured on server.');
  }

  try {
    console.log(`[GitHub Auth] Attempting token refresh for user ${uid}...`);
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token) {
      const errorMsg = response.data.error_description || response.data.error || 'Unknown refresh error';
      console.error(`[GitHub Auth] Refresh failed for ${uid}: ${errorMsg}`);
      throw new AuthError(`GitHub refresh failed: ${errorMsg}`);
    }

    const expiryDate = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined;

    await User.findOneAndUpdate(
      { uid },
      {
        githubAccessToken: access_token,
        githubRefreshToken: refresh_token, // Rotation: always update with new refresh token
        githubTokenExpiry: expiryDate,
      }
    );

    console.log(`[GitHub Auth] Token refreshed successfully for user ${uid}.`);
    await cacheDelPattern(`gh:*:${uid}*`);
    return access_token;
  } catch (error: any) {
    if (error.response?.data?.error === 'bad_refresh_token') {
      console.warn(`[GitHub Auth] Refresh token revoked for user ${uid}. Clearing and prompting reconnect.`);
      await clearInvalidToken(uid);
    }
    throw error;
  }
}

export async function fetchRepos(token: string): Promise<RepoSummary[]> {
  const response = await axios.get('https://api.github.com/user/repos', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    params: {
      sort: 'updated',
      per_page: 100,
    },
  });

  return response.data.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    updated_at: repo.updated_at,
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
    },
  }));
}

export async function fetchRepoDetails(token: string, owner: string, repo: string): Promise<any> {
  const repoFullName = `${owner}/${repo}`;
  const headers = { Authorization: `Bearer ${token}` };

  const [
    currentUserResult, 
    repoResult,
    commitsResult,
    contributorsResult,
    languagesResult,
    deploymentsResult
  ] = await Promise.allSettled([
    axios.get('https://api.github.com/user', { headers }),
    axios.get(`https://api.github.com/repos/${repoFullName}`, { headers }),
    axios.get(`https://api.github.com/repos/${repoFullName}/commits?per_page=30`, { headers }),
    axios.get(`https://api.github.com/repos/${repoFullName}/contributors?per_page=10`, { headers }),
    axios.get(`https://api.github.com/repos/${repoFullName}/languages`, { headers }),
    axios.get(`https://api.github.com/repos/${repoFullName}/deployments?per_page=5`, { headers }),
  ]);

  const currentUserResponse = currentUserResult.status === 'fulfilled' ? currentUserResult.value : null;
  const repoResponse = repoResult.status === 'fulfilled' ? repoResult.value : null;

  if (!repoResponse) {
    throw new NotFoundError('Repository not found or access denied');
  }

  const currentUserLogin = currentUserResponse?.data?.login || null;
  const repoOwnerLogin = repoResponse.data?.owner?.login || owner;
  const isOwner = !!currentUserLogin && currentUserLogin.toLowerCase() === repoOwnerLogin.toLowerCase();

  const details: RepoDetails = {
    id: repoResponse.data.id,
    name: repoResponse.data.name,
    full_name: repoResponse.data.full_name,
    private: repoResponse.data.private,
    html_url: repoResponse.data.html_url,
    description: repoResponse.data.description,
    created_at: repoResponse.data.created_at,
    updated_at: repoResponse.data.updated_at,
    language: repoResponse.data.language,
    stars: repoResponse.data.stargazers_count,
    forks: repoResponse.data.forks_count,
    open_issues: repoResponse.data.open_issues_count,
    owner: repoResponse.data.owner ? { login: repoResponse.data.owner.login } : { login: owner },
    isOwner,
  };

  const commits = commitsResult.status === 'fulfilled' 
    ? commitsResult.value.data.map((c: any) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url
      }))
    : [];

  const contributors = contributorsResult.status === 'fulfilled'
    ? contributorsResult.value.data.map((c: any) => ({
        login: c.login,
        avatar_url: c.avatar_url,
        contributions: c.contributions,
        html_url: c.html_url
      }))
    : [];

  const languages = languagesResult.status === 'fulfilled'
    ? Object.entries(languagesResult.value.data).map(([name, bytes]) => ({
        name,
        bytes: bytes as number
      }))
    : [];

  const deployments = deploymentsResult.status === 'fulfilled'
    ? deploymentsResult.value.data.map((d: any) => ({
        id: d.id,
        environment: d.environment,
        state: d.state,
        created_at: d.created_at,
        creator: d.creator?.login,
        url: d.url
      }))
    : [];

  return { 
    details, 
    commits, 
    contributors, 
    languages, 
    deployments 
  };
}

export async function updateCollaboratorRole(
  token: string,
  repoName: string,
  username: string,
  status: string
): Promise<void> {
  if (!repoName || !username || !status) {
    throw new ValidationError('Missing required fields');
  }

  const [owner, repo] = repoName.split('/');
  if (!owner || !repo) {
    throw new ValidationError('Invalid repoName format. Expected owner/repo');
  }

  if (username.toLowerCase() === owner.toLowerCase()) {
    throw new ValidationError("Cannot change the repository owner's access. The owner always has full permissions.");
  }

  const octokit = new Octokit({ auth: token });
  const { data: currentUser } = await octokit.rest.users.getAuthenticated();

  if (currentUser.login.toLowerCase() !== owner.toLowerCase()) {
    throw new ForbiddenError('Only repository owners can manage collaborator access. Collaborators cannot change who can push.');
  }

  const permission = status === 'locked' ? 'pull' : 'push';

  await octokit.rest.repos.addCollaborator({
    owner,
    repo,
    username,
    permission,
  });
}
