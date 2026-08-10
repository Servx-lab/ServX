# Project: ServX ASPM & 3D Security Posture Engine

## Architecture
The enterprise ASPM system consists of:
1. **ASPM Verification Engine (apps/api & apps/worker)**: 
   - static code scanner performing multi-hop dataflow correlation (frontend to DB/FS).
   - security regression sandbox spawning dynamic test cases (Vitest/Playwright) to verify active vulnerability reproduction.
2. **Server-Sent Events Telemetry (apps/api)**:
   - real-time stream `GET /api/attack-paths/jobs/:jobId/stream` pushing events: logs, nodes, and findings.
3. **3D Topological Visualization (apps/web)**:
   - React 3D interface on `/attack` using `@react-three/fiber` to render real application topology, stream scanner logs, and support remediation diff overlays.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 0 | E2E Testing Track | Infra defined & TEST_READY.md published. Implement Tiers 1-4. | None | IN_PROGRESS (Tiers 1-4 Pending) |
| 1 | Semantic Dataflow Scanner | Multi-hop code security scanner (`apps/api` & `apps/worker`) | None | IN_PROGRESS (Conv: 2b962563-993b-4deb-87f2-672bfec7dcc1) |
| 2 | Regression Sandbox | Ephemeral sandbox dynamic test generator & runner (`apps/worker`) | M1 | PLANNED |
| 3 | Telemetry SSE Stream | SSE streaming endpoint GET /api/attack-paths/jobs/:jobId/stream | M2 | PLANNED |
| 4 | 3D Posture & Remediation UI | 3D topology visualization & modal refactor in `AttackPath.tsx` | M3 | PLANNED |
| 5 | Final Verification & Hardening | E2E Test Suite pass & Phase 2 Adversarial coverage hardening | M0, M4 | PLANNED |

## Interface Contracts
### Scanner ↔ Sandbox
- **Interface**: `apps/worker/src/services/sandbox.ts` / `apps/api/src/services/sandbox.ts`
- **Inputs**: Vulnerability finding `{ id, type, file, title, detail, sourceLine, targetLine, route, dataflowPath }`
- **Outputs**: `{ reproducible: boolean, testCode: string, testCommand: string, errorOutput?: string }`

### API Scan ↔ SSE Stream
- **Interface**: `GET /api/attack-paths/jobs/:jobId/stream` (Attack Paths) and `GET /api/v1/medic/stream` (Auto-Medic)
- **Output stream events**:
  - `event: log`, `data: { timestamp, message }`
  - `event: node_discovered`, `data: { id, label, type, status }`
  - `event: complete`, `data: { scanId, findings: [...] }`

## Code Layout
- `apps/api/src/domains/security/` - Backend static scan controllers
- `apps/api/src/domains/attack-paths/` - Attack path scan controllers and SSE telemetry streams
- `apps/worker/src/jobs/` - Backend static analysis and regression sandbox worker jobs
- `apps/web/src/pages/AttackPath.tsx` - Frontend 3D topology & vulnerability panel
