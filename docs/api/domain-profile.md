# API domain: Profile (`/api/profile`)

**Router:** `apps/api/src/domains/profile/router.ts`  
**Controller / service:** `domains/profile/controller.ts`, `service.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/profile` | requireAuth | Read profile fields from Mongo `User` |
| PUT | `/api/profile` | requireAuth | Update username, name, surname |
| POST | `/api/profile/send-email-otp` | requireAuth | Start email verification |
| POST | `/api/profile/verify-email` | requireAuth | Verify OTP |
