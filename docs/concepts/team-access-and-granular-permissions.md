# Concept: Team Access & Granular Permissions

This document outlines the administration and authorization model utilized by `/admin` routes and the internal API access control logic.

## Supabase Identity & MongoDB Roles

### `Admin` (`models/Admin.js`)

Maintains one document per dashboard **team member**, determining their global workspace role:

- `uid` — Supabase Auth UID  
- `email` — Registered email address
- `role` — Determines privilege (`owner` | `editor` | `viewer`)  
- `addedAt` — Timestamp

Inviting a new member creates a row after verifying the email exists within **Supabase Auth** (`inviteUserAsAdmin` in the admin service).

### `AccessControl` (`models/AccessControl.js`)

Maintains strict, per-user permission boundaries based on the `ownerUid` and `userUid`, storing granular `permissions`:

- Global/Legacy flags (repos, dbs, `global` flags).
- **`granularAllow`** — An explicitly defined allowlist limiting visibility:
  - `repoKeys` — GitHub `full_name` strings.
  - `serverIds` — Hosting `UserConnection` IDs.
  - `databaseIds` — Database connection IDs.

When `granularAllow` is **null**, the UI correctly defaults to treating access as **full/unrestricted** for available resources.

## User Search (`GET /api/users/search`)

Resolves **Supabase `user_profiles`** documents by email, username, or name for the team invite autocomplete widget. This endpoint strictly requires a validated Supabase JWT plus active **admin membership** (or bootstrap mode if no admins exist). See [api/domain-users.md](../api/domain-users.md).
