# Implementation Plan: Zero-Trust Device Approval System

## Goal Description
We are establishing a **Zero-Trust Device Approval System** across the ServX monorepo. In a modern decentralized cloud architecture, user credentials (Firebase Auth JWTs) are not enough; a compromised session token can leak sensitive repository secrets, database credentials, and production server controls. 

This system enforces device-level authentication by registering every device’s hardware-locked browser fingerprint (`orizon_device_uuid`) on first login and requiring explicit administrative approval before allowing the device to execute API actions on sensitive resources.

```
                  [ Web App Client ]
                          │
            Attaches: x-device-uuid header
                          ▼
            [ requireDeviceApproval Middleware ]
                          │
             Checks public.user_devices in Supabase
               /                           \
       [ is_approved = true ]       [ is_approved = false ]
             /                               \
     Proceed to API Route            403 DEVICE_PENDING_APPROVAL
```

---

## User Review Required

> [!IMPORTANT]
> **Zero-Trust Rollout Enforcement Strategy**:
> During initial deployment, should device verification be **strict (blocking)** or **soft (permissive with audit logs)**? 
> * We recommend a **Soft Rollout** first: devices are registered and flagged in audit logs, but not blocked. After a 14-day window, the system switches to **Strict Zero-Trust Enforcement**, where any unapproved device is blocked with a full-screen glassmorphic lock screen.

> [!WARNING]
> **Database Placement Decision**:
> In alignment with the ServX migration playbook (moving permissions and vaults to Supabase to prevent "split-brain" latency), we propose storing device states in a relational PostgreSQL table `public.user_devices` inside Supabase. This leverages relational foreign keys and high-speed indexes rather than legacy Mongoose collections.

---

## Open Questions

> [!IMPORTANT]
> **Auto-Approval of First Device**:
> When a new user bootstraps a team, should their first registered device be **automatically approved**?
> * *Proposed Solution*: If the user is the **first Owner** of a workspace (or the database has zero admins), their device is auto-approved during registration. All subsequent team members and additional devices require manual Owner/Editor approval.

> [!NOTE]
> **Dynamic Re-Fingerprinting**:
> Browser version updates can slightly change canvas signatures or user-agent parameters. If a device's fingerprint changes slightly, should we support a "Request Rekeying" flow, or treat it strictly as a new device registration?
> * *Proposed Solution*: We will treat fingerprint alterations as a new device to maintain strict zero-trust standards. The user's new fingerprint will be registered as `pending`, requiring a quick re-approval from an Owner/Editor.

---

## Proposed Changes

### Database Layer (Supabase Migration)

#### [NEW] [migration-supabase-devices.sql](file:///C:/vs/servx/supabase/migrations/migration-supabase-devices.sql)
Establish the `user_devices` table to persist hardware fingerprints, user associations, and trust statuses.

*   Define table `public.user_devices`:
    *   `id` (UUID, Primary Key)
    *   `user_uuid` (TEXT, links to Firebase UID)
    *   `device_fingerprint` (TEXT, unique SHA-256 fingerprint hash)
    *   `device_name` (TEXT, e.g. "Safari on iOS", "Chrome on Windows")
    *   `is_approved` (BOOLEAN, default `false`)
    *   `last_active_at` (TIMESTAMPTZ, default `now()`)
    *   `created_at` (TIMESTAMPTZ, default `now()`)
*   Add unique constraint `UNIQUE(user_id, device_fingerprint)` to prevent multiple rows per device.
*   Create GIN/B-tree indexes on `device_fingerprint` and `user_id` for microsecond API lookups.
*   Enable Row Level Security (RLS) policies:
    *   Users can read their own devices.
    *   Admins can view and update all devices for team auditing.

---

### Backend API (`apps/api`)

#### [NEW] [requireDeviceApproval.ts](file:///C:/vs/servx/apps/api/src/core/middleware/requireDeviceApproval.ts)
A global/route-specific Express middleware verifying that the incoming request is accompanied by an approved device fingerprint.

*   Extract `x-device-uuid` from the incoming headers.
*   If absent: Throw an `AuthError` ("Missing device signature").
*   Query `public.user_devices` in Supabase:
    *   If no record exists: Register the fingerprint in `pending` state and throw a `ForbiddenError` with code `DEVICE_PENDING_APPROVAL`.
    *   If record exists but `is_approved` is `false`: Throw a `ForbiddenError` with code `DEVICE_PENDING_APPROVAL`.
    *   If `is_approved` is `true`: Update `last_active_at` asynchronously and call `next()`.

#### [NEW] [device router, controller, service](file:///C:/vs/servx/apps/api/src/domains/security)
Extend the `/api/security` domain or create a dedicated `/api/devices` endpoint suite.

*   `POST /api/devices/register`: Allows clients to declare their local device specifications (User Agent, OS, user-supplied nickname) for a given fingerprint.
*   `GET /api/devices/my-device/status`: Lightweight status check utilized by the client-side loading/takeover boundaries.
*   `GET /api/admin/devices`: Admin-only view to list all registered devices. 
    *   *Hardening check*: Check the `canViewDeviceUUIDs` permission flag on `req.user`. If false, mask device UUIDs (e.g. `DEVICE-A8B9...`). If true, output the full string for audit verification.
*   `POST /api/admin/devices/approve`: Admin-only endpoint to toggle `is_approved`. Requires global roles `owner` or `editor`.

---

### Frontend Web Client (`apps/web`)

#### [MODIFY] [apiClient.ts](file:///C:/vs/servx/apps/web/src/lib/apiClient.ts)
*   Inject the `x-device-uuid` header into every outbound Axios request using a request interceptor, pulling it dynamically via the existing `getDeviceUUID()` utility.

#### [MODIFY] [SecurityInfo.tsx](file:///C:/vs/servx/apps/web/src/components/SecurityInfo.tsx)
*   Refactor the sidebar security widget to perform a live state synchronization.
*   Display a colored badge showing current device status:
    *   🟢 **Approved**: Connected securely.
    *   🟡 **Pending**: Awaiting owner verification.
    *   🔴 **Unregistered/Untrusted**: Blocked local access.
*   Replace local-only state with a React Query hook reading from the status API.

#### [NEW] [DeviceTakeoverShield.tsx](file:///C:/vs/servx/apps/web/src/features/security/DeviceTakeoverShield.tsx)
*   Create a beautiful, highly premium full-screen takeover modal (blur effects, HSL gradient glow, zero-trust shield micro-animations).
*   Triggered immediately if the global API interceptor receives a `DEVICE_PENDING_APPROVAL` status code.
*   Displays the user's specific **Hardware ID** (`DEVICE-XXXXXX`) and provides a simple, direct "Copy Fingerprint" action so they can message their workspace owner.

#### [MODIFY] [AdminPermissionMatrix.tsx](file:///C:/vs/servx/apps/web/src/features/admin/AdminPermissionMatrix.tsx)
*   Add a dedicated **Registered Devices** audit table inside the Administration Panel.
*   Display team members, their associated device names, browser details, last active timestamps, and toggle switches to instantly approve or revoke device trust.
*   Enforce the `canViewDeviceUUIDs` matrix permission: show full UUID values only to authorized users.

---

## Verification Plan

### Automated Tests
*   **API Middleware Test**: Execute `supertest` scenarios asserting:
    *   Request without `x-device-uuid` ➜ Returns `401 Unauthorized`.
    *   Request with unapproved `x-device-uuid` ➜ Returns `403 Forbidden` with `{ code: 'DEVICE_PENDING_APPROVAL' }`.
    *   Request with approved `x-device-uuid` ➜ Passes through with `200 OK`.
*   **Database Constrains Test**: Unit tests verifying that duplicate `(user_id, device_uuid)` rows violate SQL constraints.

### Manual Verification
1.  **Bootstrap Test**: Log in to a fresh environment; verify that the initial admin device is auto-approved.
2.  **Zero-Trust Enforcement Test**:
    *   Log in from a separate browser or incognito window to simulate a second device fingerprint.
    *   Verify that the frontend immediately triggers the full-screen **Device Pending Approval** lock shield.
3.  **Approval Portal Test**:
    *   As the Primary Owner, log in on the approved browser.
    *   Navigate to Admin panel ➜ Devices. Find the secondary device, verify the masked/unmasked fingerprint based on permissions, and click **Approve**.
    *   Verify that the secondary browser's takeover shield instantly vanishes, loading the dashboard.
