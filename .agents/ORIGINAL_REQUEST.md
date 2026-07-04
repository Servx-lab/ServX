# Original User Request

## Initial Request — 2026-07-03T18:46:29+05:30

Build an enterprise Application Security Posture Management (ASPM) verification engine and real-time 3D Security Posture UI (`/attack`) for ServX, correlating code dataflows with automated security regression test sandboxing.

Working directory: /home/premsaik/Desktop/Projects/ServX
Integrity mode: development

## Requirements

### R1. Semantic Code Security & Dataflow Correlation (`apps/api` & `apps/worker`)
Ingest linked GitHub repository source code (via existing GitHub App authorization) or live application endpoints. Perform multi-hop static dataflow correlation from frontend API invocations to backend routes and database/filesystem interactions to detect potential OWASP Top 10 security misconfigurations and code flaws.

### R2. Automated Security Regression Sandbox (`apps/worker`)
Instead of displaying unverified warnings, automatically generate self-contained unit and integration security test cases (e.g., Vitest or Playwright test scripts) for detected code flaws. Execute these regression tests inside an isolated, ephemeral sandbox environment to verify whether the flaw is actively reproducible, eliminating false-positive security alerts for developers.

### R3. Real-Time Security Telemetry Streaming (`apps/api`)
Replace frontend mock timers with a real Server-Sent Events (SSE) telemetry endpoint (`GET /security/scan/stream/:scanId`). Stream live scanner evaluation events (`log`), discovered architectural nodes (`node_discovered`), and verified security dependency chains (`complete`) directly to the frontend.

### R4. 3D Security Posture & Remediation UI (`apps/web/src/pages/AttackPath.tsx`)
Transform `/attack` into an interactive 3D topological visualization (`@react-three/fiber`). Nodes must dynamically represent real discovered application services and components. Clicking a verified security finding must display:
- The exact security test case / request parameters that reproduced the flaw.
- The reproducible unit/integration test command.
- Actionable source code remediation diffs showing exact line fixes.

## Acceptance Criteria

### Scan Execution & Telemetry
- [ ] Submitting a target URL or selecting a linked repository initiates a real backend security evaluation job and establishes an active SSE stream.
- [ ] Terminal logs in the UI stream real timestamped evaluation events from the backend security worker.

### 3D Graph & Remediation UI
- [ ] The 3D viewport populates dynamically with nodes reflecting actual scanned application components rather than hardcoded mock spheres.
- [ ] Clicking a verified security finding opens a detailed modal providing the reproducible test script and clear code remediation diffs.
