export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}


export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isGitHubLinked: boolean;
  githubTokenValid: boolean | null;
  signInWithGitHub: (shouldNavigate?: boolean) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  linkGitHub: (shouldNavigate?: boolean) => Promise<void>;
  refreshGitHubConnection: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface SyncUserPayload {
  name?: string;
  avatarUrl?: string;
  githubAccessToken?: string;
  githubRefreshToken?: string;
  githubTokenExpiry?: number;
  githubId?: string;
}
