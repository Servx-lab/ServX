# SecurityInfo component

**File:** `apps/web/src/components/SecurityInfo.tsx`  
**Used in:** `Sidebar.tsx`

Sidebar widget showing a **device-oriented security** panel:

- Resolves a **device UUID** via **`getDeviceUUID()`** from `apps/web/src/lib/deviceUtils.ts`
- Displays a truncated “Hardware ID” style label
- Includes a **trusted device** toggle (local UI state)

Purely client-side presentation; does not replace server-side security policies.
