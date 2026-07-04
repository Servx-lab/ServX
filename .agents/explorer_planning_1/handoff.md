# ServX Codebase Investigation Report (Handoff)

## Executive Summary
This report analyzes the architecture, module layout, real-time telemetry mechanisms, scanning logic, and testing suite of the ServX monorepo. It highlights a critical distinction between the frontend-simulated attack loop on the `/attack` page and the fully functional backend DAST/GitHub scanners. It details how the real-time Server-Sent Events (SSE) telemetry is configured across four distinct subsystems.

---

## 1. Observations

### 1.1 Project Workspace Layout
The repository is set up as an npm/bun workspaces monorepo containing:
- **`apps/`**:
  - `apps/api`: Express-based REST API server running on port `5000`.
  - `apps/web`: React SPA client dashboard powered by Vite, running on port `5173`.
  - `apps/worker`: Node-based background utility process for offline tasks.
- **`packages/`**:
  - `packages/cli`: Commmand-line utility to bind local codebases to the ServX platform.
  - `packages/react`: React SDK provider supplying the remote kill-switch integration.
  - `packages/crypto`: Core encryption and decryption utilities (AES-256-CBC).
  - `packages/config`, `packages/errors`, `packages/types`: Monorepo configuration/common modules.

### 1.2 Core Frameworks & Libraries (from `package.json` files)
- **3D User Interface**: `three` (v0.160.0), `@react-three/fiber` (v8.18.0), `@react-three/drei` (v9.122.0), `@splinetool/react-spline` (v4.1.0) inside root `package.json`. Used in `apps/web/src/pages/AttackPath.tsx`.
- **Visual Dataflow / Graph UI**: `@xyflow/react` (v12.10.2) in root `package.json`. Used in `BlastRadiusFlow.tsx` and `DataGovernance.tsx` to visualize lineage and impact graphs.
- **Server-Sent Events (SSE)**: Express-native response stream handling on the backend. Browser-native `EventSource` on the client (used in `apps/web/src/features/operations/hooks.ts` and `apps/web/src/pages/DataGovernance.tsx`).
- **Sandboxing**: Puppeteer (v24.41.0) is present in `apps/api/package.json` and executed with sandboxing disabled (`--no-sandbox`, `--disable-setuid-sandbox`) inside `dastScanner.ts`.
- **Testing**: `vitest` (v3.1.0) for unit/integration testing in the frontend workspace. `@playwright/test` (v1.57.0) is configured but no E2E tests are present.

### 1.3 The `/attack` Page and Scanning Logic
- **Simulation Loop**: In `apps/web/src/pages/AttackPath.tsx`, the `runAttack` function (lines 593-635) is entirely simulated using nested client-side `setTimeout` calls and a static local vulnerability generator (`generateVulnerabilities` at lines 492-549):
  ```typescript
  // Phase 1: Scanning (2s)
  setTimeout(() => {
    // ...
    setScanPhase("attacking");
    // Phase 2: Attacking (3s)
    setTimeout(() => {
      // ...
      // Phase 3: Reporting (2s)
      setTimeout(() => {
        const vulns = generateVulnerabilities(selectedRepo);
        // ...
        setScanPhase("reporting");
        setShowReport(true);
      }, 2000);
    }, 3000);
  }, 2000);
  ```
  It does not make HTTP requests to the backend API scan endpoint.
- **Backend DAST Scanner**: Mapped at `POST /api/security/scan-target` in `apps/api/src/domains/security/router.ts`. The controller `scanTarget` triggers `scanLiveDeployment(url)` defined in `apps/api/src/services/dastScanner.ts`. This launches a headless Puppeteer browser, intercepts console logs and network response bodies, and checks them against regex patterns:
  - `google`: `/AIza[0-9A-Za-z-_]{35}/`
  - `stripe`: `/sk_live_[0-9a-zA-Z]{24}/`
  - `aws_key`: `/AKIA[0-9A-Z]{16}/`
  - `github`: `/ghp_[a-zA-Z0-9]{36}/`
  - `genericBearer`: `/Bearer [a-zA-Z0-9-._~+/]+=*/`
- **GitHub Vulnerability Scanner**: Mapped at `GET /api/security/vulnerabilities/:owner/:repo` in `apps/api/src/domains/security/router.ts`. It invokes `fetchRepoSecurityData` (`apps/api/src/services/githubGraphScanner.ts`) using the Octokit GraphQL client to retrieve open security alerts directly from GitHub, caching the processed output in Redis.

### 1.4 Real-time SSE / Telemetry Setup
The codebase coordinates real-time updates through 4 distinct Server-Sent Events channels:
1. **Live Audit Stream (`GET /api/operations/audit/stream`)**: Mapped to an internal `EventEmitter` named `auditEmitter`. Emits telemetry logs from infrastructure events (e.g. toggling maintenance modes, execution of remote tasks) which the React client receives via the custom hook `useAuditStream` (`apps/web/src/features/operations/hooks.ts`).
2. **CLI Handshake Status Stream (`GET /api/verify/status/:pin`)**: Transmits verification progress to the dashboard UI.
3. **CLI Persistance Test Stream (`GET /api/verify/sse-test?pin=...`)**: Keeps a 3-second SSE tunnel open with the local CLI during initial linkage verification, changing status to `VERIFIED` upon successful termination.
4. **Device Authorization Stream (`GET /api/devices/listen-requests` & `GET /api/devices/listen-approval/:fingerprint`)**: Facilitates real-time, zero-trust login authorization notifications. The approved device subscribes to `device_approvals:${userId}` via Redis Pub/Sub, while the pending device listens for the corresponding `device_resolved` event.

### 1.5 Codebase Test Suites
- **Vitest**: Configured in `apps/web/vitest.config.ts`. Tests are co-located in `apps/web/src`:
  - `apps/web/src/test/example.test.ts` (Simple baseline test)
  - `apps/web/src/lib/apiClient.test.ts` (Validates baseUrl formatting for the client instance)
  - Executed from the root directory using: `npm run test` (delegating to `vitest run --config vitest.config.ts --root apps/web`).
- **Playwright**: Configured in `apps/web/playwright.config.ts`. Mapped to `./e2e` but the directory is unpopulated.

---

## 2. Logic Chain

1. **Monorepo Structure**: The monorepo utilizes workspaces where `package.json` in the root hosts joint/shared library dependencies (like `@react-three/fiber`, `@xyflow/react`), while application-specific configurations are declared inside individual subdirectories (`apps/api`, `apps/web`, `apps/worker`).
2. **Attack Page Mocking**: Analyzing `apps/web/src/pages/AttackPath.tsx` shows that `runAttack` acts as a mock simulation entirely decoupled from the active backend DAST scanner (`dastScanner.ts`) and database. It does not send any HTTP requests to `apiClient.post("/security/scan-target")` or `/api/security/scan-target`.
3. **Telemetry Integration**: Real-time telemetry is decoupled using:
   - **Local Event Emitters** (`auditEmitter`) for in-process telemetry.
   - **Redis Pub/Sub** for cross-process synchronization of DEFCON states and device validation states.
   - **Server-Sent Events (SSE)** response headers (`text/event-stream`) to serialize and push events downstream to client-side `EventSource` instances.
4. **Offline Cache Compilation**: The `worker` workspace operates as a job schedule manager. When executed, it compiles systemic knowledge files (`generateExpertCache.ts`) and synchronizes those patterns to the `error_cache` table in Supabase (`seedCache.ts`). The Express `autoMedicMiddleware.js` handles runtime errors by calculating error signature hashes and checking them against this seeded database.

---

## 3. Caveats
- **Playwright E2E Tests**: Although a configuration file `playwright.config.ts` exists, the `apps/web/e2e` directory referenced by the configuration is not present or contains no tests.
- **GitHub API Mocking**: The GitHub App authentication sequence and App Installation fetches assume correct env variables (`GITHUB_APP_PEM`, `GITHUB_APP_ID`, etc.) and fall back to empty records if missing.

---

## 4. Conclusion
The ServX monorepo separates static configurations and operational packages. Telemetry is fully supported through SSE channels integrated with Redis Pub/Sub topics. The frontend `/attack` dashboard uses a client-side mock framework with `@react-three/fiber` to simulate intrusion vectors, while the real DAST Puppeteer logic (`dastScanner.ts`) and GitHub GraphQL scanners (`githubGraphScanner.ts`) run independently in the `api` workspace. Unit tests are set up under Vitest and run successfully via `npm run test`.

---

## 5. Architecture Diagrams

### 5.1 Architecture Overview
```
                     +--------------------------------------+
                     |         React Dashboard (Web)        |
                     | - AttackPath (Mock 3D UI R3F)        |
                     | - DataGovernance (React Flow Graph)  |
                     +-------------------+------------------+
                                         |
                       REST API Calls    |   Server-Sent Events (SSE)
                       & Client Logs     |   (Audit logs, Device approvals)
                                         v
                     +-------------------+------------------+
                     |         Express Server (Api)         |
                     | - dastScanner (Puppeteer headless)   |
                     | - autoMedicMiddleware (AI Diagnosis) |
                     +---------+------------------+---------+
                               |                  |
               Syncs Cache &   |                  | Pub/Sub Sync
               Incident Logs   v                  v
                     +---------+--------+  +------+------+
                     |  Supabase DB     |  |  Redis RAM  |
                     |  - error_cache   |  |  - defcon   |
                     |  - incidents     |  |  - circuits |
                     +---------+--------+  +-------------+
                               ^
                               | Seeding & Generation
                     +---------+--------+
                     |   Worker Jobs    |
                     | - generateCache  |
                     | - seedCache      |
                     +------------------+
```

### 5.2 Real-time SSE Streams Coordination
```
             +------------------+                    +-----------------+
             |   Express Node   |  Pub/Sub Channel   |  Express Node   |
             |   (Instance A)   | <================> |  (Instance B)   |
             +--------+---------+                    +--------+--------+
                      |                                       |
                      | SSE Connection (EventSource)          | SSE Connection
                      v                                       v
             +--------+---------+                    +--------+--------+
             |   CLI Tool (1)   |                    |   Browser (2)   |
             | sse-test?pin=... |                    | listen-requests |
             +------------------+                    +-----------------+
```

---

## 6. Verification Method

To verify the test suite and confirm that it passes successfully, run:
```bash
npm run test
```
This runs the Vitest suite in the `apps/web` root directory. The output should confirm 2 passed test files containing 4 tests in total:
- `example.test.ts` (1 test)
- `apiClient.test.ts` (3 tests)
