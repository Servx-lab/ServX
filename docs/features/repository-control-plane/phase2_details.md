# Repository Control Plane - Phase 2 Details

## Objective
Establish the backend Node.js/Express infrastructure to handle repository registrations, unique `SERVX_PIN` generation, cryptographic token management, and maintenance state toggling.

## Architecture

### 1. Cryptographic Security (`crypto.ts`)
To securely store GitHub tokens in our database per Phase 1 requirements, we've implemented an AES-256-GCM encryption utility.
- It uses the server's `ENCRYPTION_KEY` (32 bytes).
- GCM provides authenticated encryption, returning an `authTag` that prevents tampering.

### 2. Service Layer (`repositories/service.ts`)
This layer handles the core interactions with the `supabaseAdmin` client.
- **`registerRepository`**: Pulls the active GitHub token from `github_vault`, encrypts it, generates a secure 24-character hex `svx_...` PIN, and inserts the full mapped payload into `servx_repositories`.
- **`toggleMaintenance`**: An administrative mutation to flip the `is_maintenance` boolean. It evaluates both `servx_pin` and `user_uuid` for explicit multi-factor safety.
- **`checkMaintenance`**: A highly isolated query that ONLY selects `is_maintenance`. It does not return or process the encrypted token payload.

### 3. API Endpoints (`repositories/router.ts`)
- `POST /api/repositories` -> Registers a new repository (Dashboard).
- `GET /api/repositories` -> Lists mapped repositories for the active user.
- `PATCH /api/repositories/:pin/maintenance` -> Flips the Kill Switch (Dashboard).
- `GET /api/repositories/sdk/:pin/status` -> Public unauthenticated endpoint purely for checking maintenance status via PIN (SDK).

## Security Checklist
- [x] Tokens are never returned to the frontend or SDK.
- [x] `user.uid` is strictly passed from the JWT authentication middleware to the service queries, overriding any client-provided IDs.
- [x] SDK endpoints have caching explicitly disabled (`Cache-Control: no-cache, no-store`) to ensure instantaneous reaction to the Kill Switch.
