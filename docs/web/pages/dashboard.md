# Dashboard (home)

**Route:** `/dashboard`  
**File:** `apps/web/src/pages/Index.tsx`

Main landing view after authentication. Typically summarizes metrics, shortcuts, or project overview (see `MetricCards` and local page composition).

## APIs

Depends on features embedded in the page; often uses **`apiClient`** and React Query for dashboard-specific endpoints if any.
