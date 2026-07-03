# Implementation Plan

[Overview]
Implement a production-grade “Attack Paths” pipeline for the `/attack` page by replacing the current simulated UI with a real, verified exploit synthesis workflow (CPG → exploit harness synthesis → ephemeral sandbox verification), wired end-to-end through the existing `apps/api` + `apps/worker` architecture.

This implementation is needed because the current `apps/web/src/pages/AttackPath.tsx` performs a simulated scan and generates hardcoded vulnerabilities in the browser. To meet the requested 2026 “state-of-the-art” standard (verified exploitation, zero false positives, reproducible PoCs), the system must:
1) send scan requests to the backend,
2) orchestrate analysis/exploitation in background workers,
3) persist job state + results,
4) stream progress to the UI in near-real-time,
5) render verified attack-path chains and downloadable PoC harnesses.

The plan below integrates with the repo’s existing architecture pattern:
- `apps/web` is the trigger + visualization layer
- `apps/api` is the orchestration/authorization layer
- `apps/worker` is the heavy execution layer
- Redis is already used by `apps/api/server.js`
- The React route `/attack` is protected via `RequireAuth` and currently lazy-loads `AttackPath.tsx`

[Types]  
Single sentence describing the type system changes.

Introduce shared, versioned scan job contracts (request/response/progress/results) and strongly typed frontend state models that mirror backend persisted schemas.

Detailed type definitions, interfaces, enums, or data structures with complete specifications. Include field names, types, validation rules, and relationships.

### 1. Shared scan contract (API <-> Worker <-> Web)
Create a versioned contract `AttackPathsScanV1` and `AttackPathsScanV2` as needed later. For this implementation we implement `v1`.

**Enums**
- `ScanPhase`:
  - `"queued"`
  - `"cpgraph_building"`
  - `"cpgraph_analyzing"`
  - `"harness_synthesizing"`
  - `"sandbox_verifying"`
  - `"verifying_verified"`
  - `"verifying_failed"`
  - `"rendering_report"`
  - `"completed"`
  - `"failed"`
- `HarnessVerdict`:
  - `"verified_exploit"`
  - `"blocked_by_guard"`
  - `"inconclusive"`
  - `"runtime_error"`
- `ScanSeverity`:
  - `"critical" | "medium" | "low"`
- `TargetSurfaceType`:
  - `"frontend_form_entry" | "api_route" | "service_method" | "orm_sink" | "file_exec_sink" | "authz_guard" | "dependency" | "secret" | "iac"`
- `AttackPathNodeType`:
  - `"entry" | "authz_guard" | "sink" | "data_model" | "dependency" | "secret" | "mitigation" | "service"`

**Interfaces**
- `AttackPathsScanRequestV1`
  - `jobId?: string` (optional; backend generates if omitted)
  - `repoId: string` (required; from `/github/repos` selection)
  - `repoFullName: string` (required; e.g. `owner/name`)
  - `scanTypes: Array<"id_or_bizlogic" | "injection" | "authz_bypass" | "secrets" | "iac" | "supply_chain">` (required, minItems=1, unique)
  - `analysisDepth: number` (required; integer in `[1..5]`)
  - `deviceId?: string` (optional; from existing `localStorage` uuid)
  - `requestedByUserId: string` (required; derived from auth on server)
  - `idempotencyKey?: string` (optional; generated client-side, used for dedupe)
  - Validation rules:
    - reject if `analysisDepth` out of range
    - reject if repo selection missing fields
    - reject if scanTypes empty
- `AttackPathsJobProgressV1`
  - `jobId: string`
  - `phase: ScanPhase`
  - `progressPct: number` (0..100)
  - `startedAt?: string`
  - `updatedAt?: string`
  - `statusMessage: string`
  - `artifacts?: Array<{ kind: "harness" | "graph" | "report"; location: string; sha256?: string }>`
- `VerifiedFindingV1`
  - `findingId: string` (stable hash of (repoFullName + chain + sink + harness))
  - `severity: ScanSeverity`
  - `title: string`
  - `summary: string` (human readable)
  - `surfaceChain: Array<AttackPathChainStepV1>` (ordered chain)
  - `exploitHarness`:
    - `harnessType: "vitest" | "playwright" | "curl"`
    - `artifactUrl: string` (signed URL or authenticated endpoint)
    - `artifactName: string`
  - `verification`:
    - `verdict: HarnessVerdict`
    - `evidence`:
      - `assertionPassed: boolean`
      - `logsSnippet?: string` (redacted server-side)
- `AttackPathChainStepV1`
  - `stepIndex: number`
  - `nodeType: AttackPathNodeType`
  - `surfaceType: TargetSurfaceType`
  - `label: string` (e.g. “GET /api/projects/:id”)
  - `location?: { filePath?: string; lineStart?: number; lineEnd?: number }`
  - `confidence: number` (0..1)
  - `riskNotes?: string`
- `AttackPathsJobResultV1`
  - `jobId: string`
  - `repoId: string`
  - `repoFullName: string`
  - `completedAt: string`
  - `findings: VerifiedFindingV1[]`
  - `graphArtifact`:
    - `format: "cpg_v1"`
    - `artifactUrl: string`
    - `sha256: string`
  - `reportArtifactUrl: string` (PDF/HTML/JSON)
  - `failedScanners?: Array<{ scanner: string; error: string }>`

[Files]
Single sentence describing file modifications.

Add new backend endpoints and worker job processors, a persistence layer for job state, and refactor `/attack` frontend to submit scan jobs and render streamed, verified findings.

Detailed breakdown:
- New files to be created (with full paths and purpose)
  - `apps/api/src/domains/attack-paths/router.ts`  
    - Defines `/api/attack-paths/*` routes: create job, SSE stream, artifact retrieval.
  - `apps/api/src/domains/attack-paths/controllers/attackPathsController.ts`  
    - Implements handlers: create scan job, stream progress, get results.
  - `apps/api/src/domains/attack-paths/schemas/attackPathsSchemas.ts`  
    - Zod or equivalent schema validation (must match existing patterns).
  - `apps/api/src/domains/attack-paths/services/attackPathsJobService.ts`  
    - Job creation, idempotency, authorization checks, persistence updates.
  - `apps/api/src/domains/attack-paths/services/attackPathsStreamService.ts`  
    - SSE implementation + event formatting
  - `apps/api/src/domains/attack-paths/repositories/attackPathsRepository.ts`  
    - MongoDB persistence of job state, results, and artifacts metadata
  - `apps/api/src/domains/attack-paths/middleware/requireAttackJobAccess.ts`  
    - Ensures `req.user` can read job results (ownership by userId and/or repo linking)
  - `apps/worker/src/index.ts` (modify)  
    - Add worker boot to consume attack-paths queue jobs
  - `apps/worker/src/jobs/attackPaths/attackPathsJobRunner.ts` (new)  
    - Coordinates: build CPG → synthesize harness → sandbox verify
  - `apps/worker/src/jobs/attackPaths/cpg/cpgBuilder.ts` (new)  
    - Produces CPG graph artifacts (serialized JSON)
  - `apps/worker/src/jobs/attackPaths/harness/synthesizer.ts` (new)  
    - Synthesizes harness per candidate flaw
  - `apps/worker/src/jobs/attackPaths/sandbox/sandboxVerifier.ts` (new)  
    - Runs harness in an ephemeral Docker sandbox and returns verdict + evidence
  - `apps/worker/src/jobs/attackPaths/sandbox/dockerHarnessRunner.ts` (new)  
    - Implements container lifecycle, resource limits, timeouts
  - `apps/worker/src/jobs/attackPaths/reporting/reportRenderer.ts` (new)  
    - Generates report artifacts from findings
  - `apps/web/src/features/attack-paths/api.ts` (new)  
    - `createAttackPathsJob`, `subscribeAttackPathsJob`, `getAttackPathsResults`, `getArtifact`
  - `apps/web/src/features/attack-paths/types.ts` (new)  
    - Frontend types for `AttackPathsJobProgressV1`, `AttackPathsJobResultV1`
  - `apps/web/src/features/attack-paths/components/VerifiedAttackPathScene.tsx` (new)
    - Replaces simulation logic with render-from-graph + render-from-progress model
  - `apps/web/src/features/attack-paths/components/VulnerabilityReportV2.tsx` (new)
    - Render verified findings with harness links
- Existing files to be modified (with specific changes)
  - `apps/web/src/pages/AttackPath.tsx`
    - Replace simulation functions (`runAttack`, `generateVulnerabilities`) with:
      1) job submission via new API function
      2) SSE subscription for progress events
      3) results rendering from verified findings
    - Remove per-frame React state updates that could cause performance issues (specifically AttackParticles uses `setPos` in `useFrame`; this should be refactored to use refs).
  - `apps/web/src/App.tsx`
    - Potentially add `Suspense` boundary specifics if new components are lazy-loaded (optional).
  - `apps/api/src/app.ts`
    - Register `attackPathsRouter` under an appropriate path prefix (likely `/api/attack-paths`).
  - `apps/api/server.js` (minimal if necessary)
    - Ensure worker/queue bootstrap is consistent; if job system uses redis streams/lists, ensure proper initialization.
  - `apps/api/src/lib/apiClient` (if exists)
    - Confirm frontend can call the new endpoints; align base URL `/api/attack-paths`.
- Files to be deleted or moved
  - No deletions required. We may optionally remove unused simulation helpers from `AttackPath.tsx` once replaced.
- Configuration file updates
  - `apps/api/package.json`: add dependencies only if required for:
    - SSE (often no dependency)
    - schema validation (if project standard is Zod, add it if missing)
    - job queue persistence (if not already)
  - `apps/worker/package.json`: add dependencies for:
    - child_process sandboxing utilities
    - multipart artifact hosting helpers (if needed)
    - Docker interaction library (optional; can be pure CLI calls)

[Functions]
Single sentence describing function modifications.

Modify the `/attack` page component to submit and subscribe to a backend scan job, and implement worker functions to build the CPG, synthesize exploit harnesses, verify them in sandbox, and persist verified results.

Detailed breakdown:
- New functions (name, signature, file path, purpose)
  - `createAttackPathsJobV1(req: AttackPathsScanRequestV1): Promise<{ jobId: string }>`  
    - `apps/api/src/domains/attack-paths/services/attackPathsJobService.ts`
  - `streamAttackPathsJobProgress(jobId: string, userId: string, res: Response): void`  
    - `apps/api/src/domains/attack-paths/services/attackPathsStreamService.ts`
  - `buildCodePropertyGraph(repoPath: string, depth: number): Promise<{ cpgArtifactPath: string, graphJson: any }>`  
    - `apps/worker/src/jobs/attackPaths/cpg/cpgBuilder.ts`
  - `synthesizeExploitHarnesses(graph: any, repoMeta: any): Promise<HarnessCandidate[]>`  
    - `apps/worker/src/jobs/attackPaths/harness/synthesizer.ts`
  - `verifyHarnessInSandbox(harness: HarnessCandidate, repoArtifact: string): Promise<VerifiedFindingV1>`  
    - `apps/worker/src/jobs/attackPaths/sandbox/sandboxVerifier.ts`
  - `renderAttackPathsReport(findings: VerifiedFindingV1[], graphArtifactUrl: string): Promise<{ reportUrl: string }>`  
    - `apps/worker/src/jobs/attackPaths/reporting/reportRenderer.ts`
- Modified functions (exact name, current file path, required changes)
  - `runAttack(type: AttackType)`  
    - `apps/web/src/pages/AttackPath.tsx`
    - Replace body with call to `createAttackPathsJob` then rely on SSE to update UI.
  - `generateVulnerabilities(repo: RepoSummary)`  
    - `apps/web/src/pages/AttackPath.tsx`
    - Remove entirely or keep only as temporary fallback behind a feature flag.
  - `handleAutoMedic(vulns: Vulnerability[])`
    - Replace to pass only a `jobId` to `/automedic` (not raw vulnerabilities in querystring).
    - Add backend support to retrieve verified findings server-side.
- Removed functions (name, file path, reason, migration strategy)
  - Remove `generateVulnerabilities()` after verified findings v2 is fully wired.

[Classes]
Single sentence describing class modifications.

No classes are required; use service modules + typed interfaces.

Detailed breakdown:
- New classes (name, file path, key methods, inheritance)
  - None required.
- Modified classes (exact name, file path, specific modifications)
  - None.
- Removed classes (name, file path, replacement strategy)
  - None.

[Dependencies]
Single sentence describing dependency modifications.

Add only minimal dependencies necessary for JSON schema validation and SSE streaming, and keep scanner/harness sandbox execution dependency-free where possible (shelling out to Docker).

Details of new packages, version changes, and integration requirements.
- Expected additions (verify in follow-up once package inventory is known):
  - `zod` (if not already used in `apps/api`) for request validation
  - `eventsource-parser` (optional) for frontend SSE parsing
  - `uuid` for idempotency keys (optional; crypto.randomUUID is already available)
- Docker execution can be done via `child_process.spawn()` without new dependencies.

[Testing]
Single sentence describing testing approach.

Implement contract tests for the new backend routes, worker job unit tests with mocked harness candidates, and end-to-end UI tests for job submission + streamed progress + verified report rendering.

Test file requirements, existing test modifications, and validation strategies.
- Backend:
  - Add `apps/api/src/domains/attack-paths/tests/attackPathsRoutes.test.ts`
    - verify auth guards
    - verify job creation schema validation
    - verify SSE stream returns progress events
- Worker:
  - Add `apps/worker/src/jobs/attackPaths/tests/sandboxVerifier.test.ts`
    - verify sandbox runner timeout + failure behavior
  - Add harness synthesis tests with deterministic fixtures
- Frontend:
  - Add `apps/web/src/features/attack-paths/__tests__/AttackPathsPage.test.tsx` (React Testing Library)
    - mock `api.ts` SSE subscription
    - verify UI transitions and report modal rendering

[Implementation Order]
Single sentence describing the implementation sequence.

Numbered steps showing the logical order of changes to minimize conflicts and ensure successful integration.
1) Backend: implement `/api/attack-paths` router + schemas + auth/authorization middleware + Mongo persistence schema.
2) Backend: implement SSE progress streaming and artifact/result retrieval endpoints.
3) Worker: implement queue consumer + job runner skeleton (CPG builder → harness synthesizer → sandbox verifier), initially using stubbed harness logic for integration testing.
4) Frontend: refactor `apps/web/src/pages/AttackPath.tsx` to call `createAttackPathsJob` and subscribe to SSE, replacing simulation with render-from-progress.
5) Worker: implement real sandbox harness execution with hardened timeouts/resource caps; ensure evidence captured + redacted logs persisted.
6) Frontend: implement verified finding rendering (VulnerabilityReportV2) with PoC harness artifact links.
7) Connect `/automedic` to accept `jobId` and fetch verified findings server-side (remove vulnerability payload from URL).
8) Add end-to-end tests and run load/perf smoke tests to ensure UI remains responsive.
