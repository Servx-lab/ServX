# Domain: Internal Services

**Route:** `/api/internal`  
**Location:** `apps/api/src/domains/internal/`

This domain exposes critical internal endpoints strictly reserved for service-to-service communication within the ServX microservice mesh (e.g., AutoMedic and Exposure Analysis).

## Security Perimeter
**Guard:** `requireServiceToken` middleware.
All routes require the `X-Service-Token` header. This token is verified symmetrically against the `SERVICE_AUTH_TOKEN` environment variable. Any request lacking a valid symmetric token is immediately rejected with a `401 Unauthorized` or `503 Service Unavailable`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/github-token` | Used by the Exposure Analysis service to fetch ephemeral GitHub tokens for codebase scanning. |

## Token Resolution Logic
The `/github-token` endpoint accepts a `userId` query parameter and attempts to resolve a token in the following priority:
1. **GitHub App Installation Token:** High rate limits (5,000 req/hr), heavily scoped.
2. **OAuth Access Token:** Retrieved from the Supabase `github_vault` if an installation token is unavailable.
