# Package: `@servx/errors` (`packages/errors`)

HTTP-friendly **error classes** used across the API:

- `AppError` — base (`statusCode`, `code`)
- `NotFoundError` — 404
- `AuthError` — 401
- `ForbiddenError` — 403
- `ValidationError` — 422 (+ optional `fields`)
- `ConflictError` — 409
- `isAppError()` — type guard for the global Express error handler

**Entry:** `packages/errors/index.ts`
