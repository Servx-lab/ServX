# Authentication (Web)

The ServX web application utilizes **Supabase Authentication** for secure identity management. The Main-UI API explicitly trusts **Supabase JWTs (JSON Web Tokens)**, cryptographically verifying them server-side on every protected request.

## Documentation Directory

| Document | Purpose |
|----------|---------|
| [auth-context.md](./auth-context.md) | Details the `AuthProvider`, global user state, and API hydration logic. |
| [require-auth.md](./require-auth.md) | Explains the highly restrictive route guard component. |
| [landing.md](./landing.md) | Overview of the public unauthenticated marketing surface. |
| [auth-page.md](./auth-page.md) | Details the `/auth` sign-in UI and OAuth providers. |
| [bridge.md](./bridge.md) | Details the `/bridge` route handling mandatory GitHub linking. |

## Authentication Lifecycle

1. **Entry:** User navigates to `/auth` or clicks a CTA on the marketing landing page.
2. **Session Initialization:** A secure Supabase session is established locally. The `AuthContext` immediately synchronizes the profile to the backend via `POST /api/auth/sync`, passing zero-trust device headers (`x-device-uuid`).
3. **Route Protection:** The `<RequireAuth>` guard aggressively protects dashboard routes, enforcing active sessions and optional GitHub OAuth linkages (forcing unlinked users to `/bridge`).
