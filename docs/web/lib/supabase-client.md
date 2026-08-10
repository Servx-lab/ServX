# Supabase Client Wrapper

**File:** `apps/web/src/lib/supabase.ts`

This file is responsible for initializing the **Supabase JavaScript Client** and exporting the highly critical `supabase` instance utilized throughout the Single Page Application (SPA) for session management and token generation.

## Global Usage

This instance is imported across the application architecture (most notably within the `AuthContext` and `apiClient` interceptors) whenever a JWT or session validation is required.

## Hardened Configuration

The client requires the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables. These are safely injected via the deployment pipeline at build time. The application strictly relies on Row Level Security (RLS) and API-enforced token validation rather than client-side secrets.
