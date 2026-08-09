# API Endpoints Reference — All Services

## Main-UI API (Port 5000)

### Existing Endpoints (unchanged)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/sync` | Supabase JWT | Sync user to backend |
| GET | `/api/github/repos` | Supabase JWT | List user's GitHub repos |
| GET | `/api/github/repos/:owner/:repo/details` | Supabase JWT | Get repo details |
| POST | `/api/github/link` | Supabase JWT | Link GitHub App installation |
| GET | `/api/github/status` | Supabase JWT | Check GitHub connection status |
| POST | `/api/security/installation-token` | Supabase JWT | Save GitHub installation token |
| GET | `/api/security/vulnerabilities/:owner/:repo` | Supabase JWT | Get repo vulnerability alerts |
| POST | `/api/security/scan-target` | Supabase JWT | DAST scan a live URL |
| GET | `/api/hosting/status/:provider` | Supabase JWT | Get hosting provider status |
| GET | `/api/operations/incidents` | Supabase JWT | Get latest incidents |
| GET | `/api/operations/stream` | Supabase JWT | SSE audit stream |
| POST | `/api/webhooks/github` | GitHub Signature | GitHub webhook handler |
| POST | `/api/webhooks/render/deploy` | Render Webhook | Render deploy webhook |
| POST | `/api/webhooks/vercel/deploy` | Vercel Webhook | Vercel deploy webhook |
| GET | `/api/attack-paths/jobs` | Supabase JWT | List attack path jobs |
| POST | `/api/attack-paths/jobs` | Supabase JWT | Create attack path job |
| GET | `/api/feed` | Supabase JWT | Activity feed |

### New Internal Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/internal/github-token` | `X-Service-Token` | Get user's GitHub token (for trusted services) |
| GET | `/api/internal/attack-paths/*` | HMAC Signature | Attack paths executor callbacks (existing) |

#### `GET /api/internal/github-token`

**Query Parameters:**
- `userId` (required) — Supabase user ID

**Headers:**
- `X-Service-Token` (required) — Must match `SERVICE_AUTH_TOKEN` env var

**Response (200):**
```json
{
  "token": "ghp_xxxxxxxxxxxx",
  "source": "github_app"
}
```

**Response (404):**
```json
{
  "error": "GitHub not connected for this user."
}
```

**Response (401):**
```json
{
  "error": "Unauthorized: invalid service token."
}
```

---

## AutoMedic Service (Port 3001)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/api/logs/vercel` | Supabase JWT | Fetch Vercel deployment logs |
| GET | `/api/logs/render` | Supabase JWT | Fetch Render deployment logs |
| GET | `/api/incidents` | Supabase JWT | List all incidents |
| GET | `/api/incidents/:id` | Supabase JWT | Get single incident by ID |
| GET | `/api/stream` | Supabase JWT (query) | SSE real-time incident stream |
| POST | `/api/escalate` | Supabase JWT | Manually escalate an incident |

### `GET /api/logs/vercel`

**Query Parameters:**
- `projectId` (required) — Vercel project ID
- `deploymentId` (optional) — Specific deployment ID (defaults to latest)

**Response:**
```json
{
  "deployment": { "id": "dpl_xxx", "state": "ERROR", "url": "..." },
  "logs": [
    { "level": "error", "message": "Build failed", "timestamp": "..." }
  ]
}
```

### `GET /api/stream`

**Query Parameters:**
- `token` (required) — Supabase JWT (passed as query param for EventSource compatibility)

**Response:** Server-Sent Events stream
```
event: incident
data: {"id":"xxx","severity":"HIGH","message":"Build failed",...}

event: heartbeat
data: {"timestamp":"..."}
```

---

## Exposure Analysis Service (Port 3002)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/api/escalate-incident` | `X-Service-Token` | Receive escalation from AutoMedic |
| POST | `/api/scan-repo` | Supabase JWT | Manually trigger codebase scan |
| GET | `/api/findings` | Supabase JWT | Get exposure findings for user |
| DELETE | `/api/findings/:id` | Supabase JWT | Resolve a finding |
| GET | `/api/logs/scan` | Supabase JWT | Scan deployment logs for secrets |

### `POST /api/escalate-incident`

**Headers:**
- `X-Service-Token` (required) — Must match `SERVICE_AUTH_TOKEN`

**Body:**
```json
{
  "incidentId": "inc_xxx",
  "userId": "supabase-uid",
  "provider": "vercel",
  "projectId": "prj_xxx",
  "deploymentId": "dpl_xxx",
  "errorLogs": [
    { "message": "SyntaxError: Unexpected token in src/app.ts:10:5" }
  ],
  "errorSignature": "vercel:prj_xxx:syntax_error:abc123",
  "classification": "T2",
  "owner": "Servx-lab",
  "repo": "ServX"
}
```

**Response:**
```json
{
  "success": true,
  "incidentId": "inc_xxx",
  "repo": "Servx-lab/ServX",
  "branch": "main",
  "rootCause": {
    "file": "src/app.ts",
    "line": 10,
    "column": 5,
    "codeLine": "const x = ;",
    "errorSource": "typescript",
    "commit": { "sha": "abc123", "message": "Fix typo", "author": "dev", "date": "..." }
  },
  "locations": [
    { "file": "src/app.ts", "line": 10, "column": 5, "source": "typescript", "codeLine": "const x = ;" }
  ],
  "commits": [
    { "sha": "abc123", "message": "Fix typo", "files": [...] }
  ],
  "secretFindings": 2,
  "configFindings": 1,
  "totalFindings": 3,
  "persisted": 3,
  "findings": [...]
}
```

### `POST /api/scan-repo`

**Headers:**
- `Authorization: Bearer <supabase-jwt>` (required)

**Body:**
```json
{
  "owner": "Servx-lab",
  "repo": "ServX"
}
```

**Response:**
```json
{
  "success": true,
  "repo": "Servx-lab/ServX",
  "branch": "main",
  "filesScanned": 45,
  "secretFindings": 0,
  "configFindings": 2,
  "totalFindings": 2,
  "persisted": 2,
  "findings": [
    {
      "type": "gitignore_missing_entry",
      "file": ".gitignore",
      "severity": "HIGH",
      "detail": ".gitignore does not ignore .env",
      "remediation": "Add .env to your .gitignore file."
    }
  ]
}
```

### `GET /api/findings`

**Headers:**
- `Authorization: Bearer <supabase-jwt>` (required)

**Query Parameters:**
- `category` (optional) — Filter by category
- `resolved` (optional) — Filter by resolved status (`true`/`false`)
- `limit` (optional) — Max results (default: 100)

**Response:**
```json
{
  "findings": [
    {
      "id": "uuid",
      "user_id": "supabase-uid",
      "severity": "CRITICAL",
      "title": "Leaked AWS Access Key",
      "description": "AKIA... key found in src/config.js",
      "remediation": "Remove the key and rotate it immediately.",
      "category": "codebase",
      "resolved": false,
      "metadata": {
        "source": "codebase_scan",
        "file": "src/config.js",
        "line": 15,
        "type": "aws_access_key"
      },
      "created_at": "2026-08-10T..."
    }
  ]
}
```

### `DELETE /api/findings/:id`

**Headers:**
- `Authorization: Bearer <supabase-jwt>` (required)

**Response:**
```json
{
  "success": true,
  "id": "uuid"
}
```

### `GET /api/logs/scan`

**Headers:**
- `Authorization: Bearer <supabase-jwt>` (required)

**Query Parameters:**
- `provider` (required) — `vercel` or `render`
- `projectId` (required for Vercel) — Vercel project ID
- `deploymentId` (required for Vercel) — Vercel deployment ID
- `serviceId` (required for Render) — Render service ID

**Response:**
```json
{
  "logsScanned": 150,
  "findings": 1,
  "details": [
    {
      "type": "github_pat",
      "severity": "CRITICAL",
      "source": "runtime_log",
      "snippet": "ghp_...[REDACTED]...abcd"
    }
  ]
}
```
