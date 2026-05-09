# Supabase Permission Architecture

This document explains the transition from MongoDB to Supabase for storing team access permissions.

## 1. Rationale for Migration
- **Data Locality**: The resources being protected (Vaults) are stored in Supabase. Storing the permissions in the same database prevents "split-brain" scenarios where a resource exists in one DB but its access record is out of sync in another.
- **Relational Integrity**: Future enhancements can use foreign key constraints between `team_access_control` and the vault tables.
- **Performance**: Reducing the need to query two different database systems (MongoDB and Supabase) during a single API request improves latency.

## 2. Table Schema: `team_access_control`
The table is designed to be multi-tenant, linking a team member to a specific resource owner.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `owner_id` | `TEXT` | The UID of the person who owns the resources. |
| `user_id` | `TEXT` | The UID of the team member receiving access. |
| `permissions` | `JSONB` | The full permission set (Global + Granular). |
| `updated_at` | `TIMESTAMPTZ`| Last modification time. |

## 3. JSONB Structure
The `permissions` column stores the configuration as a JSON object, allowing for easy expansion without schema migrations:

```json
{
  "global": {
    "canAccessHosting": true,
    "canAccessGithub": false,
    "canAccessDatabases": true
  },
  "granularAllow": {
    "repoKeys": [],
    "serverIds": ["uuid-1", "uuid-2"],
    "databaseIds": ["db-uuid-a"]
  }
}
```

## 4. Migration Strategy
During the transition phase, the `getAdminPermissions` service uses a **read-fallback** strategy:
1. Try to find record in Supabase.
2. If not found, look for legacy records in MongoDB.
3. Once an admin updates a user's access, the new record is written to Supabase, becoming the new source of truth.
