export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface Repository {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  languages: Record<string, number>;
  updated_at: string;
  stack?: string[]; // Frameworks/Databases from package.json
}
