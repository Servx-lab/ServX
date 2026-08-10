# Domain: CLI Verification (Sentinel Handshake)

**Route:** `/api/verify`  
**Location:** `apps/api/src/domains/verify/`

This domain handles the cryptographically secure out-of-band "Sentinel Handshake". It allows the `servx-cli` tool running in a remote terminal to authenticate and stream execution logs securely back to the Main-UI dashboard via a one-time PIN.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth` | Initial handshake establishing the ephemeral terminal session. |
| `POST` | `/env` | Secure negotiation of environment parameters for the CLI. |
| `GET`  | `/stream` | SSE endpoint allowing the CLI to stream its local execution output to the server. |
| `GET`  | `/status/:pin` | Polling/Listener endpoint for the web dashboard to wait for a CLI handshake to complete using a provided PIN. |
