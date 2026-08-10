# Domain: Devices (Zero-Trust)

**Route:** `/api/devices`  
**Location:** `apps/api/src/domains/devices/`

This domain governs the zero-trust hardware fingerprinting and device approval lifecycle. It is tightly coupled with the Supabase `public.user_devices` table to strictly limit API execution capabilities to trusted browser fingerprints.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/listen-requests` | `requireAuth` | An SSE endpoint for workspace owners to listen for real-time device approval requests from their team. |
| `GET`  | `/listen-approval/:fingerprint` | `requireAuth` | An SSE endpoint for a pending device to listen for its own approval status mutation. |
| `GET`  | `/` | `requireAuth` | Lists all registered devices for the authenticated user/tenant. |
| `DELETE` | `/:id` | `requireAuth` | Revokes trust for a specific device, immediately blacklisting its hardware fingerprint. |
| `POST` | `/approve` | `requireAuth` | Administrative action to approve a pending device fingerprint. |
| `POST` | `/set-main` | `requireAuth` | Designates a specific device as the user's primary hardware terminal. |
