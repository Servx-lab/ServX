# AuthContext

**File:** `apps/web/src/contexts/AuthContext.tsx`

React context that exposes:

- Current **Firebase user** (`User | null`)
- Derived **display fields** (email, displayName, `photoURL`, etc.)
- **`linkGitHub()`** — initiates GitHub OAuth via API
- **`logout()`** — Firebase sign-out
- **Prefetch / sync** — calls backend to hydrate Mongo user profile and handle GitHub token state

## API interaction

Uses **`apiClient`** or fetch to `POST /api/auth/sync` and related endpoints so the server’s `User` document stays aligned with Firebase (email, name, GitHub tokens).

## Consumer hooks

**File:** `apps/web/src/features/auth/hooks.ts` — `useAuth()` re-exports context for feature components.
