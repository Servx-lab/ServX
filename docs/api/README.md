# API (`apps/api`)

Express 5 application created by **`createApp()`** in `src/app.ts`. Registers JSON body parser, CORS, request logging, route mounts, and a global error handler.

## Base URL

- Local dev: often `http://localhost:5000` with web proxy sending `/api` from Vite.
- All documented paths assume prefix **`/api`** as mounted in `registerApiRoutes`.

## Domain index

| Domain | Mount | Doc |
|--------|--------|-----|
| Auth | `/api/auth` | [domain-auth.md](./domain-auth.md) |
| GitHub | `/api/github` | [domain-github.md](./domain-github.md) |
| Databases | `/api/db` | [domain-databases.md](./domain-databases.md) |
| Connections | `/api/connections` | [domain-connections.md](./domain-connections.md) |
| Hosting OAuth | `/api/oauth` | [domain-hosting-oauth.md](./domain-hosting-oauth.md) |
| Gmail | `/api` (gmail routes) | [domain-gmail.md](./domain-gmail.md) |
| Admin | `/api/admin` | [domain-admin.md](./domain-admin.md) |
| Users | `/api/users` | [domain-users.md](./domain-users.md) |
| Operations | `/api/operations`, `/api/tasks` | [domain-operations.md](./domain-operations.md) |
| Profile | `/api/profile` | [domain-profile.md](./domain-profile.md) |

## Cross-cutting

- [middleware-and-errors.md](./middleware-and-errors.md)
