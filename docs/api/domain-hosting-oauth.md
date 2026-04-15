# API domain: Hosting OAuth (`/api/oauth`)

**Router:** `apps/api/src/domains/hosting/router.ts`  
**Controller:** `domains/hosting/controller.ts`

OAuth **start** and **callback** routes for hosting platforms (tokens persisted via connections flow).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/oauth/vercel` | requireAuth | Start Vercel OAuth |
| GET | `/api/oauth/vercel/callback` | — | Vercel callback |
| GET | `/api/oauth/digitalocean` | — | Start DigitalOcean OAuth |
| GET | `/api/oauth/digitalocean/callback` | — | DO callback |
| GET | `/api/oauth/railway` | — | Start Railway OAuth |

> Callback routes are invoked by providers without the user’s Bearer token; controllers validate `state` and codes.
