# BRIEFING — 2026-07-03T13:17:24Z

## Mission
Investigate the ServX codebase layout, package configurations, attack page, scanning logic, telemetry/SSE, and testing setup.

## 🔒 My Identity
- Archetype: explorer
- Roles: Read-only investigator, analyzer
- Working directory: /home/premsaik/Desktop/Projects/ServX/.agents/explorer_planning_1
- Original parent: 0b5c2f8c-512f-4584-a86c-61f378327e5d
- Milestone: Initial Investigation and Planning

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Network mode: CODE_ONLY (no external websites/services)

## Current Parent
- Conversation ID: 0b5c2f8c-512f-4584-a86c-61f378327e5d
- Updated: 2026-07-03T13:25:00Z

## Investigation State
- **Explored paths**:
  - `apps/api`: Server setup (`server.js`, `src/app.ts`), security domain routes/controllers, DAST scanner (`dastScanner.ts`), devices domain, operations audit stream, and defcon middleware.
  - `apps/web`: App shell (`App.tsx`), `/attack` simulation page (`AttackPath.tsx`), `ExposureAnalysis.tsx`, `DataGovernance.tsx`, and operations hooks (`hooks.ts`).
  - `apps/worker`: Job manager (`index.ts`), expert cache generation (`generateExpertCache.ts`), and Supabase cache seeding (`seedCache.ts`).
  - `packages/*`: CLI handshake utility (`packages/cli/src/index.ts`), React SDK provider (`packages/react/src/ServXProvider.tsx`), and cryptographic helper (`packages/crypto/index.ts`).
- **Key findings**:
  - 3D graphics on the `/attack` page are implemented with `@react-three/fiber` and `@react-three/drei` (SolarSystemBackground, TopologyNode, and AttackParticles).
  - The actual attack path execution logic on `/attack` page is a front-end mock using `setTimeout` chains and simulated vulnerability outputs; it does not hit the backend scanning endpoints.
  - The backend provides real-time scanning functionality via DAST scanner (`dastScanner.ts`) using Puppeteer and a GitHub GraphQL vulnerability fetcher (`githubGraphScanner.ts`).
  - Node-based dataflow visuals on the `ExposureAnalysis` and `DataGovernance` pages are built with `@xyflow/react` (React Flow).
  - Live streams and telemetry are orchestrated via Server-Sent Events (SSE) combined with Redis Pub/Sub, including operations auditing stream, CLI handshake verification, and zero-trust device login requests/approvals.
  - Auto-Medic pipeline uses an Express error handler middleware to capture, signature-hash, and look up errors in Supabase cache (backed by OpenAI GPT-4o on cache miss).
  - Testing is implemented using Vitest on the frontend, with co-located tests passing successfully (`npm run test`). Playwright is configured but E2E test folders are missing.
- **Unexplored areas**:
  - Deep-dive into database schema structures in MongoDB and Supabase.
  - Webhook integration models for GitHub.

## Key Decisions Made
- Confirmed that the client-side `/attack` page does not currently invoke the backend `scanLiveDeployment` API.
- Verified test suites pass successfully without failures.

## Artifact Index
- /home/premsaik/Desktop/Projects/ServX/.agents/explorer_planning_1/handoff.md — Handoff report containing codebase details, analysis and architecture.
