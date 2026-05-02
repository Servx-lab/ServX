# Databases

**Route:** `/databases`  
**Feature:** `apps/web/src/features/databases/`

Explores connected databases: list connections, open **DatabaseConnector**, **DatabaseList**, **DatabaseViewer**, **DataGrid**, **QuickViewDrawer**, and optional **FirebaseUserManager** for Firebase-backed user listing/search.

## APIs (typical)

- `GET/POST /api/db/*` — explore databases, collections/tables, documents/rows, stats, test connection — see [api/domain-databases.md](../../api/domain-databases.md)
- `GET /api/auth/users/search` or database-specific search where used in `FirebaseUserManager`

## Key files

- `index.tsx` — feature shell
- `api.ts`, `hooks.ts`, `types.ts` — client layer
