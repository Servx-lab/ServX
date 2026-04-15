# Shared web utilities and components

## API client

**File:** `apps/web/src/lib/apiClient.ts`

- Axios instance with `baseURL` derived from `VITE_API_BASE_URL` / `VITE_API_URL`, defaulting to `/api` for Vite proxy to the API in development.
- **Request interceptor:** reads Firebase `getAuth().currentUser`, calls `getIdToken()`, sets `Authorization: Bearer <token>`.
- **Response interceptor:** logs 401 responses (unless `skipAuthErrorLog` on config).

## `ProfilePhoto`

**File:** `apps/web/src/components/ProfilePhoto.tsx`

Renders user avatars from URLs (e.g. Google `lh3.googleusercontent.com`) with **`referrerPolicy="no-referrer"`** to avoid broken images when referrers are sent, and falls back to initials on **`onError`**.

## UI primitives

**Folder:** `apps/web/src/components/ui/`

shadcn/Radix-based components (`button`, `dialog`, `table`, `avatar`, etc.). **`AvatarImage`** defaults to `referrerPolicy="no-referrer"` for external profile URLs.

## Other shared

- **`ServXLogo`** — branding.
- **`MetricCards`**, **`DatabaseViewer`** — reused widgets where imported.
- **Firebase** — [lib/firebase-client.md](./lib/firebase-client.md)
- **Device ID** — `lib/deviceUtils.ts` (used by `SecurityInfo`)
