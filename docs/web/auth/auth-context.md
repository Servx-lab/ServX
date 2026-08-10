# AuthContext Integration

**File:** `apps/web/src/contexts/AuthContext.tsx`

The `AuthContext` serves as the global state orchestrator for identity within the React application. It exposes:

- **Active Identity:** The current authenticated Supabase user (`User | null`).
- **Derived Display Fields:** Extracted profile information (e.g., `email`, `displayName`, `avatar_url`).
- **OAuth Delegation (`linkGitHub()`):** Initiates the GitHub OAuth flow by invoking the backend API URL generator.
- **Session Termination (`logout()`):** Executes a secure sign-out via the Supabase client.
- **Zero-Trust Synchronization:** Automatically hydrates the Supabase PostgreSQL user profiles and registers the device fingerprint via the `/api/auth/sync` endpoint.

## API Interoperability

The context leverages the global **`apiClient`** to perform requests. This ensures that the Supabase JWT bearer token and the critical `x-device-uuid` headers are automatically injected into every request, maintaining synchronized state between the client and the Control Plane.

## Consumer Hooks

**File:** `apps/web/src/features/auth/hooks.ts`  
The `useAuth()` hook re-exports this context, providing a clean, type-safe interface for all downstream feature components to access identity state.
