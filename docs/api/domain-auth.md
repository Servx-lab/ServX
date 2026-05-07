# API domain: Auth (`/api/auth`)

**Router:** `apps/api/src/domains/auth/router.ts`  
**Controller:** `domains/auth/controller.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/github/url` | requireAuth | OAuth URL for GitHub |
| GET | `/api/auth/github` | requireAuth | Redirect to GitHub |
| GET | `/api/auth/github/callback` | — | OAuth callback |
| POST | `/api/auth/sync` | requireAuth | Sync Firebase user to Mongo `User` |
| POST | `/api/auth/github/disconnect` | requireAuth | Clear GitHub tokens on user |
| GET | `/api/auth/users/search` | — | Lookup Firebase user by email (connection-specific; see controller) |
| GET | `/api/auth/users/list` | — | List users from configured Firebase app |

> Note: `/users/search` on **auth** router differs from **`/api/users/search`** (Mongo user search for admin UI) — see [domain-users.md](./domain-users.md).

## Services

**`domains/auth/service.ts`** — Firebase app resolution for multi-connection scenarios.
