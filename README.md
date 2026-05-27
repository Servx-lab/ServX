# ServX

**ServX** is an enterprise-grade infrastructure command center and exposure control plane. It gives developers and DevOps teams a unified, real-time command center to manage servers, multi-provider databases, remote tasks, deployments, threat levels, and third-party integrations.

Designed for security, performance, and operational agility, ServX features a modular monorepo architecture, robust credentials encryption, real-time DEFCON threat monitoring, and a high-performance, code-split frontend.

---

## 🛠️ Monorepo Architecture

ServX is organized as a high-efficiency npm workspaces monorepo:

```
ServX/
├── apps/
│   ├── web/           # React 18 + Vite SPA (Vibrant, glassmorphic client interface)
│   ├── api/           # Express 5 (REST & SSE Server with real-time defcon system)
│   └── worker/        # background job worker (cache seeding, expert analysis)
├── packages/
│   ├── cli/           # @servx/cli - Secure remote kill-switch handshake CLI tool
│   ├── react/         # @servx/react - Protective SDK wrapping client apps for kill switches
│   ├── crypto/        # Cryptographic helper utilities for secrets encryption at rest
│   ├── errors/        # Shared application custom error definitions
│   ├── config/        # Shared configuration bundles
│   └── types/         # Unified TypeScript typings
├── supabase/          # Supabase Edge Functions assets
└── package.json       # Workspace commands and shared scripts
```

---

## ✨ Features & Capabilities

### 🎛️ Dashboard & Exposure Command Center
* **Exposure Command Center** – High-density unified panel visualizing connected resources and total exposure metrics.
* **Flow Visualization** – Visual representations of internal data flows and active network connections.
* **Telemetry & Metric Cards** – Real-time health gauges, request rates, system loads, and connection metrics at a glance.

### 🧬 Auto-Medic Pipeline
* **Incident Pipeline** – Live incident auditing tracking alerts by severity (e.g. SEV-1, SEV-2).
* **System Error Detection** – Hooks into Vercel and Render logs to catch DB timeouts, frontend exceptions, and deployment glitches.
* **AI-Generated Hotfixes** – Automates structural suggestions and triggers hotfix pull requests for minor runtime errors.
* **Deployment Interoperability** – Instant visibility into Git-to-Cloud builds and rollback status.

### 🛡️ Global Operations & Circuit Breakers
* **Global Maintenance Mode** – Push-button activation to hard-block all user traffic in seconds.
* **Granular Feature Flags** – Feature toggles (e.g., Image Uploads, AI Integrations, New Signups) controllable on a per-project or global level.
* **DEFCON Threat Controls** – 5-tier threat response matrix designed to throttle APIs, restrict access, or initiate lockdowns.
* **Granular Circuit Breakers** – Stop operations instantly for single channels (e.g., Gmail notifications, database queries).
* **FinOps Optimizer** – Cost-tracking dashboard projecting billing spikes and trigger thresholds.
* **Remote Task Executor** – Run system procedures remotely:
  * Force DB Backup
  * Clear Redis Cache
  * Sync GitHub Stats
* **API Security Radar** – Scans network addresses, tallies endpoint usage, and offers manual bans or IP whitelisting.

### 🗄️ Pluggable Database Controller
* **Pluggable Architecture** – Powered by a base database adapter interface enabling standardized operations.
* **7+ Standard Connectors** – Direct, high-speed queries on:
  * **PostgreSQL** (`pg`)
  * **MySQL** (`mysql2`)
  * **MongoDB** (`mongoose`/`mongodb`)
  * **Supabase** (`@supabase/supabase-js`)
  * **Firebase** (`firebase-admin` client workflows)
  * **Oracle DB** (`node-oracledb`)
  * **Redis** (`redis` caching / data inspection)
* **Unified Data Grid** – Edit, search, filter, and inspect document-based collections and relational tables inside a unified visual drawer.
* **Firebase User Manager** – Visual admin client to search, block, and provision Firebase Auth users.

### 🔌 Cloud Hosting & Git Integrations
* **Multi-Provider Sync** – Seamlessly monitors Vercel, Render, Railway, DigitalOcean, Fly.io, and AWS.
* **Connection Vault** – AES-256 encrypted storage of API keys, tokens, and access credentials.
* **GitHub Repository Analytics** – Track commits, PR trends, code languages, and access scopes.
* **GitHub Calendar Heatmap** – Beautiful contribution graphing to audit code updates.
* **3D Attack Path Visualization** – Renders complex codebase vulnerability vectors using Three.js and React Three Fiber (R3F).

### 📧 Integrations & Pipeline Logging
* **Gmail OAuth Client** – Read emails, manage labels, and send automated system alerts.
* **New Signup logging** – Edge functions track signups and stream credentials logging to secure Google Sheets.

---

## ⚡ Performance Optimization

Through extreme performance engineering, the frontend bundle has been optimized for sub-second paint times:
* **Route-Based Code Splitting** – 20+ feature paths converted to lazy-loaded routes under `<Suspense>`.
* **Rollup Vendor Chunk Isolation** – Isolate heavy packages (e.g., Three.js, Recharts, Supabase, Radix) into dedicated client bundles.
* **Cache Management** – Custom QueryClient defaults with `staleTime: 60_000` to prevent redundant fetching during user navigation.

**Initial JS Bundle Size:**
* **Before**: `2.62 MB` (Monolithic bundle)
* **After**: `~60 kB` (**-97.7% reduction** in initial load weight!)

---

## 🚦 Router Directory (Web App)

All principal navigation routes managed securely within `apps/web/src/App.tsx`:

| Path | Description | Access |
|---|---|---|
| `/` | Marketing Landing page | Public |
| `/auth` | Authentication Portal (Google/GitHub/Email) | Public |
| `/auth/v1/callback` | OAuth redirect callback handler | Public |
| `/privacy` | Privacy & usage policies | Public |
| `/terms` | Terms of Service agreements | Public |
| `/sdk-test` | Development playground and SDK verification | Public |
| `/onboarding` | Mandatory onboarding step for new users | Protected |
| `/settings/connections` | Encryption Vault configurations | Protected |
| `/bridge` | Link GitHub profiles for Google login users | Protected |
| `/dashboard` | Main Exposure Command Center Dashboard | Protected (Sidebar) |
| `/databases` | Database management and table explore grid | Protected (Sidebar) |
| `/github` | Repository access control and analytics | Protected (Sidebar) |
| `/hosting/:providerId` | Cloud hosting state and deployment streams | Protected (Sidebar) |
| `/auto-medic` | Error monitors and incident resolution logs | Protected (Sidebar) |
| `/operations` | Control center (Kill switch, DEFCON, Remote tasks) | Protected (Sidebar) |
| `/admin` | Administration privileges matrix | Protected (Sidebar) |
| `/attack` | 3D Attack Path network visualizer | Protected (Sidebar) |
| `/exposure` | Advanced resource threat mapping | Protected (Sidebar) |
| `/scenarios` | Operations sandbox (Coming Soon) | Protected (Sidebar) |
| `/reports` | Advanced analytics reporting (Coming Soon) | Protected (Sidebar) |
| `/emails` | Integrated Gmail Inbox client | Protected (Sidebar) |
| `/settings/profile` | Personal account configuration panel | Protected (Sidebar) |

---

## 📡 API Reference Overview

All backend control plane endpoints mapped within `apps/api/src/app.ts`:

### 🔐 Authentication & Profile
* `POST /api/auth/sync` – Synchronize user profile attributes after Supabase sign-in.
* `GET /api/auth/github/url` – Retrieve authorized GitHub OAuth redirect target.
* `GET /api/auth/github` – Initiate GitHub sign-in sequence.
* `GET /api/auth/github/callback` – GitHub OAuth callback endpoint.
* `POST /api/auth/github/disconnect` – Unlink GitHub accounts.
* `GET /api/auth/users/search` – Search through provisioned control plane accounts.
* `GET /api/auth/users/list` – List team members.
* `GET /api/profile` – Get user-specific profile details.

### 🐙 GitHub Integrations
* `GET /api/github/status` – GitHub integration status.
* `POST /api/github/link` – Connect a new GitHub installation.
* `GET /api/github/repos` – Fetch user-accessible repositories.
* `GET /api/github/repos/:owner/:repo/details` – Retrieve repo structure and vulnerability scans.
* `POST /api/github/collaborator/role` – Update user privilege scopes in the target repo.

### 🗄️ Database Operations
* `GET /api/db/explore/databases` – Enumerate configured databases.
* `GET /api/db/explore/collections` | `GET /api/db/explore/tables` – Retrieve database collections or relational tables.
* `POST /api/db/explore/documents` | `POST /api/db/explore/rows` – Fetch rows/documents with filters.
* `POST /api/db/test-connection` – Perform pre-flight connection handshake on target credentials.
* `GET /api/db/stats` – Fetch database size, counts, and active connections.

### 🔑 Connections & Hosting
* `POST /api/connections` – Save encrypted connection parameters to the vault.
* `GET /api/connections` – List current user integrations.
* `DELETE /api/connections/:id` – Revoke an active integration.
* `GET /api/connections/hosting/:provider/status` – Retrieve Vercel/Render hosting live indicators.
* `GET /api/connections/hosting/:provider/env/:serviceId` – View deployed environment variables.
* `POST /api/connections/hosting/:provider` – Securely store hosting provider credentials.

### 🚨 Operations & Live Telemetry
* `GET /api/operations/projects` – List active projects under management.
* `POST /api/operations/toggle-maintenance` – Trigger global kill-switch takeover.
* `POST /api/operations/tasks/execute` | `POST /api/tasks/execute` – Trigger a remote task.
* `GET /api/operations/defcon` – Retrieve real-time DEFCON threat state.
* `POST /api/operations/defcon` – Modify active DEFCON threat level.
* `GET /api/operations/circuits` – Get the status of all circuit breakers.
* `POST /api/operations/circuits/toggle` – Toggle an individual circuit breaker.
* `GET /api/operations/incidents/latest` – Retrieve current Auto-Medic incident streams.
* `POST /api/operations/tasks/assess` – Run pre-flight impact assessment on a queued task.
* `POST /api/operations/audit/log` – Log custom audit events from clients.
* `GET /api/operations/audit/stream` – Stream real-time operational audits via Server-Sent Events (SSE).

### 🏷️ Repositories & SDK Interceptors
* `POST /api/repositories` – Register a repository.
* `GET /api/repositories` – Enumerate registered repositories.
* `PATCH /api/repositories/:pin/maintenance` – Toggle maintenance mode for a specific SDK project.
* `GET /api/repositories/sdk/:pin/status` – Public REST endpoint for client `@servx/react` SDK polling.

### 🛠️ CLI Handshakes
* `POST /api/verify/ping` – Authenticate command line interface tokens.
* `POST /api/verify/env` – Validate local workspace framework configuration.
* `GET /api/verify/sse-test` – SSE stream to verify local-to-control-plane signal relays.
* `GET /api/verify/status/:pin` – Fetch verification state for a specific PIN.

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* Redis (for defcon caching and state pub/sub)
* MongoDB (for configuration management)
* Supabase Account (User Authorization)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd ServX

# Install workspace-wide dependencies
npm install
```

### Environment Setup

Create `.env` in `/apps/web`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000
```

Create `.env` in `/apps/api`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
ENCRYPTION_KEY=32_character_hex_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

### Running Locally

```bash
# Start Frontend & API concurrently
npm run dev

# Start Frontend, API, and Background Worker concurrently
npm run dev:full
```
* **Frontend Developer URL**: `http://localhost:5173`
* **Backend Control Plane URL**: `http://localhost:5000`

---

## 🛡️ Integrating the ServX SDK

Using `@servx/cli` and `@servx/react`, any client app can hook directly into ServX Kill-Switches:

### 1. Codebase Handshake
Initialize connection to the control plane using the CLI:
```bash
npx @servx/cli init --key=<YOUR_SERVX_PIN>
```
*Passes env verification, establishes a temporary SSE signal tunnel, and appends `VITE_SERVX_PIN` into your local `.env`.*

### 2. Wrap your Application
Install the SDK and wrap your entrypoint:
```bash
npm install @servx/react
```

```tsx
import { ServXProvider } from '@servx/react';

export default function App() {
  return (
    <ServXProvider 
      projectKey={import.meta.env.VITE_SERVX_PIN} 
      baseUrl="http://localhost:5000"
    >
      <MyApplicationTree />
    </ServXProvider>
  );
}
```
*Whenever you toggle maintenance in the ServX panel, your app renders a gorgeous, full-screen glassmorphic takeover blocking user operations.*

---

## 🔒 License & Contact

Open Source under repository license guidelines. For assistance or enterprise deployment questions, contact `servx.lab@gmail.com`.
