# API Documentation (`apps/api`)

The backend is an Express 5 application initialized via the **`createApp()`** factory in `src/app.ts`. This initialization phase rigorously configures JSON body parsing, CORS policies, request telemetry, domain-specific route mounting, and a centralized error handling pipeline.

## Base URL Configuration

- **Local Development:** The API typically runs on `http://localhost:5000`. The Vite development server acts as a reverse proxy, seamlessly forwarding all `/api` requests to this backend.
- **Path Resolution:** All documented endpoint paths implicitly assume the **`/api`** prefix, as defined by the `registerApiRoutes` configuration.

## Domain index

| Domain | Mount | Doc |
|--------|--------|-----|
| Auth | `/api/auth` | [domain-auth.md](./domain-auth.md) |
| GitHub | `/api/github` | [domain-github.md](./domain-github.md) |
| Databases | `/api/db` | [domain-databases.md](./domain-databases.md) |
| Connections | `/api/connections` | [domain-connections.md](./domain-connections.md) |
| Hosting OAuth | `/api/oauth`, `/api/hosting` | [domain-hosting-oauth.md](./domain-hosting-oauth.md) |
| Gmail | `/api` (gmail routes) | [domain-gmail.md](./domain-gmail.md) |
| Admin | `/api/admin` | [domain-admin.md](./domain-admin.md) |
| Users | `/api/users` | [domain-users.md](./domain-users.md) |
| Operations | `/api/operations`, `/api/tasks` | [domain-operations.md](./domain-operations.md) |
| Profile | `/api/profile` | [domain-profile.md](./domain-profile.md) |
| Security | `/api/security` | - |
| Webhooks | `/api/webhooks` | - |
| Feed | `/api/feed` | - |
| Repositories | `/api/repositories` | - |
| Verify | `/api/verify` | - |
| Devices | `/api/devices` | - |
| Attack Paths | `/api/attack-paths`, `/api/internal/attack-paths` | - |
| Internal Services | `/api/internal` | - |

## Cross-Cutting Concerns

- For detailed information regarding middleware pipelines and error propagation standardizations, please refer to [middleware-and-errors.md](./middleware-and-errors.md).
