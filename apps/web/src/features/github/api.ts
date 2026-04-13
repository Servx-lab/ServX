import apiClient from '@/lib/apiClient';
import type { RepoSummary } from '@servx/types';
import type { Repository, RepoDetails, Commit } from './types';

export interface GitHubConnectionStatus {
  connected: boolean;
  tokenPresent: boolean;
  expired: boolean;
}

export async function getGitHubStatus(): Promise<GitHubConnectionStatus> {
  const res = await apiClient.get('/github/status', { skipAuthErrorLog: true });
  return res.data;
}

export async function getRepos(): Promise<RepoSummary[]> {
  const res = await apiClient.get('/github/repos');
  return res.data;
}

export async function getDashboardRepos(): Promise<Repository[]> {
  const res = await apiClient.get('/github/repos');
  return res.data;
}

export async function getRepoStack(repoName: string): Promise<string[]> {
  const res = await apiClient.get(`/github/repos/${repoName}/stack`);
  return res.data.stack;
}

export async function getRepoCommits(repoName: string): Promise<Commit[]> {
  const res = await apiClient.get(`/github/repos/${repoName}/commits`);
  return res.data;
}

export async function getRepoDetails(owner: string, name: string): Promise<RepoDetails> {
  const res = await apiClient.get(`/github/repos/${owner}/${name}/details`);
  const { details, commits, contributors, languages, deployments } = res.data;
  return { ...details, commits, contributors, languages, deployments };
}

export async function disconnectGitHub(): Promise<void> {
  await apiClient.post('/auth/github/disconnect');
}

export async function updateCollaboratorRole(
  repoName: string,
  githubUsername: string,
  status: 'locked' | 'unlocked',
): Promise<void> {
  await apiClient.post('/github/collaborator/role', { repoName, githubUsername, status });
}
