# AutoMedic Service — Technical Design

## Overview

AutoMedic is a standalone Express microservice that monitors deployment health by polling Vercel and Render APIs for deployment failures, classifying errors, persisting incidents, streaming real-time alerts via SSE, and escalating complex errors to the Exposure Analysis service.

- **Repository:** https://github.com/Servx-lab/Automedic-Pipeline.git
- **Render Account:** #1 (dedicated, 512 MB RAM)
- **Port:** 3001
- **Runtime:** Node.js (CommonJS)

## File Structure

```
Automedic-Pipeline/
├── package.json
├── render.yaml
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── server.js                    # Entry point — starts Express + polling loop
    ├── app.js                       # Express app setup, CORS, routes, error handling
    ├── config/
    │   └── env.js                   # Environment variable loading + validation
    ├── middleware/
    │   └── auth.js                  # Supabase JWT verification middleware
    ├── routes/
    │   ├── logs.js                  # GET /api/logs/vercel, GET /api/logs/render
    │   ├── incidents.js             # GET /api/incidents, GET /api/incidents/:id
    │   ├── stream.js                # GET /api/stream (SSE endpoint)
    │   └── escalate.js              # POST /api/escalate (manual escalation)
    ├── services/
    │   ├── credentialService.js     # Fetch hosting credentials from Supabase
    │   ├── vercelLogService.js      # Fetch Vercel deployment status + logs
    │   ├── renderLogService.js      # Fetch Render deployment status + logs
    │   ├── errorClassifier.js       # Regex-based T1/T2 error classification
    │   ├── incidentService.js       # Save/query incidents in Supabase
    │   ├── escalationService.js     # Forward T2 incidents to Exposure service
    │   └── pollingService.js        # Main polling loop (30s interval)
    └── utils/
        └── supabase.js              # Supabase client singleton
```

## Core Services

### Polling Service (`pollingService.js`)

The heart of AutoMedic. Runs a continuous loop that:

1. Fetches all users' hosting credentials from Supabase `hosting_vault`
2. For each user with Vercel/Render credentials:
   - Fetches latest deployments via Vercel/Render API
   - Checks if any deployment has status `ERROR` or `FAILED`
   - If failed, fetches deployment logs
   - Passes logs to the error classifier
3. Classifies errors into tiers:
   - **T1 (Auto-fixable):** Common errors like missing env vars, build timeouts, module not found
   - **T2 (Escalate):** Complex errors requiring codebase analysis
4. Saves incidents to Supabase `incidents` table
5. Broadcasts new incidents via SSE to connected frontends
6. For T2 errors, calls the Exposure service's `/api/escalate-incident` endpoint

**Polling interval:** 30 seconds (configurable via `POLL_INTERVAL_MS`)
**Max concurrent polls:** 50 (configurable via `MAX_CONCURRENT_POLLS`)

### Error Classifier (`errorClassifier.js`)

Regex-based classification engine. Zero AI tokens, zero external API calls.

**T1 Patterns (auto-fixable):**
- Missing environment variables
- Build timeouts
- Module not found errors
- Port already in use
- Package install failures

**T2 Patterns (escalate to Exposure):**
- TypeScript type errors
- Runtime exceptions with stack traces
- Import/export errors
- Syntax errors
- Unknown/unrecognized errors

### Vercel Log Service (`vercelLogService.js`)

- Fetches latest deployments via `GET /v6/deployments`
- Checks deployment state (`ERROR`, `QUEUED`, `BUILDING`, `READY`)
- Fetches build logs via `GET /v2/deployments/{id}/events`
- Returns structured log array: `{ level, message, timestamp }`

### Render Log Service (`renderLogService.js`)

- Fetches services via `GET /v1/services`
- Checks deploy status for each service
- Fetches logs via `GET /v1/logs?resource={serviceId}`
- Returns structured log array: `{ severity, message, timestamp, type }`

### Incident Service (`incidentService.js`)

- Saves incidents to Supabase `incidents` table
- Generates error signature for deduplication: `provider:projectId:errorType:hash`
- Prevents duplicate incidents for the same error
- Provides query endpoints for frontend

### Escalation Service (`escalationService.js`)

- Forwards T2 incidents to Exposure service
- Sends: `incidentId`, `userId`, `errorLogs`, `errorSignature`, `classification`, `owner`, `repo`
- Includes `X-Service-Token` header for service auth
- Fire-and-forget (doesn't block the polling loop)

### SSE Stream (`stream.js`)

- Endpoint: `GET /api/stream`
- Maintains list of connected clients
- Broadcasts new incidents in real-time
- Sends heartbeat every 15 seconds to keep connection alive
- Client-side: `EventSource` API in frontend

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/api/logs/vercel?projectId=xxx` | Supabase JWT | Fetch Vercel deployment logs |
| GET | `/api/logs/render?serviceId=xxx` | Supabase JWT | Fetch Render deployment logs |
| GET | `/api/incidents` | Supabase JWT | List all incidents |
| GET | `/api/incidents/:id` | Supabase JWT | Get single incident |
| GET | `/api/stream` | Supabase JWT (query param) | SSE real-time incident stream |
| POST | `/api/escalate` | Supabase JWT | Manually escalate an incident |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment |
| `FRONTEND_URL` | No | http://localhost:5173 | Frontend URL for CORS |
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_KEY` | Yes | — | Supabase service role key |
| `EXPOSURE_SERVICE_URL` | Yes | — | Exposure service URL for escalations |
| `SERVICE_AUTH_TOKEN` | Yes | — | Shared secret for service auth |
| `POLL_INTERVAL_MS` | No | 30000 | Polling interval in milliseconds |
| `MAX_CONCURRENT_POLLS` | No | 50 | Max concurrent deployment polls |

## Supabase Tables Used

- `hosting_vault` — Hosting provider credentials (Vercel/Render tokens)
- `incidents` — Detected deployment incidents

## Render Deployment

1. Connect `Servx-lab/Automedic-Pipeline` repo to Render
2. Create Web Service
3. Build: `npm install`
4. Start: `npm start`
5. Add all env vars from `.env.example`
6. Health check: `/health`
