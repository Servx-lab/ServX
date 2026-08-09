# GitHub Token Flow — How ServX Accesses User Repositories

## Overview

ServX never asks users to manually paste GitHub tokens. Instead, users authenticate via Supabase GitHub OAuth and/or install the ServX GitHub App. Tokens are stored securely and fetched on-demand by services that need them.

## Two Token Sources

### 1. GitHub OAuth Token (Supabase `github_vault`)

**When:** User logs in via Supabase GitHub OAuth

**Flow:**
1. User clicks "Sign in with GitHub" in frontend
2. Supabase Auth handles OAuth flow with GitHub
3. Supabase returns `session.provider_token` (GitHub OAuth access token)
4. Frontend `AuthContext.tsx` calls `syncUser()` → POST `/api/auth/sync`
5. Main-UI API stores token in Supabase `github_vault` table:
   ```sql
   INSERT INTO github_vault (
     user_id, github_id, github_username,
     encrypted_access_token, encrypted_refresh_token,
     iv, token_expiry
   )
   ```
6. Frontend also calls `saveGitHubInstallationToken()` → POST `/api/security/installation-token`
7. Main-UI API encrypts and stores in MongoDB `User` collection

**Token refresh:**
- OAuth tokens expire (typically 8 hours)
- `getGithubToken(uid)` checks expiry and auto-refreshes using `refresh_token`
- Refresh flow: POST to `https://github.com/login/oauth/access_token` with `grant_type=refresh_token`
- New tokens encrypted and stored back in `github_vault`

### 2. GitHub App Installation Token (MongoDB `User` collection)

**When:** User installs the ServX GitHub App

**Flow:**
1. User clicks "Install ServX-Lab GitHub App" in frontend
2. Redirected to `https://github.com/apps/servx-lab/installations/new`
3. User selects repositories to grant access to
4. GitHub redirects back to `https://servx.vercel.app/github?installation_id=xxx`
5. Frontend calls POST `/api/github/link` with `{ installation_id }`
6. Main-UI stores `installation_id` in Supabase `github_vault`:
   ```sql
   INSERT INTO github_vault (
     user_id, installation_id,
     status, iv, encrypted_access_token
   )
   ```
7. Frontend calls `saveGitHubInstallationToken(token, installationId)` → POST `/api/security/installation-token`
8. Main-UI encrypts the installation token and stores in MongoDB:
   ```javascript
   User.findOneAndUpdate(
     { id: userId },
     {
       githubInstallationTokenEncrypted: encrypted.content,
       githubInstallationTokenIv: encrypted.iv,
       githubInstallationId: installationId,
       githubInstallationTokenUpdatedAt: new Date(),
     }
   )
   ```

**Advantages of GitHub App tokens:**
- Higher rate limits: 5,000 requests/hour per installation (vs 5,000/hour per token for OAuth)
- Fine-grained repository access (user selects which repos)
- Automatically scoped to the installation
- Can be refreshed by re-authorizing the app

## How Services Fetch the Token

### Main-UI API (Direct Access)

Main-UI has direct access to both token stores:

```typescript
// From Supabase github_vault (OAuth token)
import { getGithubToken } from './domains/github/service';
const { accessToken } = await getGithubToken(uid);

// From MongoDB User collection (App installation token)
import { getUserInstallationToken } from './services/githubInstallationTokenStore';
const installationToken = await getUserInstallationToken(uid);
```

### Exposure Service (Via Main-UI Internal API)

Exposure does NOT have MongoDB access. It calls the Main-UI internal endpoint:

```
GET /api/internal/github-token?userId=<supabase_uid>
Header: X-Service-Token: <SERVICE_AUTH_TOKEN>
```

**Main-UI internal endpoint** (`apps/api/src/domains/internal/router.ts`):

```typescript
router.get('/github-token', async (req, res) => {
  const userId = req.query.userId;

  // Try installation token first (higher rate limits)
  try {
    const installationToken = await getUserInstallationToken(userId);
    if (installationToken) {
      res.json({ token: installationToken, source: 'github_app' });
      return;
    }
  } catch { /* fall through */ }

  // Fall back to OAuth token
  try {
    const { accessToken } = await getGithubToken(userId);
    if (accessToken) {
      res.json({ token: accessToken, source: 'oauth' });
      return;
    }
  } catch { /* no token available */ }

  res.status(404).json({ error: 'GitHub not connected for this user.' });
});
```

### AutoMedic

AutoMedic does NOT need GitHub tokens. It only:
- Fetches Vercel/Render deployment logs (using hosting credentials from Supabase `hosting_vault`)
- Escalates errors to the Exposure service (passing `owner`/`repo` in the payload)

## Token Storage Security

| Storage | Encryption | Key |
|---------|-----------|-----|
| Supabase `github_vault` | AES-256-CBC (if IV present) or plaintext (legacy) | `ENCRYPTION_KEY` env var |
| MongoDB `User.githubInstallationTokenEncrypted` | AES-256-CBC | `ENCRYPTION_KEY` env var |

**Decryption flow (Supabase):**
```typescript
if (vaultData.iv && vaultData.iv !== '') {
  accessToken = decrypt({ iv: vaultData.iv, content: vaultData.encrypted_access_token });
}
```

**Decryption flow (MongoDB):**
```typescript
return decrypt({
  content: user.githubInstallationTokenEncrypted,
  iv: user.githubInstallationTokenIv,
});
```

## Redis Caching

To avoid repeated Supabase/MongoDB round-trips, the Main-UI API caches decrypted GitHub tokens in Redis:

```typescript
const GH_TOKEN_TTL = 300; // 5 minutes
const ghTokenCacheKey = (uid: string) => `gh:token:${uid}`;

// Cache hit → return immediately
// Cache miss → fetch from Supabase, decrypt, cache for 5 min
```

## Webhook Integration

When a user uninstalls the ServX GitHub App:

1. GitHub sends a webhook to `POST /api/webhooks/github`
2. Main-UI verifies GitHub signature
3. If `event === 'installation'` and `action === 'deleted'`:
   - Removes `installationId` from MongoDB `UserConnection` records
   - Sets connection status to `pending`

## Related Files

| File | Purpose |
|------|---------|
| `apps/api/src/domains/github/service.ts` | `getGithubToken()`, `refreshGithubToken()`, `fetchRepos()` |
| `apps/api/src/domains/github/controller.ts` | `linkInstallation()`, `getGitHubStatus()` |
| `apps/api/src/services/githubInstallationTokenStore.ts` | MongoDB installation token CRUD |
| `apps/api/src/domains/security/controller.ts` | `saveInstallationToken()` endpoint |
| `apps/api/src/domains/internal/router.ts` | Internal endpoint for Exposure service |
| `apps/web/src/features/auth/AuthContext.tsx` | OAuth flow, token saving on login |
| `apps/web/src/features/github/api.ts` | `saveGitHubInstallationToken()` frontend API |
| `apps/api/src/domains/webhooks/router.ts` | GitHub App lifecycle webhooks |
| `packages/crypto/index.ts` | AES-256-CBC encrypt/decrypt helpers |
