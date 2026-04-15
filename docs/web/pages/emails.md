# Emails (Gmail)

**Route:** `/emails`  
**Feature:** `apps/web/src/features/emails/`

Email inbox / Gmail integration UI (depends on Google OAuth and backend Gmail domain).

## APIs

- `GET /api/auth/google/url` (under mounted gmail router — see app registration)
- `GET /api/gmail/status`, `GET /api/gmail/inbox`

Exact paths: Gmail router is mounted at `app.use('/api', gmailRouter)` — see [api/domain-gmail.md](../../api/domain-gmail.md).

## Files

- `api.ts`, `hooks.ts`, `types.ts`, feature `index.tsx`
