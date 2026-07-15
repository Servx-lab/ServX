# Zero-Trust "Sentinel" Architecture: System Overview

## Introduction
The Zero-Trust Sentinel Architecture is a custom-built, real-time authentication interceptor designed to prevent unauthorized access by forcing every new device to be explicitly approved by a designated "Main Device". 

Instead of relying on easily phishable SMS codes or transient QR codes, this system leverages a persistent **Device Hierarchy**, Server-Sent Events (SSE), and Redis Pub/Sub to create a flawless, real-time handshake between devices.

## Core Concepts

### 1. Device Hierarchy (Master/Node)
Every authenticated session is fingerprinted and stored in the `user_devices` Supabase table. 
- The first device a user logs in with is automatically designated as the **Main Device** (`is_main_device: true`).
- Any subsequent device that attempts to log in is considered an **Unrecognized Node** (`is_main_device: false`) and is placed into a `PENDING` state.

### 2. The Interceptor (RequireAuth)
When a user logs in, the `syncUser` backend endpoint analyzes the device's status. If the device is `PENDING`, the backend returns a `403 device_pending_approval` error. The React frontend (`RequireAuth.tsx`) catches this and blocks access to the dashboard, rendering the Sentinel Waiting Room (`DevicePendingTakeover.tsx`) instead.

### 3. Real-Time Handshake (SSE & Redis)
- **The Waiting Room**: The blocked device opens an SSE connection (`GET /api/devices/listen-approval/:fingerprint`) and waits for its specific status to change.
- **The Global Drawer**: The Main Device globally mounts `ApprovalDrawer.tsx`, which opens an SSE connection (`GET /api/devices/listen-requests`) to listen for incoming login attempts across the user's account.
- **The Ping**: When the blocked device hits the backend, the backend publishes a Redis event (`device_approvals:${userId}`) containing the new device's IP, Geographic Location, and ISP.
- **The Resolution**: The Main Device receives the Redis event via SSE, displays the beautiful drawer UI, and the user clicks "Approve". This hits `POST /api/devices/approve`, which updates the database and sends a success payload through Redis back to the Waiting Room, instantly unlocking it.

## Architecture Flow Diagram

1. `Unapproved Device` -> Logs In -> Hits `POST /api/auth/sync`
2. `Backend` -> Checks `user_devices`. Returns `403`. Publishes `login_request` to Redis.
3. `Unapproved Device` -> Renders `DevicePendingTakeover.tsx` -> Connects to `/listen-approval`.
4. `Main Device` -> Receives `login_request` via `/listen-requests` SSE -> Renders `ApprovalDrawer.tsx`.
5. `Main Device` -> Clicks Approve -> Hits `POST /api/devices/approve`.
6. `Backend` -> Updates DB to `APPROVED`. Publishes `device_resolved` to Redis.
7. `Unapproved Device` -> Receives `device_resolved` via SSE -> Reloads page -> Enters Dashboard!
