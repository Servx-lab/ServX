export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string; 
  owner: {
      login: string;
      avatar_url: string;
  };
  description: string | null;
  html_url: string;
  language: string | null;
  languages: Record<string, number>;
  updated_at: string;
  stack?: string[]; // Frameworks/Databases from package.json
}
