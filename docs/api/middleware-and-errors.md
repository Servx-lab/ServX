# Middleware and Errors Architecture

## Authentication & Authorization Pipelines

| Middleware | File Path | Core Behavior |
|------------|-----------|---------------|
| `requireAuth` | `src/core/middleware/requireAuth.ts` | Cryptographically verifies Supabase JWTs, caches validations in-memory to reduce latency, and strictly enforces global DEFCON lockdown invalidations. Hydrates `req.user`. |
| `isAdmin` | `src/core/middleware/isAdmin.ts` | Enforces administrative access by cross-referencing the verified Supabase JWT against the MongoDB `Admin` collection or `ADMIN_EMAIL` environment variable. |
| `requireAdminOrBootstrap` | `src/core/middleware/requireAdminOrBootstrap.ts` | Requires administrative privileges, but seamlessly permits initial team bootstrapping if zero admin records exist in the database. |
| `requireRepoEditorOrAdmin` | `src/core/middleware/requireRepoEditorOrAdmin.ts` | Validates granular repository-level access controls for specific Git resources. |

## Centralized Error Propagation

- **`@servx/errors`**: A standardized, typed error library (`ValidationError`, `AuthError`, etc.) utilized universally. For implementation details, refer to [packages/errors.md](../packages/errors.md).
- **`errorHandler`**: Found in `src/core/middleware/errorHandler.ts`, this global pipeline intercepts thrown exceptions and standardizes them into predictable HTTP response payloads.

## Cross-Origin Resource Sharing (CORS)

CORS policies are rigorously configured within `src/app.ts`. The allowlist is explicitly restricted to known origins, including the `FRONTEND_URL` environment variable and whitelisted local development ports.
