# API domain: Users (`/api/users`)

**Router:** `apps/api/src/domains/users/router.ts`  
**Service:** `domains/users/service.ts` — regex search on Mongo **`User`** (email, username, name).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/search?q=` | **requireAuth** + **requireAdminOrBootstrap** | Returns `{ users: SafeUserSearchHit[] }` |

**requireAdminOrBootstrap:** allows users present in the **`Admin`** collection, or any authenticated user when **zero** admins exist (bootstrap first team).

This endpoint is separate from **`/api/auth/users/search`** (Firebase-specific lookup in the auth domain).
