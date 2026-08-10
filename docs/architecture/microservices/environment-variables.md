p# Environment Variables Reference — Ecosystem Mesh

The ServX ecosystem is a distributed mesh of four microservices. Because they are deployed independently, their environment variables (`.env`) act as the critical routing topology that securely connects them.

---

## 1. Main-UI API (Control Plane)

The Main-UI API acts as the central authority. It requires credentials for databases, third-party OAuth providers, and the specific routing secrets to communicate with the three execution services.

### Core Dependencies (Do Not Change)

| Variable | Value | Purpose |
|----------|-------|---------|
| `ADMIN_EMAIL` | `consolemaster.app@gmail.com,...` | Global admin alert recipients. |
| `ENCRYPTION_KEY` | `0ca854fd...` | AES-256-CBC encryption key for internal vaults. |
| `FRONTEND_URL` | `http://localhost:8080` | Authorized frontend URL for CORS policies. |
| `GITHUB_APP_*` | various | Identity variables for the GitHub App integration. |
| `GITHUB_CLIENT_*` | various | OAuth credentials for GitHub SSO. |
| `GOOGLE_CLIENT_*` | various | OAuth credentials for Google SSO. |
| `MONGODB_URI` | `mongodb+srv://...` | Primary document store connection string. |
| `REDIS_URL` | `redis://...` | In-memory cache and PubSub bus connection string. |
| `SUPABASE_*` | various | Supabase URL and Service Role Key for identity resolution. |

### Mesh Topology Routing (Add These)

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `SERVICE_AUTH_TOKEN` | `ServX_Internal_8f9a2b...` | Shared symmetric secret for AutoMedic/Exposure trust. |
| `AUTOMEDIC_SERVICE_URL` | `https://servx-automedic.onrender.com` | Target URL for the AutoMedic Pipeline. |
| `EXPOSURE_SERVICE_URL` | `https://servx-exposure.onrender.com` | Target URL for the Exposure Analysis service. |
| `ATTACK_PATHS_EXECUTOR_INBOUND_HMAC_SECRET` | `long-random-secret-1` | Verifies incoming payloads from the Executor. |
| `ATTACK_PATHS_EXECUTOR_OUTBOUND_HMAC_SECRET`| `long-random-secret-2` | Signs outgoing dispatch payloads sent to the Executor. |

---

## 2. AutoMedic Pipeline

| Variable | Required | Example Value | Purpose |
|----------|----------|---------------|---------|
| `SUPABASE_URL` / `SUPABASE_KEY` | Yes | various | Mirrors the Main-UI Supabase credentials. |
| `EXPOSURE_SERVICE_URL` | Yes | `https://servx-exposure.onrender.com` | Target URL to forward T2 escalations. |
| `SERVICE_AUTH_TOKEN` | Yes | `ServX_Internal_8f9a2b...` | Symmetric trust token (Must match Main-UI). |
| `POLL_INTERVAL_MS` | No | `30000` | Custom polling loop interval (ms). |

---

## 3. Exposure Analysis Service

| Variable | Required | Example Value | Purpose |
|----------|----------|---------------|---------|
| `SUPABASE_URL` / `SUPABASE_KEY` | Yes | various | Mirrors the Main-UI Supabase credentials. |
| `MAIN_API_URL` | Yes | `https://servx-api.onrender.com` | Target URL to fetch ephemeral user tokens. |
| `SERVICE_AUTH_TOKEN` | Yes | `ServX_Internal_8f9a2b...` | Symmetric trust token (Must match Main-UI). |

---

## 4. Attack Paths Executor (Isolated)

> [!WARNING]  
> **Strict Isolation:** This service must **never** receive the `MONGODB_URI`, `SUPABASE_KEY`, or `ENCRYPTION_KEY`.

| Variable | Required | Example Value | Purpose |
|----------|----------|---------------|---------|
| `SERVX_CONTROL_PLANE_URL` | Yes | `https://servx-api.onrender.com` | Target URL for completion callbacks. |
| `ATTACK_PATHS_EXECUTOR_INBOUND_HMAC_SECRET` | Yes | `long-random-secret-2` | Verifies dispatches. **Must exactly match the Main-UI's OUTBOUND secret.** |
| `ATTACK_PATHS_EXECUTOR_OUTBOUND_HMAC_SECRET`| Yes | `long-random-secret-1` | Signs callbacks. **Must exactly match the Main-UI's INBOUND secret.** |

---

## Environment Variable Flow Diagram

This diagram visually maps how the environment variables dictate the service-to-service routing topology.

```text
                    ┌─────────────────────────┐
                    │      Main-UI API        │
                    │                         │
                    │  SERVICE_AUTH_TOKEN ────┼──┐ (Symmetric Trust)
                    │  AUTOMEDIC_SERVICE_URL  │  │
                    │  EXPOSURE_SERVICE_URL   │  │
                    │                         │  │
                    │  ATTACK_PATHS_EXECUTOR_ │  │
                    │    INBOUND/OUTBOUND_    │  │
                    │    HMAC_SECRET ─────────┼──┼──┐ (Asymmetric HMAC)
                    └───────────┬─────────────┘  │  │
                                │                │  │
                    ┌───────────▼──────────┐     │  │
                    │   Exposure Service   │     │  │
                    │                      │     │  │
                    │  SERVICE_AUTH_TOKEN ─┼─────┘  │
                    │  MAIN_API_URL ───────┼──→     │
                    └───────────▲──────────┘        │
                                │                   │
                    ┌───────────┴──────────┐        │
                    │  AutoMedic Service   │        │
                    │                      │        │
                    │  SERVICE_AUTH_TOKEN ─┼──→     │
                    │  EXPOSURE_SERVICE_URL┼──→     │
                    └──────────────────────┘        │
                                                    │
                    ┌────────────────────────┐      │
                    │ Attack Paths Executor  │      │
                    │                        │      │
                    │  ATTACK_PATHS_EXECUTOR_│      │
                    │    OUTBOUND/INBOUND_   │      │
                    │    HMAC_SECRET ────────┼──────┘ (Inverted Match)
                    │  SERVX_CONTROL_PLANE_  │
                    │    URL                 │
                    └────────────────────────┘
```
