export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isGitHubLinked: boolean;
  signInWithGitHub: (shouldNavigate?: boolean) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  linkGitHub: (shouldNavigate?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

export interface SyncUserPayload {
  name?: string;
  avatarUrl?: string;
  githubAccessToken?: string;
  githubId?: string;
}
