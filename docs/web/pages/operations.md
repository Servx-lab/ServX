# Operations

**Route:** `/operations`  
**Feature:** `apps/web/src/features/operations/`

Operations center: projects, maintenance toggles, task execution, FinOps-style widgets, “ghost mode” / admin tooling (as implemented in `index.tsx` and **`ProjectContext`**).

## APIs

- `GET /api/operations/projects`
- `POST /api/operations/toggle-maintenance`
- `POST /api/operations/tasks/execute` or `POST /api/tasks/execute` (same router mounted twice)

See [api/domain-operations.md](../../api/domain-operations.md).

## Key files

- `index.tsx` — large surface area UI
- `api.ts`, `hooks.ts`, `ProjectContext.tsx`, `AutoMedicPipeline.tsx`
