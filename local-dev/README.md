# ServX Local Development & Demo Setup

This directory contains everything required to run the signed-in ServX console locally without external cloud dependencies.

---

## 1. Prerequisites

Start the local services once (Docker required):

```bash
# Supabase (Postgres + Auth + REST) on its own ports, so it can run beside other local stacks
npx supabase start --workdir local-dev -x studio,imgproxy,edge-runtime,logflare,vector,postgres-meta,mailpit,realtime,storage-api,supavisor

# MongoDB and Redis for the API
docker run -d --name servx-local-mongo -p 127.0.0.1:27019:27017 mongo:7
docker run -d --name servx-local-redis -p 127.0.0.1:6381:6379 redis:7-alpine
```

- **Supabase Local (CLI)**: `local-dev/supabase/config.toml` (container `supabase_db_servx-local`):
  - API: `http://127.0.0.1:55421`
  - Database: `postgresql://postgres:postgres@127.0.0.1:55422/postgres`
- **MongoDB**: `mongodb://127.0.0.1:27019` (databases `servx_local` and `servx_demo_shop`)
- **Redis**: `redis://127.0.0.1:6381/0`
- **Node.js**: v18+ and `npm`

---

## 2. Quickstart (4 Commands)

Run these commands from the repository root:

```bash
# 1. Install workspace dependencies
npm install

# 2. Apply database schemas and seed demo data (PostgreSQL + MongoDB)
bash local-dev/run.sh seed

# 3. Start the backend API server (runs on http://localhost:5000)
bash local-dev/run.sh api

# 4. In a separate terminal, start the web frontend (runs on http://localhost:5173)
bash local-dev/run.sh web
```

Open `http://localhost:5173` in your browser.

---

## 3. Demo Logins

All demo accounts use password **`ServXDemo#2026`**:

| Persona | Email | Role | Features / Permissions |
|---|---|---|---|
| **Alex Rivera** | `alex@servx.dev` | `owner` | Full Control, GitHub identity linked, main device registered (`servx-demo-device-01`) |
| **Priya Nair** | `priya@servx.dev` | `editor` | Team editor, granular access to Vercel/Render hosting and DBs |
| **Sam Okafor** | `sam@servx.dev` | `viewer` | Team viewer, read-only permissions |

*Tip for Alex's zero-trust device recognition:* You can optionally set the matching fingerprint in browser localStorage before logging in:
```javascript
localStorage.setItem('orizon_device_uuid', 'servx-demo-device-01');
```

---

## 4. What is Seeded

- **Dashboard & App Shell**: Maintenance check passes, GitHub status is connected (`alexrivera`), and connections prefetch succeeds.
- **Databases (`/databases`)**:
  - `shop-mongo`: Real connection to local MongoDB database `servx_demo_shop`. The collection explorer will actively query and browse real collections (`customers`, `orders`, `products`, `audit_logs` — 20 documents each).
  - `billing-postgres`: Connected status pointing to local PostgreSQL.
- **Operations (`/operations`)**:
  - Repositories: `servx-lab/servx-web` (`svx_test_pin_123`), `servx-lab/checkout-api`, and `servx-lab/status-page` (all `VERIFIED`).
  - Active admin list with Alex, Priya, and Sam.
- **Auto-Medic (`/auto-medic`)**:
  - 5 realistic build/runtime failure incidents over the last 3 days across Vercel and Render (e.g. missing `NEXT_PUBLIC_AUTH_DOMAIN`, Prisma migration conflict, container OOM on Render).
  - Corresponding error signature cache entries in `error_cache`.
- **Attack Paths (`/attack`)**:
  - Pre-seeded completed scan for `servx-lab/checkout-api` (`deep_repo` profile) with:
    - 6 realistic findings (SQL injection, hardcoded secrets, SSRF, BOLA, vulnerable dependencies, missing rate limiting).
    - 12 topology nodes (ingress routes → middleware → controllers → sinks) and 12 edges with attack paths flagged.
    - 5 route-to-sink attack path candidates mapped in the finding details drawer.
- **Exposure Analysis (`/exposure`)**:
  - 10 perimeter assets (domains, subdomains, IPs, and an S3 bucket under `servx-demo.dev`).
  - 14 findings across all 5 categories (`network`, `cloud_storage`, `dns`, `iam`, `web_headers`), including a few marked resolved for non-trivial score calculation.
- **Settings & Devices (`/settings`)**:
  - 3 devices for Alex Rivera (`Chrome on Linux` as main device, `Safari on macOS`, `Chrome on Android`).
- **Access Management (`/admin`)**:
  - Granular access control rows in `team_access_control` granting Priya and Sam scoped access to hosting servers and databases.

---

## 5. What is Faked / Unavailable Locally

- **Live GitHub REST API**: External repository and commit synchronization requires a live GitHub OAuth app and user token. Seeded records provide offline mock data.
- **Live Vercel & Render APIs**: Vault connections use local placeholder tokens (`iv=''`); live deployment trigger/polling against external cloud APIs requires valid credentials.
- **Live Gmail Integration**: Shows as "connected" via MongoDB `userconnections`; syncing real inbox messages requires active Google OAuth refresh tokens.
- **Live Attack Paths Worker Dispatch**: New live scans require the external worker executor. The `/attack` view is populated using the completed demo scan record.
