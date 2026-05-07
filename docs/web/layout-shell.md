# Dashboard layout and sidebar

## `DashboardLayout`

**File:** `apps/web/src/components/DashboardLayout.tsx`

Provides the main **shell** for authenticated pages: typically a **sidebar** region plus a **main** content area (often styled as a card on a contrasting background). Uses React Router **`Outlet`** so nested route components render inside the main panel without remounting the shell on navigation.

## `Sidebar`

**File:** `apps/web/src/components/Sidebar.tsx`

- Navigation links (dashboard, databases, GitHub, hosting providers, operations, admin, etc.).
- User menu with profile photo via **`ProfilePhoto`** (see [shared-components.md](./shared-components.md)), profile and connections shortcuts, logout.
- Uses **`NavLink`** for active route styling.

## `SecurityInfo`

**File:** `apps/web/src/components/SecurityInfo.tsx`

Small **security / device ID** widget in the sidebar. See [components/security-info.md](./components/security-info.md).

## Related

- [routing.md](./routing.md) — which routes use this layout
- [auth/require-auth.md](./auth/require-auth.md) — gating dashboard access
