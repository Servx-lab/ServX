# Concept: Team access and granular permissions

This document describes the **administration** model used by `/admin` and related APIs.

## MongoDB collections

### `Admin` (`models/Admin.js`)

One document per dashboard **team member** with a global role:

- `uid` — Firebase UID  
- `email`  
- `role` — `owner` | `editor` | `viewer`  
- `addedAt`

Inviting adds a row after verifying the email exists in **Firebase Auth** (`inviteUserAsAdmin` in admin service).

### `AccessControl` (`models/AccessControl.js`)

Per **owner** and **target user** (`ownerUid`, `userUid`), stores `permissions` including:

- Legacy/global flags (repos, dbs, `global` flags)  
- **`granularAllow`** — optional structure limiting visibility to explicit lists:
  - `repoKeys` — GitHub `full_name` strings  
  - `serverIds` — hosting `UserConnection` ids  
  - `databaseIds` — database connection ids  

When `granularAllow` is **null**, the UI treats access as **full** for available resources (see admin service behavior).

## User search (`GET /api/users/search`)

Searches **MongoDB `User`** documents by email/username/name for the invite autocomplete. Requires Firebase auth plus **admin membership** or **bootstrap** (no admins yet). See [api/domain-users.md](../api/domain-users.md).

## Profile photos

Google-hosted avatars may fail if the browser sends a `Referer` header; the web app uses **`referrerPolicy="no-referrer"`** on profile images — see [web/shared-components.md](../web/shared-components.md).
