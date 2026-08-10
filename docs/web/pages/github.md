# GitHub Integration Dashboard

**Route:** `/github`  
**Feature:** `apps/web/src/features/github/`

The central hub for GitHub orchestration. It surfaces connected repositories, access levels, and dependency trees. The layout is a composition of **`GitHubDashboard`**, **`GitHubIntegration`**, and **`RepositoryAccess`** components.

## API Surface

- `GET /api/github/status` — Validates active OAuth connection status.
- `GET /api/github/repos` — Retrieves the authenticated user's repository list.
- `GET /api/github/repos/:owner/:repo/details` — Fetches granular repository metadata.
- `POST /api/github/collaborator/role` — Mutates collaborator access controls.

For backend implementation details, see [api/domain-github.md](../../api/domain-github.md).

## Authorization Requirements

Access to this route requires a valid **Supabase session** that possesses a cryptographically synced **GitHub OAuth token** stored in the backend vault (hydrated via `/api/auth/sync`).
