# Middleware and errors

## Auth middleware

| Middleware | File | Behavior |
|------------|------|----------|
| `requireAuth` | `src/core/middleware/requireAuth.ts` (and legacy `middleware/requireAuth.js`) | Verifies Firebase ID token, sets `req.user = { uid, email }` |
| `isAdmin` | `src/core/middleware/isAdmin.ts` | Requires token + MongoDB `Admin` document for `uid` |
| `requireAdminOrBootstrap` | `src/core/middleware/requireAdminOrBootstrap.ts` | Token + admin row **or** zero admins in DB (bootstrap) |

## Error handling

- **`@servx/errors`** — typed errors (`ValidationError`, `NotFoundError`, etc.) — see [packages/errors.md](../packages/errors.md)
- **`errorHandler`** — `src/core/middleware/errorHandler.ts` maps errors to HTTP responses

## CORS

Configured in `src/app.ts` with allowlist including `FRONTEND_URL` and local dev ports.
