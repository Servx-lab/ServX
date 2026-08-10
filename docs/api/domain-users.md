# API Domain: Users (`/api/users`)

**Router:** `apps/api/src/domains/users/router.ts`  
**Controller:** `domains/users/controller.ts` (executes `ILIKE` queries against the **Supabase `user_profiles`** table).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/search?q=` | `requireAuth` + `requireAdminOrBootstrap` | Returns `{ users: SafeUserSearchHit[] }` matching the regex query. |

> [!IMPORTANT]
> **`requireAdminOrBootstrap` Middleware:** Grants access exclusively to verified entries within the MongoDB **`Admin`** collection. During initial provisioning (when zero admins exist), it permits any authenticated user to bootstrap the initial team structure.

> [!NOTE]
> This administrative endpoint is strictly delineated from **`/api/auth/users/search`**, which is dedicated to identity resolution against the Supabase `user_profiles` table (formerly Firebase).
