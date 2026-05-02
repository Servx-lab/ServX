# Administration — team and access

**Route:** `/admin`  
**Feature:** `apps/web/src/features/admin/`

Team roster: invite by email with role, revoke, and **granular access** modal (repos, deployment servers, databases) per user.

## UI components

| File | Role |
|------|------|
| `index.tsx` | Page shell, team table |
| `UserSearchInviteBar.tsx` | Debounced search, invite form |
| `GranularAccessModal.tsx` | Per-resource toggles |
| `hooks.ts` | React Query hooks |
| `api.ts` | HTTP calls |
| `types.ts` | DTOs |
| `AdminPermissionMatrix.tsx` | Legacy/alternate matrix (if still present) |

## APIs

- `GET /api/admin/list`, `POST /api/admin/invite`, `DELETE /api/admin/revoke/:uid`
- `GET /api/admin/permissions/:userUid`, `POST /api/admin/permissions/update`, `GET /api/admin/resources` (admin-guarded)
- `GET /api/users/search?q=` — requires auth + admin or bootstrap — [api/domain-users.md](../../api/domain-users.md)

## Concept doc

[concepts/team-access-and-granular-permissions.md](../../concepts/team-access-and-granular-permissions.md)
