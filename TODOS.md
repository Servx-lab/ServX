# TODO - Attack Paths Phase-B MVP (CPG-like + Harness templates)

## Phase-B Implementation
- [x] Extend AttackPathsJob model + service to store encrypted GitHub token (enc/content + iv) and expiry
- [x] Update POST /api/attack-paths/jobs controller to fetch GitHub token from Supabase and pass encrypted blobs into job creation
- [x] Update worker job runner:
  - [x] Decrypt GitHub token from job record
  - [ ] Download GitHub zipball for repoFullName into /tmp/attack-paths/<jobId> (disabled in bounded MVP)
  - [ ] Extract archive (disabled in bounded MVP)
  - [ ] Build heuristic graphArtifact from source files (routes/middleware/auth sinks) (disabled in bounded MVP)
  - [ ] Generate harnessTemplates from graph findings (test skeletons as templates) (disabled in bounded MVP)
  - [ ] Persist graphArtifact + results with harnessTemplates (disabled in bounded MVP)
  - [ ] Update phases/progressPct accordingly (placeholder currently used)

## Frontend Refactor / UX Hardening
- [ ] Refactor `apps/web/src/pages/AttackPath.tsx` into smaller components + `useAttackPathsJob()` hook
- [ ] Replace swallowed repo fetch errors with user-visible UI feedback
- [ ] Harden SSE parsing and event handling
- [ ] Fix performance: remove per-frame React state updates in `AttackParticles`
- [ ] Avoid putting full vulnerability JSON into `/automedic` querystring; prefer passing `jobId` or compact reference

## Critical-path Verification
- [ ] UI: /attack creates job and SSE shows cpgraph_* → harness_* → completed
- [ ] UI: modal renders backend-derived results (non-empty)
- [ ] API: POST and SSE return 401 without auth
