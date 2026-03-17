import { useState, useEffect } from 'react';
import type { RepoSummary } from '@servx/types';
import type { Repository, Commit, RepoDetails } from './types';
import { getDashboardRepos, getRepoStack, getRepoCommits, getRepos, getRepoDetails } from './api';

/** Fetches all repos for the dashboard view and enriches each with its tech stack. */
export function useGitHubDashboardRepos() {
  const [repos, setRepos] = useState<Repository[]>([]);

  useEffect(() => {
    getDashboardRepos()
      .then((data) => {
        setRepos(data);
        data.forEach(async (repo) => {
          try {
            const stack = await getRepoStack(repo.name);
            setRepos((prev) =>
              prev.map((r) => (r.name === repo.name ? { ...r, stack } : r)),
            );
          } catch {
            // Stack enrichment is non-critical — silently skip on failure.
          }
        });
      })
      .catch((err) => console.error('Failed to fetch repos', err));
  }, []);

  return repos;
}

/** Fetches commits for the given repo name. Resets to [] when repoName is null. */
export function useRepoCommits(repoName: string | null) {
  const [commits, setCommits] = useState<Commit[]>([]);

  useEffect(() => {
    if (!repoName) {
      setCommits([]);
      return;
    }
    getRepoCommits(repoName)
      .then(setCommits)
      .catch((err) => console.error('Failed to fetch commits', err));
  }, [repoName]);

  return commits;
}

/** Fetches the list of repos for the integration view. Handles 401 error messages. */
export function useIntegrationRepos(isAuthenticated: boolean) {
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getRepos()
      .then(setRepos)
      .catch((err) => {
        console.error('Failed to fetch repos:', err);
        if (err.response?.status === 401) {
          const serverError: string = err.response?.data?.error ?? '';
          if (
            serverError === 'User record not found in database.' ||
            serverError === 'GitHub account not connected.'
          ) {
            setError('GitHub not connected. Please connect your account.');
          } else if (serverError === 'GitHub token invalid or expired.') {
            setError('Your GitHub connection has expired. Please reconnect.');
          } else {
            setError(serverError || 'GitHub not connected. Please connect your account.');
          }
        } else {
          setError('Failed to fetch repositories.');
        }
      });
  }, [isAuthenticated]);

  return { repos, setRepos, error, setError };
}

/** Fetches enriched details for the selected repo. Resets state on each new selection. */
export function useRepoDetails(selectedRepoId: number | null, repos: RepoSummary[]) {
  const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRepoId) return;
    const repo = repos.find((r) => r.id === selectedRepoId);
    if (!repo) return;

    setLoadingDetails(true);
    setRepoDetails(null);
    setError(null);

    const [owner, name] = repo.full_name.split('/');
    getRepoDetails(owner, name)
      .then(setRepoDetails)
      .catch((err) => {
        console.error(err);
        setError('Failed to load repository details.');
      })
      .finally(() => setLoadingDetails(false));
  // repos is intentionally omitted — we only re-fetch when the selected repo id changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepoId]);

  return { repoDetails, setRepoDetails, loadingDetails, error, setError };
}
