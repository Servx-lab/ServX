# Hosting API Validation Architecture

## Overview
The ServX platform allows users to connect third-party hosting providers (Render, Vercel, Railway, etc.) via Personal Access Tokens or API keys. To ensure reliability and security, the backend employs a "Pre-Flight Validation" strategy before persisting any keys to the database.

## Pre-Flight Validation Flow
When a user submits an API key for a hosting provider, the `saveHostingToken` service function is triggered in `apps/api/src/domains/connections/service.ts`.

1. **Provider Mapping**: The provider key is mapped against `HOSTING_PROVIDERS` to determine the correct validation strategy.
2. **Pre-Flight Request**: A test request is made to the provider's API (e.g., fetching user details or projects) using the submitted token.
3. **HTTP 401/403 Catching**: If the provider returns an HTTP 401 (Unauthorized) or 403 (Forbidden), the backend explicitly rejects the token and throws a `ValidationError`. 
4. **Encryption and Storage**: Only if the pre-flight request succeeds is the token encrypted and stored in the `hosting_vault` table.

## Status Polling (`getHostingProviderStatus`)
When the frontend loads the Hosting Integration Dashboard, it requests the current status of the saved token.
- If the token was revoked externally, the provider API will return a 401/403.
- The `getHostingProviderStatus` function catches these auth errors and immediately returns `{ connected: false, error: 'Invalid API Key' }`.
- The frontend `HostingIntegrationCard` detects this error payload and displays an alert in the UI, prompting the user to update their credentials.

## API Key Deletion
Users have full control over their integrations. The `DELETE /api/connections/hosting/:provider` endpoint allows users to instantly remove their encrypted tokens from the Supabase `hosting_vault` using a verified, owner-scoped query:
```typescript
await supabaseAdmin
  .from('hosting_vault')
  .delete()
  .eq('user_id', ownerUid)
  .eq('provider', providerDbName);
```
