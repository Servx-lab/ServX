# API domain: GitHub (`/api/github`)

**Router:** `apps/api/src/domains/github/router.ts`  
**Controller:** `domains/github/controller.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/github/status` | requireAuth | Connection / token health |
| GET | `/api/github/repos` | requireAuth | List repos for stored GitHub token |
| GET | `/api/github/repos/:owner/:repo/details` | requireAuth | Repo metadata |
| POST | `/api/github/collaborator/role` | requireAuth | Update collaborator role |

Uses GitHub REST API with OAuth token from the **`User`** document.
