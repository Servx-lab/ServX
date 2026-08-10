# Architectural Overview

> [!IMPORTANT]  
> **Architecture Update:** ServX has migrated to a distributed, three-service architecture. For comprehensive documentation regarding the Main-UI API, AutoMedic, and Exposure Analysis services—including service-to-service authentication and secure GitHub token flows—please refer to the [Microservices Architecture Overview](./microservices/overview.md).

ServX is engineered as a **monorepo** utilizing npm workspaces. The repository encompasses the following core components:

1. **`apps/web`** — A Single Page Application (SPA) built with Vite, React, and TypeScript. It leverages React Router for navigation, TanStack Query for state management, and Supabase Auth for identity resolution. A shared Axios client (`apiClient`) automatically attaches Supabase JWTs to all `/api/*` requests.
2. **`apps/api`** — A robust Express 5 API backend. It handles Supabase JWT verification and manages data persistence. *Note: Data persistence is actively migrating from legacy MongoDB (Mongoose models) exclusively to Supabase/PostgreSQL to resolve split-brain state.* It also utilizes **Redis** for optional caching.
3. **`packages/*` (`types`, `errors`, `crypto`)** — A collection of shared TypeScript libraries universally consumed by both the API and the web application.
4. **`apps/worker`** — An optional Node.js worker designated for background processing, such as cache seeding.
5. **`servx-attackpaths`** — A strictly isolated security scanning executor deployed on a separate infrastructure. It securely receives execution tasks from the main control plane via an HMAC-secured bridge.

## Client Request Lifecycle (Dashboard)

1. The client authenticates using **Supabase Auth** within the browser environment.
2. The web application issues HTTP requests (`GET`/`POST`) to `https://<api>/api/...`, supplying an `Authorization: Bearer <Supabase JWT>` header.
3. API-level middleware (e.g., `requireAuth`, `isAdmin`) rigorously verifies the JWT and attaches the resolved `req.user` or `req.uid` context to the request object.
4. Domain-specific controllers route the request to designated services, which execute business logic (e.g., MongoDB read/write operations, GitHub API interactions, and hosting provider integrations).

## Frontend Shell Architecture

All authenticated application routes are strictly wrapped by the **`RequireAuth`** component. These routes are typically nested within the **`DashboardLayout`** (which provisions the persistent sidebar and main content areas). For detailed layout specifications, refer to [web/layout-shell.md](../web/layout-shell.md).

## High-Level Security Posture

- **Identity Resolution:** **Supabase** exclusively governs end-user authentication. The API implicitly trusts cryptographically verified JWT tokens.
- **Administrative Access:** Privileged features (such as team management and granular endpoint permissions) are enforced via database roles. *Note: These are actively migrating from legacy MongoDB `Admin` records to PostgreSQL RLS policies.* Further details are available in [concepts/team-access-and-granular-permissions.md](../concepts/team-access-and-granular-permissions.md).
- **Cross-Origin Resource Sharing (CORS):** Strict CORS policies are actively enforced within `apps/api/src/app.ts` to permit only whitelisted frontend origins.
