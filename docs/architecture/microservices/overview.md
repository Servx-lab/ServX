# ServX Microservices Refactoring — Complete Architecture

## Overview

ServX has been refactored from a monolithic backend (`apps/api`) into a **three-service architecture**. The main API still serves the frontend, but two new standalone services handle specialized workloads on separate Render accounts with dedicated resources.

## Services

| Service | Repo | Render Account | Port | Purpose |
|---------|------|----------------|------|---------|
| **Main-UI API** | `Servx-lab/ServX` | Existing | 5000 | Frontend API, auth, GitHub vault, hosting, operations |
| **AutoMedic** | `Servx-lab/Automedic-Pipeline` | Render #1 | 3001 | Deployment log polling, error classification, incident persistence, SSE alerts |
| **Exposure Analysis** | `Servx-lab/Exposure-Analysis` | Render #2 | 3002 | GitHub codebase scanning, error-to-code mapping, secret detection, config auditing |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                                  │
│                    https://servx.vercel.app                             │
└────────────┬──────────────────────────────────┬─────────────────────────┘
             │                                  │
             │ Supabase JWT                     │ Supabase JWT
             ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────────┐
│   Main-UI API        │         │   AutoMedic Service       │
│   (Render: existing) │         │   (Render Account #1)     │
│   Port 5000          │         │   Port 3001               │
│                      │         │                           │
│  - Auth (Supabase)   │         │  - Vercel log fetching    │
│  - GitHub vault      │         │  - Render log fetching    │
│  - Hosting mgmt      │         │  - Error classification   │
│  - Operations        │         │  - Incident persistence   │
│  - Exposure domain   │         │  - SSE real-time alerts   │
│  - Attack paths      │         │  - Polling (30s interval) │
│  - Internal API      │         │                           │
│                      │         │                           │
│  /api/internal/      │         │                           │
│   github-token       │         │                           │
└──────────┬───────────┘         └────────────┬──────────────┘
           │                                  │
           │ X-Service-Token                  │ T2 escalation
           │ (SERVICE_AUTH_TOKEN)             │ + X-Service-Token
           │                                  ▼
           │                     ┌──────────────────────────┐
           └────────────────────►│  Exposure Service        │
                                 │  (Render Account #2)     │
                                 │  Port 3002               │
                                 │                          │
                                 │  - GitHub file fetching  │
                                 │  - Error → code mapping  │
                                 │  - Secret scanning       │
                                 │  - Config auditing       │
                                 │  - Log secret scanning   │
                                 │  - Finding persistence   │
                                 └──────────────────────────┘
```

## Data Flow

### 1. Normal Monitoring Flow
```
AutoMedic polls Vercel/Render APIs every 30s
  → Fetches deployment status + logs
  → Classifies errors (T1 auto-fixable / T2 escalate)
  → Saves incidents to Supabase `incidents` table
  → Streams real-time alerts to frontend via SSE
```

### 2. Escalation Flow (T2 errors)
```
AutoMedic detects a T2 error
  → POST /api/escalate-incident to Exposure Service
     Body: { incidentId, userId, errorLogs, owner, repo, ... }
     Header: X-Service-Token: <SERVICE_AUTH_TOKEN>
  → Exposure Service calls Main-UI API for user's GitHub token
     GET /api/internal/github-token?userId=xxx
     Header: X-Service-Token: <SERVICE_AUTH_TOKEN>
  → Main-UI returns GitHub token (from Supabase github_vault App token or OAuth)
  → Exposure fetches repo files from GitHub API
  → Maps error to specific file/line/commit
  → Scans for leaked secrets (17 regex patterns)
  → Checks config issues (.gitignore, .env, Dockerfile, vercel.json)
  → Persists findings to Supabase `exposure_findings` table
  → Returns analysis to AutoMedic
```

### 3. Manual Scan Flow
```
User clicks "Scan Repository" in frontend
  → POST /api/scan-repo to Exposure Service
     Header: Authorization: Bearer <Supabase JWT>
     Body: { owner, repo }
  → Exposure validates JWT via Supabase
  → Exposure calls Main-UI for GitHub token
  → Exposure fetches repo files + runs all scanners
  → Returns findings to frontend
```

## Authentication Layers

| Communication | Auth Method | Details |
|---------------|-------------|---------|
| Frontend → Main-UI API | Supabase JWT | User's auth token, verified by `requireAuth` middleware |
| Frontend → AutoMedic | Supabase JWT | Same JWT, verified by AutoMedic's `auth.js` middleware |
| Frontend → Exposure | Supabase JWT | Same JWT, verified by Exposure's `auth.js` middleware |
| AutoMedic → Exposure | `SERVICE_AUTH_TOKEN` | Shared secret in `X-Service-Token` header |
| Exposure → Main-UI API | `SERVICE_AUTH_TOKEN` | Same shared secret in `X-Service-Token` header |

## GitHub Token Flow (No Manual Tokens)

```
1. User logs in via Supabase GitHub OAuth
   → Supabase stores provider_token (GitHub OAuth access token)
   → AuthContext calls syncUser() → stores token in Supabase `github_vault`
   → AuthContext calls saveGitHubInstallationToken() → stores in Supabase `github_vault` table

2. User installs ServX GitHub App
   → GitHub redirects to /github?installation_id=xxx
   → Frontend calls POST /api/github/link { installation_id }
   → Main-UI stores installation_id in Supabase `github_vault`

3. Exposure service needs GitHub access:
   → Calls GET /api/internal/github-token?userId=xxx on Main-UI
   → Main-UI tries GitHub App installation token first (5,000 req/hour)
   → Falls back to OAuth token from Supabase github_vault
   → Returns token to Exposure
   → Exposure uses token to fetch repo files via GitHub REST API
```

## Shared Environment Variables

### `SERVICE_AUTH_TOKEN`
- **What:** A shared secret string (you create it, any length)
- **Where:** Set on ALL THREE services — Main-UI, AutoMedic, Exposure
- **Must be:** Identical on all three
- **Purpose:** Proves service-to-service requests are from trusted sources

### `AUTOMEDIC_SERVICE_URL`
- **What:** Full URL of the AutoMedic Render deployment
- **Where:** Main-UI + Exposure
- **Purpose:** Lets Main-UI frontend call AutoMedic endpoints

### `EXPOSURE_SERVICE_URL`
- **What:** Full URL of the Exposure Render deployment
- **Where:** Main-UI
- **Purpose:** Lets Main-UI frontend call Exposure endpoints

### `MAIN_API_URL`
- **What:** Full URL of the Main-UI API Render deployment
- **Where:** Exposure
- **Purpose:** Lets Exposure call Main-UI's internal endpoint for GitHub tokens

## Related Documentation

- [AutoMedic Service — Technical Design](./auto-medic-service.md)
- [Exposure Analysis Service — Technical Design](./exposure-service.md)
- [Service-to-Service Authentication](./service-auth.md)
- [GitHub Token Flow](./github-token-flow.md)
- [Deployment Guide](./deployment-guide.md)
- [Environment Variables Reference](./environment-variables.md)
- [API Endpoints Reference](./api-endpoints.md)
