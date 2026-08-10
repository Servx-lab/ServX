# Access Management Logic Documentation

This document specifies the implementation of granular access and team management in ServX.

## 1. Architecture Overview

The feature follows a full-stack implementation across the monorepo:
- **Shared Types**: `@servx/types` defines the source of truth for user permissions.
- **Backend API**: `apps/api/src/domains/admin` manages persistence (migrating from MongoDB to Supabase/PostgreSQL).
- **Frontend UI**: `apps/web/src/features/admin` provides the administration dashboard.

## 2. Permission Model

ServX uses a **Triple-Layer Permission Model**:

### Layer 1: Global Roles
Stored in the relational database (migrating from MongoDB `Admin` collection to PostgreSQL).
- **Owner**: Full access, can manage other admins.
- **Editor**: Write access to authorized resources.
- **Viewer**: Read-only access to authorized resources.

### Layer 2: Area Access Flags (New)
Stored in the `AccessControl.permissions.global` object. These act as "Master Switches":
- `canAccessHosting`: Enables/Disables the entire Hosting & Servers section.
- `canAccessGithub`: Enables/Disables GitHub repository data and graph insights.
- `canAccessDatabases`: Enables/Disables the Database explorer and connection settings.

### Layer 3: Resource-Level Granularity
Stored in the `AccessControl.permissions.granularAllow` object.
- **`repoKeys`**: List of GitHub `full_name` strings the user is permitted to see.
- **`serverIds`**: List of `hosting_vault` IDs the user is permitted to manage.
- **`databaseIds`**: List of `db_vault` IDs the user is permitted to explore.

> [!NOTE]
> If `granularAllow` is `null`, the user has access to **all** connected resources within their enabled Areas.

## 3. Data Flow

### User Discovery & Invitation
1.  **Search**: The `UserSearchInviteBar` hits `GET /api/users/search?q=...`.
2.  **Supabase Lookup**: The backend queries `user_profiles` in Supabase using `ILIKE`.
3.  **Invite**: `POST /api/admin/invite` adds a record to the `Admin` Mongoose model.

### Permission Updates
1.  **Fetch**: When the modal opens, it calls `GET /api/admin/permissions/:userId`.
2.  **Update**: The `GranularAccessModal` sends the entire `Permissions` object to `POST /api/admin/permissions/update`.
3.  **Persistence**: The backend uses `findOneAndUpdate` with `upsert: true` on the `AccessControl` collection.

## 4. Component Logic

### GranularAccessModal.tsx
- **State Management**: Uses local state to track pending changes to area flags and resource lists.
- **Resource Loading**: Uses `getAdminResources` to fetch all system-wide connections (Vaults) to populate the toggle lists.
- **UI Interaction**: Toggling an **Area Master Switch** dims the associated resource list using conditional CSS classes and `pointer-events-none`.

## 5. Persistence (Migration to PostgreSQL)

The legacy MongoDB `AccessControl` schema defined the structure for these permissions. Under the Zero-Trust migration playbook, this is being transitioned to relational tables with Row Level Security (RLS) to prevent split-brain latency:

```javascript
global: {
  isFullControl: Boolean,
  canAccessHosting: Boolean,
  canAccessGithub: Boolean,
  canAccessDatabases: Boolean
},
granularAllow: {
  repoKeys: [String],
  serverIds: [String],
  databaseIds: [String]
}
```
