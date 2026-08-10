# Domain: Live Security Feed

**Route:** `/api/feed`  
**Location:** `apps/api/src/domains/feed/`

This domain manages the outbound Server-Sent Events (SSE) streaming of real-time security anomalies and activity logs to the ServX Main-UI dashboard.

## Architecture Security
The feed relies on a strictly partitioned multi-tenant architecture. When a user connects to the `/stream` endpoint, the system resolves all GitHub Installation IDs explicitly owned by that `user.uid`. It then filters the global `feedEmitter` bus in real-time, ensuring users only receive data payloads destined for their registered organizations.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/stream` | `requireAuth` | Establishes a persistent SSE connection. Pushes real-time anomalies and implements a 30-second keep-alive heartbeat to prevent proxy timeouts. |
