# Infrastructure settings (connections)

**Route:** `/settings/connections`  
**File:** `apps/web/src/pages/InfraSettings.tsx`

Configuration for **infrastructure connections** (databases, hosting accounts, etc.) without the main sidebar layout pattern used for `/settings/profile` in routing (uses `RequireAuth` only).

## APIs

Typically `GET/POST/DELETE /api/connections` and related — [api/domain-connections.md](../../api/domain-connections.md).
