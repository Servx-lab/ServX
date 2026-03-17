# ServX Migration Copilot Playbook

Date: 2026-03-16
Purpose: Safe, phased migration to a scalable domains plus packages architecture without behavior regressions.

## Why this playbook exists
A vague migration request causes Copilot to reorder steps, over-edit imports, and introduce cascading breakage.
This plan is optimized for Copilot strengths:
- Mechanical moves and boilerplate generation
- Fast isolated refactors when scope is tightly constrained

And protected against Copilot risks:
- Silent import path drift
- Premature deletion of source files
- Multi-domain edits in one pass

## Global operating rules
- Run one phase at a time.
- Keep each Copilot prompt narrowly scoped.
- Do not batch unrelated package/domain work in one prompt.
- Validate after each step before proceeding.
- Never remove originals during pilot moves.

Critical instruction to include in every move prompt:
Do not delete the original file until I confirm the new location works. Just create the new file and update the one import that points to it.

## Target architecture

Top level:
- apps/web
- apps/api
- apps/worker
- packages/crypto
- packages/config
- packages/errors
- packages/types

API design:
- domains/* for business ownership (auth, github, databases, connections, hosting, gmail, operations, admin)
- core/* for shared middleware and cross-cutting concerns

Dependency rule:
- apps can import packages
- packages cannot import apps
- API domains do not import each other directly

## Phase 0: Rename and scaffold (no behavior changes)
Objective: Establish workspace layout and package identities before any logic migration.

Actions:
1. Root package rename to servx-web and add npm workspaces (apps/*, packages/*).
2. API package rename to servx-api.
3. Create packages/crypto, packages/config, packages/errors, packages/types with minimal package.json and index.ts.
4. Create apps/ and move:
   - web assets and config into apps/web
   - server into apps/api

Verification:
- Start web from apps/web using npm run dev.
- Start api from apps/api using npm run dev.
- Fix path/config issues immediately before next phase.

## Phase 1: Build shared packages first
Objective: Remove coupling hotspots before domain refactor.

### 1. packages/crypto
Build one canonical AES-256-CBC implementation:
- encrypt(text: string) => { iv, content }
- decrypt({ iv, content })
- EncryptedPayload interface

Migration note:
- Existing gmail route uses colon-separated token format.
- Normalize to object payload in callers later.

### 2. packages/config
Centralize platform and environment config:
- HOSTING_PROVIDERS typed registry
- DB_PROVIDERS typed array from model enum
- validateEnv() via Zod

Required env:
- PORT
- MONGODB_URI
- FRONTEND_URL
- ENCRYPTION_KEY
- FIREBASE_PROJECT_ID

Optional env:
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- SPREADSHEET_ID

### 3. packages/errors
Create typed error hierarchy:
- AppError(statusCode, code, isOperational)
- NotFoundError
- AuthError
- ForbiddenError
- ValidationError(fields?)
- ConflictError
- isAppError type guard

### 4. packages/types
Create shared contracts and entities:
- UserConnection
- User
- DatabaseType union
- RepoSummary and RepoDetails
- API request/response contracts for connections and hosting status

Verification for Phase 1:
- Typecheck compiles for packages.
- No runtime wiring yet.
- No callers refactored yet unless explicitly planned.

## Phase 2: Restructure API by domain (highest risk)
Objective: Move from route-centric files to self-contained domains with controlled cross-domain dependencies.

Execution method:
- Pilot with auth only.
- Repeat domain extraction pattern one domain at a time.
- Confirm one endpoint after each domain extraction.

Per-domain structure:
- domains/<name>/router.ts
- domains/<name>/controller.ts
- domains/<name>/service.ts
- domains/<name>/model.ts

Controller rule:
- Throw typed errors from @servx/errors instead of ad hoc res.status patterns.

Model rule:
- Re-export existing mongoose models first to avoid early data-layer churn.

App wiring:
- Update api app bootstrap to import new domain routers.
- Preserve old files until route parity is confirmed.

Domain order recommendation:
1. auth (pilot)
2. github
3. databases
4. connections
5. hosting
6. gmail
7. operations
8. admin

Verification after each domain:
- Run API.
- Exercise one canonical endpoint for that domain.
- Fix import/type breaks immediately.

## Core layer after initial domains
Create shared middleware in core:
- requireAuth.ts with Express Request augmentation
- isAdmin.ts converted to TypeScript
- errorHandler.ts as final middleware

Error middleware behavior:
- AppError => return status and code/message payload
- unknown errors => log and return INTERNAL_ERROR 500
- autoMedic handling invoked for non-operational errors only

Registration rule:
- errorHandler must be the final app.use call.

## Phase 3: Restructure frontend by feature
Objective: Convert page/component sprawl to feature ownership with typed APIs and hooks.

Pilot feature: github

Target feature layout:
- features/github/index.tsx
- features/github/GitHubDashboard.tsx
- features/github/GitHubIntegration.tsx
- features/github/RepositoryAccess.tsx
- features/github/types.ts
- features/github/api.ts
- features/github/hooks.ts

Feature migration rules:
- Move first, then merge types.
- Extract API calls from UI components into api.ts.
- Extract query/mutation logic into hooks.ts.
- Update App route import only after feature compiles.

Verification:
- npm run build in apps/web passes with zero TypeScript errors.

Repeat for:
- databases
- hosting
- operations
- emails
- admin
- auth

## Phase 4: Worker and boundary enforcement
Objective: Isolate background jobs and enforce architecture contracts.

Worker app:
- apps/worker package with independent entrypoint
- move generateExpertCache and seedCache scripts into worker jobs
- convert to TypeScript
- import shared config/errors/crypto packages

Why worker exists:
- background tasks deploy independently
- failures in jobs do not affect API uptime
- enables scheduled/queued processing

Boundary enforcement:
- Add eslint-plugin-import restrictions:
  - packages cannot import apps
  - api domains cannot import each other directly

Ownership enforcement:
- Add CODEOWNERS entries for feature/domain/package ownership.

## Known codebase hotspots this plan addresses
- Duplicate encryption implementations with incompatible formats
- Provider mapping duplicated across route files
- Generic/non-typed error handling patterns
- Background scripts outside runtime boundaries

## Practical Copilot usage checklist
Before each prompt:
- Define one scope only.
- Include exact files.
- Include exact expected outputs.
- Include explicit verification command.

After each prompt:
- Run the verification command.
- Review changed imports manually.
- Keep old file until smoke check passes.
- Commit small and phase-aligned.

## Suggested commit slicing
- chore(workspace): scaffold apps/packages and rename packages
- feat(packages): add crypto/config/errors/types foundations
- refactor(api-auth): extract auth domain pilot
- refactor(api-*): domain-by-domain extraction commits
- refactor(web-github): frontend feature pilot
- refactor(web-*): feature-by-feature extraction commits
- feat(worker): add worker app and migrate cache jobs
- chore(lint): add boundary enforcement and codeowners

## Exit criteria
Migration is complete when:
- All apps run from workspace structure
- Shared packages are imported by web/api/worker
- API is domain-structured with typed errors
- Frontend is feature-structured with extracted API/hooks
- Worker handles background jobs
- Lint rules block forbidden imports
- CI passes build, tests, and lint
