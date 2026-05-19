# Repository Control Plane - Phase 3 Details

## Objective
Overhaul the `operations` dashboard by stripping out all non-essential security components (DEFCON, Feature Flags, etc.) to establish a clean, purpose-driven UI. The dashboard must strictly act as the Control Plane for binding GitHub repositories and triggering maintenance kill switches.

## Layout Implementation (`apps/web/src/features/operations/index.tsx`)
We have completely rewritten the core index file into a rigid two-row grid layout using Premium Tailwind utilities (`bg-slate-50/50`, `backdrop-blur-md`, `border-slate-100`).

### Row 1: Repository Control Module (Full Width)
This newly constructed module is driven by dual-API integration:
1. **GitHub Selector**: Queries `GET /api/github/repos` and feeds it into a specialized `DropdownMenu` component, allowing the admin to search and target specific repositories linked to their GitHub Installation token.
2. **Registration / PIN Generator**: If the selected repository is unregistered (absent from `GET /api/repositories`), the UI surfaces an "Unsecured Repository" warning with a call-to-action button to `POST /api/repositories`.
3. **Master Toggle**: Once secured, the dashboard displays the active `SERVX_PIN` and reveals a high-contrast switch bounded to `PATCH /api/repositories/:pin/maintenance`. Toggling it triggers a toast confirmation.

### Row 2: Secondary Operational Constraints (50/50 Split)
As per the strict directives, the following modules were preserved and migrated into a unified column split below the Control Plane:
- `<UserCRM />`: The active Ghost Mode administrative simulator.
- `<TaskExecutor />`: The active background operational script execution pane.

### Safety Checks Executed
- Built React dependency arrays perfectly for `fetchData()` ensuring no recursive API calls.
- Validated error boundary fallbacks for the initial load if the User has no connected GitHub account (gracefully fails empty without crashing the view).
