# Profile settings

**Route:** `/settings/profile`  
**File:** `apps/web/src/pages/ProfileSettings.tsx`

User profile: username, name, surname, email verification via OTP flow.

## APIs

- `GET /api/profile` — load profile
- `PUT /api/profile` — update fields
- `POST /api/profile/send-email-otp`, `POST /api/profile/verify-email`

See [api/domain-profile.md](../../api/domain-profile.md).
