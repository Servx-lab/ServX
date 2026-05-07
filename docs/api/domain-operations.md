# API domain: Operations (`/api/operations`, `/api/tasks`)

**Router:** `apps/api/src/domains/operations/router.ts`  
**Mounted twice** in `app.ts` at `/api/operations` and `/api/tasks` so **`POST /api/tasks/execute`** exists as an alias.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/operations/projects` | requireAuth | List projects for ops |
| POST | `/api/operations/toggle-maintenance` | requireAuth | Maintenance mode |
| POST | `/api/operations/tasks/execute` | requireAuth | Run task |
| POST | `/api/operations/execute` | requireAuth | Same handler (alias inside router) |
| POST | `/api/tasks/execute` | requireAuth | Same router, second mount |
