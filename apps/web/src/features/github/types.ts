// Re-export shared types from the monorepo package so consumers only need one import path
export type { RepoSummary } from '@servx/types';
import type { RepoDetails as BaseRepoDetails } from '@servx/types';

// Merged Commit type — url is optional to cover both GitHubDashboard (no url) and
// GitHubIntegration (url present) usage patterns.
export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url?: string;
}

// Repository shape used by GitHubDashboard — includes tech-stack enrichment beyond RepoSummary.
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  html_url: string;
  language: string | null;
  languages: Record<string, number>;
  updated_at: string;
  stack?: string[];
}

export interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

export interface Language {
  name: string;
  bytes: number;
}

export interface Deployment {
  id: number;
  environment: string;
  state: string;
  created_at: string;
  creator?: string;
  creator_login?: string;
  creator_avatar?: string;
  url: string;
}

// Enriched details for a single repo — extends @servx/types RepoDetails with the additional
// data (commits, contributors, languages, deployments) returned by the /details endpoint.
export interface RepoDetails extends BaseRepoDetails {
  commits?: Commit[];
  contributors?: Contributor[];
  languages?: Language[];
  deployments?: Deployment[];
}
