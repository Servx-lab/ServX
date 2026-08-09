# Environment Variables Reference — All Services

## Main-UI API (Existing Render)

### Existing Variables (do not change)

| Variable | Value | Purpose |
|----------|-------|---------|
| `ADMIN_EMAIL` | `consolemaster.app@gmail.com,...` | Admin alert recipients |
| `ATTACK_PATHS_EXECUTOR_*` | various | Attack paths executor auth |
| `CLOUDINARY_*` | various | Avatar image upload |
| `ENCRYPTION_KEY` | `0ca854fd...` | AES-256-CBC encryption key |
| `FIREBASE_PROJECT_ID` | `orizon-lab` | Firebase project |
| `FRONTEND_URL` | `http://localhost:8080` | Frontend URL for CORS |
| `GITHUB_APP_ID` | `3049771` | GitHub App ID |
| `GITHUB_APP_NAME` | `ServX-LAB` | GitHub App name |
| `GITHUB_APP_PRIVATE_KEY` | `-----BEGIN RSA...` | GitHub App private key |
| `GITHUB_CLIENT_ID` | `Iv23li...` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | `07a9b3...` | GitHub OAuth client secret |
| `GOOGLE_CLIENT_ID` | `460736...` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google OAuth client secret |
| `GOOGLE_SHEETS_*` | various | New user logging to Google Sheets |
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB connection string |
| `NODE_ENV` | `production` | Environment |
| `OPENAI_API_KEY` | `sk-proj-...` | OpenAI API key |
| `PORT` | `5000` | Server port |
| `REDIS_URL` | `redis://...` | Redis connection string |
| `SPREADSHEET_ID` | `1xA8Ek...` | Google Sheets ID for user logging |
| `SUPABASE_JWT_SECRET` | `sZS3Nr+...` | Supabase JWT verification secret |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Supabase service role key |
| `SUPABASE_URL` | `https://bxmnuz...` | Supabase project URL |
| `refresh_token` | `1//041Fe...` | Google refresh token |

### New Variables (add these)

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `SERVICE_AUTH_TOKEN` | `ServX_Internal_8f9a2b4c6d8e1f3a` | Shared secret for service-to-service auth |
| `AUTOMEDIC_SERVICE_URL` | `https://servx-automedic.onrender.com` | AutoMedic service URL |
| `EXPOSURE_SERVICE_URL` | `https://servx-exposure.onrender.com` | Exposure service URL |

---

## AutoMedic Service (Render Account #1)

| Variable | Required | Example Value | Purpose |
|----------|----------|---------------|---------|
| `NODE_ENV` | Yes | `production` | Environment |
| `PORT` | Yes | `3001` | Server port |
| `SUPABASE_URL` | Yes | `https://bxmnuzqujamyuvsomfdj.supabase.co` | Supabase project URL |
| `SUPABASE_KEY` | Yes | `eyJhbGci...` | Supabase service role key |
| `FRONTEND_URL` | Yes | `https://servx.vercel.app` | Frontend URL for CORS |
| `EXPOSURE_SERVICE_URL` | Yes | `https://servx-exposure.onrender.com` | Exposure service for escalations |
| `SERVICE_AUTH_TOKEN` | Yes | `ServX_Internal_8f9a2b4c6d8e1f3a` | Shared secret (must match all services) |
| `POLL_INTERVAL_MS` | No | `30000` | Polling interval (default: 30000) |
| `MAX_CONCURRENT_POLLS` | No | `50` | Max concurrent polls (default: 50) |

---

## Exposure Analysis Service (Render Account #2)

| Variable | Required | Example Value | Purpose |
|----------|----------|---------------|---------|
| `NODE_ENV` | Yes | `production` | Environment |
| `PORT` | Yes | `3000` | Server port |
| `SUPABASE_URL` | Yes | `https://bxmnuzqujamyuvsomfdj.supabase.co` | Supabase project URL |
| `SUPABASE_KEY` | Yes | `eyJhbGci...` | Supabase service role key |
| `FRONTEND_URL` | Yes | `https://servx.vercel.app` | Frontend URL for CORS |
| `MAIN_API_URL` | Yes | `https://servx-ofak.onrender.com` | Main-UI API URL for GitHub token fetch |
| `SERVICE_AUTH_TOKEN` | Yes | `ServX_Internal_8f9a2b4c6d8e1f3a` | Shared secret (must match all services) |
| `AUTOMEDIC_SERVICE_URL` | No | `https://servx-automedic.onrender.com` | AutoMedic URL (for reference) |
| `SHODAN_API_KEY` | No | — | Shodan API key (future use) |

---

## Shared Secret Rules

### `SERVICE_AUTH_TOKEN`

- **You create it** — any string, any length
- **Must be identical** on all 3 services (Main-UI, AutoMedic, Exposure)
- **Never commit to git** — only in Render env vars
- **Never log the value** — services log "configured" / "NOT SET" only

### Example values (do NOT use these in production)

```
ServX_Internal_8f9a2b4c6d8e1f3a
MySharedSecret_abc123def456ghi789
a8f9a2b4c6d8e1f3a5b7c9d2e4f6a8b0c
```

---

## Environment Variable Flow Diagram

```
                    ┌─────────────────────────┐
                    │      Main-UI API         │
                    │                          │
                    │  SERVICE_AUTH_TOKEN ─────┼──┐
                    │  AUTOMEDIC_SERVICE_URL   │  │
                    │  EXPOSURE_SERVICE_URL    │  │
                    │  SUPABASE_URL            │  │
                    │  SUPABASE_SERVICE_ROLE_  │  │
                    │    KEY                   │  │
                    │  MONGODB_URI             │  │
                    │  REDIS_URL               │  │
                    │  ENCRYPTION_KEY          │  │
                    │  GITHUB_APP_PRIVATE_KEY  │  │
                    │  GITHUB_CLIENT_ID/SECRET │  │
                    └───────────┬─────────────┘  │
                                │                │
                    ┌───────────▼──────────┐    │
                    │   Exposure Service    │    │
                    │                       │    │
                    │  SERVICE_AUTH_TOKEN ──┼────┘ (must match)
                    │  MAIN_API_URL ────────┼──→ calls Main-UI
                    │  SUPABASE_URL         │
                    │  SUPABASE_KEY         │
                    └───────────▲──────────┘
                                │
                    ┌───────────┴──────────┐
                    │   AutoMedic Service   │
                    │                       │
                    │  SERVICE_AUTH_TOKEN ──┼──→ must match Exposure
                    │  EXPOSURE_SERVICE_URL ┼──→ calls Exposure
                    │  SUPABASE_URL         │
                    │  SUPABASE_KEY         │
                    └───────────────────────┘
```
