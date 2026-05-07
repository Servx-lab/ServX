# API domain: Admin (`/api/admin`)

**Router:** `apps/api/src/domains/admin/router.ts`  
**Controller / service:** `domains/admin/controller.ts`, `service.ts`  
**Models:** `Admin`, `AccessControl` (see `domains/admin/model.ts` and `models/AccessControl.js`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/invite` | — | Invite user by email (creates `Admin` row) |
| GET | `/api/admin/list` | — | List admins |
| DELETE | `/api/admin/revoke/:uid` | — | Remove admin |
| GET | `/api/admin/permissions/:userUid` | **isAdmin** | Load `AccessControl` permissions |
| POST | `/api/admin/permissions/update` | **isAdmin** | Update permissions (incl. granular allow lists) |
| GET | `/api/admin/resources` | **isAdmin** | Repos (GitHub), DB connections, hosting connections for matrix UI |

> Hardening note: invite/list/revoke may need `requireAuth` + admin checks in production; see service layer for current assumptions.
