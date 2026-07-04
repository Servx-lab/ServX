# BRIEFING — 2026-07-03T13:25:00Z

## Mission
Investigate the integration points for the scanner, controller invocation, database schema, and define the AST scan output data structure to support subsequent dataflow tracing.

## 🔒 My Identity
- Archetype: Read-only exploration agent
- Roles: Investigator
- Working directory: /home/premsaik/Desktop/Projects/ServX/.agents/teamwork_preview_explorer_ingestion_ast_3
- Original parent: 2b962563-993b-4deb-87f2-672bfec7dcc1
- Milestone: AST Scanner Integration & Schema Design

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Network mode: CODE_ONLY, no external web access

## Current Parent
- Conversation ID: 2b962563-993b-4deb-87f2-672bfec7dcc1
- Updated: 2026-07-03T13:25:00Z

## Investigation State
- **Explored paths**:
  - `apps/api/src/domains/security/controller.ts`
  - `apps/api/src/domains/security/router.ts`
  - `apps/api/src/domains/security/service.ts`
  - `apps/api/src/domains/github/controller.ts`
  - `apps/api/src/domains/github/service.ts`
  - `apps/api/src/domains/repositories/service.ts`
  - `apps/api/src/services/dastScanner.ts`
  - `apps/worker/src/index.ts`
  - `apps/worker/src/jobs/seedCache.ts`
  - `.agents/explorer_planning_1/handoff.md`
  - `.agents/teamwork_preview_explorer_ingestion_ast_1/analysis.md`
  - `.agents/teamwork_preview_explorer_ingestion_ast_2/analysis.md`
- **Key findings**:
  - `apps/api/src/domains/security/controller.ts` exposes `scanTarget` at `POST /api/security/scan-target` for synchronous DAST URL scans using headless Puppeteer.
  - No database schema or request models exist for storing scan results. The monorepo uses Supabase/PostgreSQL for configuration state (`servx_repositories`, `project_groups`) and MongoDB for user profiles.
  - Proposed an asynchronous queue-based execution model using background worker processes (`apps/worker`) and a new 3-table schema (`sast_scans`, `sast_graphs`, `sast_findings`) to avoid request timeouts.
  - Defined a Graph-based AST scan output data structure (Nodes, Edges, Files Mapped) that tracks data propagation and connects frontend API calls to backend controllers via `API_LINK` edges.
- **Unexplored areas**: None, the scope of scanner integration and output structures is fully investigated.

## Key Decisions Made
- Recommended asynchronous execution for AST scanning over synchronous Express API execution.
- Recommended a unified directed graph model representing both data dependencies and inter-service HTTP mapping.

## Artifact Index
- /home/premsaik/Desktop/Projects/ServX/.agents/teamwork_preview_explorer_ingestion_ast_3/ORIGINAL_REQUEST.md — Original request details
- /home/premsaik/Desktop/Projects/ServX/.agents/teamwork_preview_explorer_ingestion_ast_3/analysis.md — Core design analysis report
- /home/premsaik/Desktop/Projects/ServX/.agents/teamwork_preview_explorer_ingestion_ast_3/handoff.md — Final handoff report
