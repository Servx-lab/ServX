# Exposure Analysis Service — Technical Design

## Overview

Exposure Analysis is a standalone Express microservice that receives escalated errors from AutoMedic, fetches GitHub repository files via the GitHub REST API, maps deployment errors to specific code locations and commits, scans for leaked secrets, audits configuration files, and persists all findings to Supabase.

- **Repository:** https://github.com/Servx-lab/Exposure-Analysis.git
- **Render Account:** #2 (dedicated, 512 MB RAM)
- **Port:** 3002
- **Runtime:** Node.js (CommonJS)

## File Structure

```
Exposure-Analysis/
├── package.json
├── render.yaml
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── server.js                      # Entry point
    ├── app.js                         # Express app, CORS, routes, error handling
    ├── config/
    │   └── env.js                     # Environment variable loading + validation
    ├── middleware/
    │   └── auth.js                    # Supabase JWT verification middleware
    ├── routes/
    │   ├── scan.js                    # POST /api/escalate-incident, POST /api/scan-repo
    │   ├── findings.js                # GET /api/findings, DELETE /api/findings/:id
    │   └── logs.js                    # GET /api/logs/scan (scan deployment logs)
    ├── services/
    │   ├── githubFileFetcher.js       # GitHub API: repo meta, git tree, file blobs, commits
    │   ├── errorMapper.js             # Parse error logs → match to repo files → fetch commit
    │   ├── secretScanner.js           # 17 regex patterns for secret detection
    │   ├── configChecker.js           # .gitignore, .env, Dockerfile, vercel.json checks
    │   ├── logScanner.js              # Fetch Vercel/Render logs + scan for leaked secrets
    │   ├── findingService.js          # Persist/retrieve findings in Supabase
    │   ├── credentialService.js       # Get hosting creds + GitHub token (via Main-UI API)
    │   └── scanOrchestrator.js        # Coordinate full scan + escalation handling
    └── utils/
        └── supabase.js                # Supabase client singleton
```

## Core Services

### GitHub File Fetcher (`githubFileFetcher.js`)

Fetches repository files via the GitHub REST API — **no git clone needed**.

**Flow:**
1. `fetchRepoMeta(token, owner, repo)` → Gets default branch, repo metadata
2. `fetchGitTree(token, owner, repo, branch)` → Gets recursive file tree
3. Filter to security-relevant files (`.js`, `.ts`, `.env`, `Dockerfile`, `vercel.json`, etc.)
4. Exclude noise (`node_modules/`, `dist/`, `.git/`, images, lock files)
5. Score files by security relevance (routes, auth, middleware, .env, config files score higher)
6. `fetchFileBlob(token, owner, repo, sha)` → Fetches top N file contents (base64 decoded)
7. `fetchLatestCommitForFile(token, owner, repo, filePath)` → Gets last commit that touched a file
8. `fetchCommitDetails(token, owner, repo, commitSha)` → Gets full commit diff

**Max files fetched:** 60 (configurable, prioritized by security relevance)

**Relevant file scoring:**
- `.env` files: +15
- Config files (Dockerfile, vercel.json, render.yaml, .gitignore): +12
- Files matching `route|router|controller|middleware|auth|guard|db|sql|api`: +10
- `.ts`/`.js` files: +5

### Error Mapper (`errorMapper.js`)

Parses error logs and maps them to specific repository files and lines.

**Error location extraction patterns:**
1. **Node.js stack traces:** `at someFunc (path/to/file.ts:10:5)`
2. **Vite build errors:** `> path/to/file.ts:10:5`
3. **TypeScript errors:** `file.ts(10,5): error TS1234: ...`
4. **Generic file:line:** `file.ts:10`
5. **Missing modules:** `Cannot find module './path'`

**Mapping flow:**
1. Extract all file/line locations from error logs
2. Match locations against fetched repo files (exact path → basename → partial path)
3. For missing module errors, search for import statements that reference the missing path
4. Fetch the latest commit for the primary error file
5. Fetch commit details (files changed, patch diff)
6. Return: `{ locations, rootCause: { file, line, codeLine, commit }, commits }`

### Secret Scanner (`secretScanner.js`)

Regex-based secret detection. Zero dependencies, zero tokens.

**17 secret patterns detected:**

| Pattern | Severity | Type |
|---------|----------|------|
| AWS Access Key (`AKIA...`) | CRITICAL | `aws_access_key` |
| AWS Secret Key | CRITICAL | `aws_secret_key` |
| GitHub PAT (`ghp_...`) | CRITICAL | `github_pat` |
| GitHub Fine-grained (`github_pat_...`) | CRITICAL | `github_fine_grained` |
| GitHub OAuth (`gho_...`) | CRITICAL | `github_oauth` |
| GitHub App (`ghu_...`/`ghs_...`) | CRITICAL | `github_app` |
| JWT Token (`eyJ...`) | HIGH | `jwt` |
| Stripe Live Key (`sk_live_...`) | CRITICAL | `stripe_live` |
| Stripe Restricted (`rk_live_...`) | CRITICAL | `stripe_restricted` |
| Google API Key (`AIza...`) | HIGH | `google_api_key` |
| Slack Token (`xox...`) | HIGH | `slack_token` |
| Twilio API Key (`SK...`) | HIGH | `twilio` |
| OpenAI API Key (`sk-...`) | CRITICAL | `openai_key` |
| Generic API Key | HIGH | `generic_api_key` |
| Bearer Token | MEDIUM | `bearer_token` |
| Private Key Block (`-----BEGIN...`) | CRITICAL | `private_key` |
| Database Connection String | CRITICAL | `db_connection_string` |

**Safe file handling:**
- `.env.example`, `README.md`, `package.json` are scanned but only flagged if values look real (not placeholders like `your_xxx_here`, `xxxx`, `<xxx>`)

**Output masking:**
- Secrets in snippets are masked: `ghp_...[REDACTED]...abcd`

### Config Checker (`configChecker.js`)

Audits repository configuration for security misconfigurations.

**Checks performed:**

1. **`.gitignore` check:**
   - Missing `.gitignore` → HIGH
   - `.gitignore` doesn't ignore `.env` → HIGH
   - `.gitignore` doesn't ignore `node_modules/` → HIGH

2. **`.env` committed check:**
   - `.env` file found in repo → CRITICAL
   - Checks if values look real (not placeholders)

3. **Dockerfile check:**
   - No `USER` directive (runs as root) → MEDIUM
   - No `HEALTHCHECK` instruction → LOW

4. **`vercel.json` check:**
   - Missing CSP header → MEDIUM
   - Wildcard CORS (`*`) → HIGH
   - Invalid JSON → MEDIUM

### Log Scanner (`logScanner.js`)

Fetches runtime deployment logs and scans them for leaked secrets.

- `fetchVercelRuntimeLogs(token, projectId, deploymentId)` → Vercel runtime logs API
- `fetchRenderLogs(token, serviceId)` → Render logs API
- `scanLogsForSecrets(logs)` → Reuses `secretScanner.scanFile()` on each log line

### Finding Service (`findingService.js`)

Persists findings to Supabase `exposure_findings` table.

- **Deduplication:** `dedupe_key = codebase:{userId}:{file}:{type}:{line}`
- **Upsert:** Uses `onConflict: 'user_id,dedupe_key'` to avoid duplicates
- **Fields:** `user_id`, `asset_value`, `category`, `severity`, `title`, `description`, `remediation`, `metadata`, `resolved`

### Scan Orchestrator (`scanOrchestrator.js`)

Coordinates the full scanning pipeline.

**`scanCodebase(params)`:**
1. Fetch repo files from GitHub
2. Run secret scanner on all files
3. Run config checker on all files
4. Persist all findings to Supabase
5. Return summary

**`handleEscalation(params)`:**
1. Fetch repo files from GitHub
2. Map error logs to code locations (errorMapper)
3. Run secret scanner
4. Run config checker
5. Persist all findings to Supabase
6. Return: `{ rootCause, locations, commits, secretFindings, configFindings }`

### Credential Service (`credentialService.js`)

**`getGithubToken(userId)`:**
- Calls Main-UI API: `GET /api/internal/github-token?userId=xxx`
- Sends `X-Service-Token` header for auth
- Main-UI tries GitHub App installation token first (5,000 req/hour)
- Falls back to OAuth token from Supabase `github_vault`
- Returns token string or null

**`getHostingCredentials(userId, provider)`:**
- Reads from Supabase `hosting_vault` table
- Decrypts stored credentials
- Returns `{ token }` or null

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/api/escalate-incident` | `SERVICE_AUTH_TOKEN` | Receive escalation from AutoMedic |
| POST | `/api/scan-repo` | Supabase JWT | Manually trigger codebase scan |
| GET | `/api/findings` | Supabase JWT | Get exposure findings for user |
| DELETE | `/api/findings/:id` | Supabase JWT | Resolve a finding |
| GET | `/api/logs/scan` | Supabase JWT | Scan deployment logs for secrets |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3002 | Server port |
| `NODE_ENV` | No | development | Environment |
| `FRONTEND_URL` | No | http://localhost:5173 | Frontend URL for CORS |
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_KEY` | Yes | — | Supabase service role key |
| `MAIN_API_URL` | Yes | — | Main-UI API URL for GitHub token fetch |
| `SERVICE_AUTH_TOKEN` | Yes | — | Shared secret for service auth |
| `AUTOMEDIC_SERVICE_URL` | No | — | AutoMedic service URL |
| `SHODAN_API_KEY` | No | — | Shodan API key (future use) |

## Supabase Tables Used

- `exposure_findings` — All security findings (secrets, config issues)
- `hosting_vault` — Hosting provider credentials (for log scanning)

## Render Deployment

1. Connect `Servx-lab/Exposure-Analysis` repo to Render
2. Create Web Service
3. Build: `npm install`
4. Start: `npm start`
5. Add all env vars from `.env.example`
6. Health check: `/health`
