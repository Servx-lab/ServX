# Auto-Medic Hybrid Monitoring

**Auto-Medic Hybrid Monitoring** is the core capability that allows ServX to instantly detect, track, and alert on deployment failures across connected hosting providers (like Vercel and Render) without requiring manual intervention or continuous UI polling.

## 🌟 Overview

Before Hybrid Monitoring, tracking deployment failures required a user to keep the ServX dashboard open. The frontend would occasionally poll the hosting providers for updates. 

With **Hybrid Monitoring**, ServX now detects failures autonomously, in real-time, even when you're completely offline. When a failure is detected, it is immediately synced to the Zero-Trust secure vault, and any active dashboard sessions receive real-time updates via Server-Sent Events (SSE).

## ⚡ How it Works

The Hybrid architecture relies on two complementary systems:

### 1. Push-Based Webhooks (Primary)
When you connect a new Vercel or Render account, ServX automatically provisions a cryptographic secret and registers a secure Webhook with the hosting provider.
- If a deployment crashes or fails, the hosting provider instantly sends a POST request to ServX.
- ServX cryptographically verifies the webhook signature to ensure authenticity.
- The failure is instantly recorded into the database and broadcasted to the frontend via SSE as an `'incident'` event.

### 2. Background Poller (Safety Net)
To ensure absolute reliability, a background worker (`incidentPoller.ts`) runs every 5 minutes on the server.
- **Why?** Some hosting plans (e.g., Render Free Tier) do not support webhooks, or a webhook payload could be dropped due to network issues.
- The poller iterates through all connected accounts, pulls the latest deployment statuses, and cross-references them against our incident database.
- Any missed failures are automatically reconciled.

## 🔐 Security & Zero-Trust
Security is paramount when dealing with external webhooks.
1. **Encrypted Secrets:** Webhook secrets are generated securely on connection and stored in the encrypted `hosting_vault` using `@servx/crypto`.
2. **Signature Validation:** Every incoming webhook is rejected unless it contains a valid HMAC signature matching the stored secret.
3. **Strict Tenancy:** Deployment incidents are strictly isolated. A `user_id` column enforces row-level separation in PostgreSQL, ensuring no cross-tenant data leakage.

## ⚙️ Configuration
No manual configuration is required! 
When you click **"Connect"** on Vercel or Render in the Infrastructure dashboard, the OAuth flow automatically handles the setup of webhook secrets and registration behind the scenes. If your provider tier does not support webhooks, the system gracefully degrades to rely solely on the Background Poller.
