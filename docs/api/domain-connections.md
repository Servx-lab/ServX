# API domain: Connections (`/api/connections`)

**Router:** `apps/api/src/domains/connections/router.ts`  
**Service:** `domains/connections/service.ts`

Generic **UserConnection** documents linking the workspace to databases and hosting providers.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/connections` | requireAuth | Create connection |
| GET | `/api/connections` | requireAuth | List connections |
| DELETE | `/api/connections/:id` | requireAuth | Delete |
| GET | `/api/connections/hosting/:provider/env/:serviceId` | requireAuth | Env vars for a hosted service (encrypted tokens server-side) |
| GET | `/api/connections/hosting/:provider/status` | requireAuth | Provider connection status |
| POST | `/api/connections/hosting/:provider` | requireAuth | Save hosting OAuth/token payload |
| GET | `/api/connections/vercel/status` | requireAuth | Legacy alias → Vercel |
| POST | `/api/connections/vercel` | requireAuth | Legacy alias → Vercel |
