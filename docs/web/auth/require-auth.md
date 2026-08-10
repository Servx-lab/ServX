# RequireAuth Guard

**File:** `apps/web/src/features/auth/RequireAuth.tsx`

This component acts as the frontline defensive wrapper for all protected routes, ensuring that only users with a cryptographically valid Supabase session can access internal views.

## Component Props

- **`children`:** The protected component tree, rendered only if authorization succeeds.
- **`requireGitHub`** (optional, defaults to `true` in secure contexts): A strict modifier that dictates whether the user must have an active GitHub OAuth token stored in the `github_vault`. 

## Enforced Behaviors

- **No Active Session:** If the Supabase client returns no session, the user is immediately redirected to the `/auth` route (or the configured SSO login path).
- **Missing GitHub Linkage:** If `requireGitHub` is asserted but the user profile lacks a GitHub identity, they are forcefully redirected to the **`/bridge`** route to complete authorization.

This guard wraps the core `DashboardLayout` in `App.tsx`, as well as highly sensitive standalone routes like `/settings/connections`.
