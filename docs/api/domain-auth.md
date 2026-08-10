# API Domain: Auth (`/api/auth`)

**Router:** `apps/api/src/domains/auth/router.ts`  
**Controller:** `domains/auth/controller.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/github/url` | `requireAuth` | Generates OAuth authorization URL for GitHub. |
| GET | `/api/auth/github` | `requireAuth` | Triggers a 302 redirect to the GitHub OAuth authorization flow. |
| GET | `/api/auth/github/callback` | — | Handles OAuth callback, storing encrypted tokens in the Supabase `github_vault`. |
| POST | `/api/auth/sync` | `requireAuth` | Syncs authenticated identity to the `user_profiles` table and enforces zero-trust device authorization. |
| POST | `/api/auth/github/disconnect` | `requireAuth` | Revokes GitHub access and purges tokens from the `github_vault`. |
| GET | `/api/auth/users/search` | — | Look up user by email from `user_profiles` (fall back to Supabase Admin API). |
| GET | `/api/auth/users/list` | — | Retrieves a paginated list of users from `user_profiles` or Supabase Admin API. |

> [!NOTE]  
> The `/users/search` endpoint on the **auth** router serves distinct identity resolution logic compared to **`/api/users/search`** (which handles localized Mongo-based admin searches) — see [domain-users.md](./domain-users.md).

## Services

**`domains/auth/service.ts`** — Houses telemetry and alert pipelines, specifically for logging new user registrations to external sheets and triggering administrative notifications.
