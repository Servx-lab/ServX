# Shared Web Utilities & Components

## API Client Orchestration

**File:** `apps/web/src/lib/apiClient.ts`

- The core Axios instance derives its `baseURL` from `VITE_API_BASE_URL` (defaulting to `/api` for local Vite proxying).
- **Request Interceptor:** Dynamically reads the active **Supabase session** (via `supabase.auth.getSession()`) and injects the `Authorization: Bearer <token>` header to ensure cryptographic trust on every outbound request.
- **Response Interceptor:** Automatically intercepts 401 Unauthorized responses to handle session expiration (unless explicitly bypassed via `skipAuthErrorLog`).

## `ProfilePhoto`

**File:** `apps/web/src/components/ProfilePhoto.tsx`

Renders user avatars from remote OAuth URLs (e.g., Google or GitHub). Crucially, it enforces **`referrerPolicy="no-referrer"`** to prevent broken images caused by restrictive cross-origin referrer policies. It degrades gracefully to initials via **`onError`**.

## UI Primitives

**Folder:** `apps/web/src/components/ui/`

A robust library of highly-customized, accessible primitives built on top of shadcn/Radix (`button`, `dialog`, `table`, `avatar`). Similar to `ProfilePhoto`, the **`AvatarImage`** primitive defaults to `referrerPolicy="no-referrer"`.

## Ecosystem References

- **`ServXLogo`** — Primary branding component.
- **`MetricCards`**, **`DatabaseViewer`** — Reusable, high-density data widgets.
- **Supabase Client** — Initialization details found in [lib/supabase-client.md](./lib/supabase-client.md).
- **Device Fingerprinting** — `lib/deviceUtils.ts` (Feeds the zero-trust `SecurityInfo` widget).
