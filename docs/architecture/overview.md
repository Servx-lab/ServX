# Architecture overview

ServX is a **monorepo** (npm workspaces) that ships:

1. **`apps/web`** — Vite + React + TypeScript SPA. Uses React Router, TanStack Query, Firebase Auth for identity, and a shared Axios client (`apiClient`) that attaches Firebase ID tokens to `/api/*` requests (see `apps/web/src/lib/apiClient.ts`).
2. **`apps/api`** — Express 5 API. Verifies Firebase ID tokens via `firebase-admin` (`utils/firebaseAdmin.js`). Persists data in **MongoDB** (Mongoose models under `apps/api/models/` and domain models under `apps/api/src/domains/*/model.ts`). Optional **Redis** for caching where configured.
3. **`packages/types`**, **`packages/errors`**, **`packages/crypto`** — Shared TypeScript libraries consumed by API and/or web.
4. **`apps/worker`** — Optional Node worker for background jobs (e.g. cache seeding).

## Request flow (dashboard)

1. User signs in with **Firebase Auth** in the browser.
2. The web app calls `GET/POST https://<api>/api/...` with `Authorization: Bearer <Firebase ID token>`.
3. API middleware (`requireAuth`, `isAdmin`, etc.) verifies the token and attaches `req.user` or `req.uid`.
4. Domain controllers call services; services read/write MongoDB, call GitHub, hosting providers, etc.

## Frontend shell

Authenticated app routes are wrapped in **`RequireAuth`** and often nested under **`DashboardLayout`** (persistent sidebar + main content) — see [web/layout-shell.md](../web/layout-shell.md).

## Security notes (high level)

- **Firebase** handles end-user authentication; the API trusts verified ID tokens.
- **Admin** features (team management, granular permissions for some endpoints) use MongoDB `Admin` records and/or `AccessControl` documents — see [concepts/team-access-and-granular-permissions.md](../concepts/team-access-and-granular-permissions.md).
- **CORS** is configured in `apps/api/src/app.ts` for known frontend origins.
