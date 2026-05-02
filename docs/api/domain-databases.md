# API domain: Databases (`/api/db`)

**Router:** `apps/api/src/domains/databases/router.ts`  
**Controller / service:** `domains/databases/`

Exploration and adapter abstraction for multiple DB backends (MongoDB, Postgres, Supabase, etc.).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/db/explore/databases` | requireAuth | List databases |
| GET | `/api/db/explore/collections` | requireAuth | List collections / schemas |
| POST | `/api/db/explore/documents` | requireAuth | Read documents / rows |
| GET | `/api/db/explore/tables` | requireAuth | Alias of collections |
| POST | `/api/db/explore/rows` | requireAuth | Alias of documents |
| POST | `/api/db/test-connection` | requireAuth | Validate credentials |
| GET | `/api/db/stats` | requireAuth | Aggregate stats |

**Adapters:** `domains/databases/adapters/*.adapter.ts`
