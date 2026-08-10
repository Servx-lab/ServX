# Domain: Attack Paths

**Route:** `/api/attack-paths`  
**Location:** `apps/api/src/domains/attack-paths/`

This domain acts as the Control Plane for the isolated **Attack Paths Executor** microservice. It manages the queuing, dispatching, quota verification, and Server-Sent Events (SSE) streaming of security scans.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/jobs` | `requireAuth` | Dispatches a new Attack Paths scan job to the isolated executor. |
| `POST` | `/warmup` | `requireAuth` | Sends a wake-up signal to the executor (useful for cold-boot Render environments). |
| `GET`  | `/quota` | `requireAuth` | Retrieves the tenant's current execution quota limits. |
| `GET`  | `/jobs/latest` | `requireAuth` | Retrieves the results of the most recently completed scan. |
| `GET`  | `/jobs/:jobId/stream` | `requireAttackJobAccess` | Opens an SSE stream to pipe real-time scan progress from the executor to the frontend. |
| `POST` | `/jobs/:jobId/cancel` | `requireAttackJobAccess` | Issues a cancellation signal to halt an ongoing scan. |
| `GET`  | `/jobs/:jobId` | `requireAttackJobAccess` | Retrieves the finalized results for a specific historical job. |

## Access Control
Routes specific to a `jobId` are protected by the `requireAttackJobAccess` middleware, which verifies that the requesting user belongs to the tenant that owns the job.
