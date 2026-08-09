# Service-to-Service Authentication

## Overview

ServX uses a **shared secret token** (`SERVICE_AUTH_TOKEN`) for authenticating requests between trusted backend services. This is separate from user-facing authentication (Supabase JWT).

## Why Not JWT for Service-to-Service?

1. **Services don't have user sessions** — AutoMedic polls APIs on a timer, no user is "logged in"
2. **Simplicity** — A shared secret in a header is simpler than generating service JWTs
3. **Low latency** — No token generation/validation overhead on every service-to-service call
4. **Sufficient security** — Combined with HTTPS (Render enforces TLS), a shared secret is adequate for trusted service communication

## How It Works

```
Service A (caller)                      Service B (receiver)
    |                                        |
    |  HTTP Request                          |
    |  Header: X-Service-Token: <secret>     |
    |  ------------------------------------> |
    |                                        |
    |                    Compare X-Service-Token
    |                    against SERVICE_AUTH_TOKEN
    |                    env var              |
    |                                        |
    |              Match → 200 OK            |
    |  <------------------------------------ |
    |                                        |
    |              No match → 401            |
    |  <------------------------------------ |
```

## Implementation

### Sender (AutoMedic → Exposure)

File: `Automedic-Pipeline/src/services/escalationService.js`

```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-Service-Token': env.serviceAuthToken,
};
await fetch(`${env.exposureServiceUrl}/api/escalate-incident`, {
  method: 'POST',
  headers,
  body: JSON.stringify(escalationPayload),
});
```

### Sender (Exposure → Main-UI)

File: `Exposure-Analysis/src/services/credentialService.js`

```javascript
const res = await fetch(
  `${env.mainApiUrl}/api/internal/github-token?userId=${encodeURIComponent(userId)}`,
  {
    headers: {
      'X-Service-Token': env.serviceAuthToken,
      'Content-Type': 'application/json',
    },
  }
);
```

### Receiver (Main-UI API)

File: `Main-UI/apps/api/src/domains/internal/router.ts`

```typescript
function requireServiceToken(req: Request, res: Response, next: NextFunction): void {
  const provided = req.header('X-Service-Token')?.trim();
  const expected = process.env.SERVICE_AUTH_TOKEN?.trim();

  if (!expected) {
    res.status(503).json({ error: 'Service auth not configured on Main API.' });
    return;
  }

  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized: invalid service token.' });
    return;
  }

  next();
}

router.use(requireServiceToken);
```

### Receiver (Exposure Service)

File: `Exposure-Analysis/src/routes/scan.js` (escalate-incident endpoint)

```javascript
// Validate SERVICE_AUTH_TOKEN from AutoMedic
const provided = req.headers['x-service-token'];
const expected = env.serviceAuthToken;
if (!provided || provided !== expected) {
  return res.status(401).json({ error: 'Unauthorized: invalid service token.' });
}
```

## Which Services Need It

| Service | Has `SERVICE_AUTH_TOKEN`? | Role |
|---------|--------------------------|------|
| **Main-UI API** | ✅ Yes | Receiver — validates tokens from Exposure |
| **Exposure Service** | ✅ Yes | Both — receives from AutoMedic, sends to Main-UI |
| **AutoMedic** | ✅ Yes | Sender — sends to Exposure when escalating |

## Security Considerations

1. **HTTPS only** — Render enforces TLS, so the token is never sent in plaintext over the wire
2. **Timing-safe comparison** — The Main-UI implementation uses string comparison; for production, consider using `crypto.timingSafeEqual` (as done in the attack-paths HMAC auth)
3. **Token rotation** — If compromised, update `SERVICE_AUTH_TOKEN` on all three services and redeploy
4. **No token in URLs** — Always sent in headers, never as a query parameter
5. **No token in logs** — The services log "configured" / "NOT SET" but never the actual value

## Creating the Token

You create it yourself — any string, any length. Example:

```
ServX_Internal_8f9a2b4c6d8e1f3a
```

Rules:
- Use letters, numbers, no spaces
- Make it hard to guess (don't use "password" or "secret")
- Must be **identical** on all three services
- Store it only in Render environment variables (never in code or git)
