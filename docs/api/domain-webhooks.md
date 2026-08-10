# Domain: Webhooks & Event Feeds

**Route:** `/api/webhooks`  
**Location:** `apps/api/src/domains/webhooks/`

This domain serves as the inbound data ingestion layer for third-party platform events (GitHub, Render, Vercel). It acts as the backbone of the real-time activity feed.

## GitHub Integration

### `POST /github`
Validates the `X-Hub-Signature` via the `verifyGitHubSignature` middleware. 
- **`installation:deleted`:** Automatically revokes access and marks the `UserConnection` as pending.
- **`push`:** The core feed ingestion. Parses the commit using an `anomalyDetector` (for severity analysis), saves it to MongoDB `ActivityLog`, and immediately broadcasts it to connected UI clients via the `feedEmitter` SSE bus.

## Hosting Integrations

- **`POST /render/deploy`:** Ingests Render deployment state changes.
- **`POST /vercel/deploy`:** Ingests Vercel deployment state changes.
