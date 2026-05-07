# RequireAuth

**File:** `apps/web/src/features/auth/RequireAuth.tsx`

Wrapper for routes that need a logged-in Firebase user.

## Props

- **`children`** — rendered when allowed
- **`requireGitHub`** (optional, default `true` when not specified in some usages) — if the product expects GitHub to be linked, users without GitHub may be redirected to **`/bridge`**

## Behavior

- If no Firebase user → redirect to **`/auth`** (or configured login path)
- If GitHub required but not linked → redirect to **`/bridge`**

Used around `DashboardLayout` in `App.tsx` and individual routes like `/onboarding` and `/settings/connections`.
