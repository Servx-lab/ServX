# API domain: Gmail (`/api/...`)

**Router:** `apps/api/src/domains/gmail/router.ts`  
**Mounted at:** `app.use('/api', gmailRouter)` — paths are **prefixed with `/api`** only once.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/google/url` | requireAuth | Google OAuth URL for Gmail scopes |
| GET | `/api/auth/google/callback` | — | Callback |
| GET | `/api/gmail/status` | requireAuth | Gmail connection status |
| GET | `/api/gmail/inbox` | requireAuth | Fetch inbox |

**Files:** `domains/gmail/controller.ts`, `service.ts`, `model.ts`, `types.ts`
