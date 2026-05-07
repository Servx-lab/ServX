# Hosting integrations

**Route:** `/hosting/:providerId`  
**Feature:** `apps/web/src/features/hosting/`

Per-provider hosting UI (Vercel, Render, Railway, Fly.io, DigitalOcean, AWS, etc.) driven by **`providerId`**. Uses **`HostingSidebar`**, **`HostingIntegrationCard`**, env/status flows.

## APIs

- `GET/POST /api/connections/*` — list/save connections, hosting status, env vars for services — see [api/domain-connections.md](../../api/domain-connections.md)
- `GET /api/oauth/*` — provider OAuth start/callbacks — [api/domain-hosting-oauth.md](../../api/domain-hosting-oauth.md)

## Client

- `api.ts`, `hooks.ts`, `types.ts` — feature API layer
