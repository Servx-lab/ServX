# Auto-Medic Technical Architecture

This document covers the internal design and data flow of the Auto-Medic Hybrid Monitoring system.

## 🏗 System Components

The architecture is composed of four critical subsystems that work in tandem to provide 100% reliable deployment monitoring.

### 1. Webhook Receivers (`domains/webhooks`)
- **Location:** `apps/api/src/domains/webhooks/renderWebhook.ts` & `vercelWebhook.ts`
- **Function:** These endpoints (`/api/webhooks/render/deploy` and `/api/webhooks/vercel/deploy`) receive live `POST` events directly from the hosting providers when a deployment state changes.
- **Security:** Each webhook verifies the cryptographic signature (e.g., `x-vercel-signature`) against the secret token generated during OAuth connection. The secrets are stored in the `hosting_vault` table as encrypted configurations.

### 2. Background Reconciliation Poller (`workers/incidentPoller.ts`)
- **Location:** `apps/api/src/workers/incidentPoller.ts`
- **Boot Sequence:** Instantiated asynchronously in `server.js` after MongoDB and Redis are connected.
- **Function:** Runs every 5 minutes (`POLL_INTERVAL_MS`). It queries the `hosting_vault` for all active provider connections, iterates through them, and uses the provider's REST API (e.g., `api.vercel.com/v6/deployments`) to fetch recent failures.
- **Purpose:** Acts as a safety net. It catches failures that were missed due to dropped webhooks, or for users on Free tiers where provider webhooks are not supported.

### 3. Data Synchronization (`syncDeploymentIncidents`)
- **Location:** `apps/api/src/domains/connections/service.ts`
- **Function:** A unified function used by both the Webhooks and the Background Poller.
- **Logic:** It maps provider-specific payloads into a standardized `Incident` format and upserts them into the Supabase `incidents` table using the `external_id` (the provider's deployment ID) as the unique constraint. This prevents duplication if a webhook fires and the poller also spots the same failure.

### 4. Real-Time Broadcast (`auditEmitter.ts`)
- **Location:** `apps/api/src/domains/operations/auditEmitter.ts`
- **Function:** When `syncDeploymentIncidents` or the webhook identifies a new failure, it emits an `'incident'` event type.
- **Delivery:** The `auditEmitter` pushes this event down the Server-Sent Events (SSE) stream to any active frontend client belonging to that user. This enables the UI to show instant notifications and update the "Incident Records" table dynamically without refreshing the page.

## 🗄 Database Design & Tenancy

### The `incidents` Table
The incidents table enforces strict multi-tenancy.
- **`user_id` (uuid):** Mandatory column. All queries (like `getGlobalFailureHistory`) must filter by this ID to prevent data leakage.
- **`external_id` (string):** The unique identifier from the hosting provider. Used as the constraint for `ON CONFLICT` upserts.

### The `hosting_vault` Table
- **`encrypted_config` (bytea):** Stores the AES-256-GCM encrypted API keys and webhook secrets.

## 🛠 Flow Diagram

1. **User Connects Provider:** -> OAuth successful -> `saveHostingToken` generates Webhook Secret -> Registers Webhook URL via Provider API -> Saves encrypted secret to `hosting_vault`.
2. **Deployment Fails:**
   - **Path A (Push):** Provider hits `/api/webhooks/vercel/deploy` -> Signature validated -> `syncDeploymentIncidents` called.
   - **Path B (Pull):** 5 minutes elapse -> `incidentPoller` runs -> Fetches from Provider API -> `syncDeploymentIncidents` called.
3. **Database Upsert:** `incidents` table updated `ON CONFLICT (external_id) DO NOTHING`.
4. **SSE Push:** `auditEmitter.emit('incident', ...)` pushes alert to frontend.

## ⚠️ Known Behaviors & Troubleshooting
- **Render Webhook Limitations:** Render requires a paid plan to register webhooks. If a user is on the Free tier, the auto-registration API call will return a 403. The system gracefully catches this and relies on the Background Poller.
- **UUID Enforcement:** `getGlobalFailureHistory` enforces a strict UUID format. If testing locally with mocked sessions (e.g., `'mock-user-123'`), PostgreSQL will reject the query. Use a mock UUID (e.g., `'00000000-0000-0000-0000-000000000000'`) or a valid JWT.
