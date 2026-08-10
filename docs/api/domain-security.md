# Domain: Security Command

**Route:** `/api/security`  
**Location:** `apps/api/src/domains/security/`

This domain manages high-level security orchestration, including manual scanning triggers, GitHub vulnerability aggregation, and the definition of custom Project Groups.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/scan-target` | `requireAuth` | Initiates an immediate vulnerability scan against a designated repository. |
| `POST` | `/installation-token` | `requireAuth` | Securely saves the ephemeral GitHub App installation token. |
| `GET`  | `/vulnerabilities/:owner/:repo` | `requireRepoEditorOrAdmin` | Fetches historical and active vulnerabilities for a specific repository. |
| `GET`  | `/groups` | `requireAuth` | Lists user-defined project groups for security aggregation. |
| `POST` | `/groups` | `requireAuth` | Creates or updates a project group. |
| `DELETE` | `/groups/:id` | `requireAuth` | Removes a project group. |
