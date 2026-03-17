import axios from 'axios';
import { Octokit } from '@octokit/rest';

import { AuthError, ForbiddenError, NotFoundError, ValidationError } from '@servx/errors';
import type { RepoDetails, RepoSummary } from '@servx/types';

import User from './model';

export async function getGithubToken(uid: string): Promise<string> {
  const user = await User.findOne({ uid }).select('+githubAccessToken');

  if (!user) {
    throw new NotFoundError('User record not found in database.');
  }

  if (!user.githubAccessToken) {
    throw new AuthError('GitHub account not connected.');
  }

  return user.githubAccessToken as string;
}

export async function clearInvalidToken(uid: string): Promise<void> {
  await User.findOneAndUpdate({ uid }, { $unset: { githubAccessToken: '' } });
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

export async function fetchRepoDetails(token: string, owner: string, repo: string): Promise<RepoDetails> {
  const repoFullName = `${owner}/${repo}`;
  const headers = { Authorization: `Bearer ${token}` };

  const [currentUserResult, repoResult] = await Promise.allSettled([
    axios.get('https://api.github.com/user', { headers }),
    axios.get(`https://api.github.com/repos/${repoFullName}`, { headers }),
  ]);

  const currentUserResponse = currentUserResult.status === 'fulfilled' ? currentUserResult.value : null;
  const repoResponse = repoResult.status === 'fulfilled' ? repoResult.value : null;

  if (!repoResponse) {
    throw new NotFoundError('Repository not found or access denied');
  }

  const currentUserLogin = currentUserResponse?.data?.login || null;
  const repoOwnerLogin = repoResponse.data?.owner?.login || owner;
  const isOwner = !!currentUserLogin && currentUserLogin.toLowerCase() === repoOwnerLogin.toLowerCase();

  return {
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
