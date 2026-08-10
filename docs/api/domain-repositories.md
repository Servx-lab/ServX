# Domain: Repositories & SDK

**Route:** `/api/repositories`  
**Location:** `apps/api/src/domains/repositories/`

This domain bridges the gap between the Main-UI configuration of repositories and the public SDK endpoints utilized by deployed applications for maintenance windows.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | `requireAuth` | Registers a new repository into the ServX dashboard ecosystem. |
| `GET`  | `/` | `requireAuth` | Retrieves the list of user-registered repositories. |
| `PATCH` | `/:pin/maintenance` | `requireAuth` | Toggles the active maintenance mode state for a specific project PIN. |
| `GET`  | `/sdk/:pin/status` | `Public` | An unauthenticated, high-throughput polling endpoint utilized by the remote frontend SDKs to check if the app should display a maintenance screen. |
