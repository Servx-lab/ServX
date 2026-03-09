// Types
export interface RepoDetails {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string;
  stargazers_count: number;
  updated_at: string;
  owner: { login: string };
  commits?: Commit[];
  contributors?: Contributor[];
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

// Minimal Repo Summary structure for the list
export interface RepositorySummary {
  id: number;
  name: string;
  full_name: string; // Used for "details" API argument
  description: string | null;
  html_url: string;
  language: string | null;
  updated_at: string;
}
