# GitHub

**Route:** `/github`  
**Feature:** `apps/web/src/features/github/`

GitHub integration: repositories, details, collaborator access, dependency views. Composes **`GitHubDashboard`**, **`GitHubIntegration`**, **`RepositoryAccess`**, etc.

## APIs

- `GET /api/github/status` — connection status
- `GET /api/github/repos` — repo list
- `GET /api/github/repos/:owner/:repo/details` — repo metadata
- `POST /api/github/collaborator/role` — update collaborator role

See [api/domain-github.md](../../api/domain-github.md).

## Auth

Requires Firebase user with valid **GitHub OAuth token** stored server-side (synced via `/api/auth/sync` / OAuth flow).
