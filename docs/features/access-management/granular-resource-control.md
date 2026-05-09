# Granular Resource Access Control

This document outlines the logic used to implement resource-level permissions in ServX.

## 1. The Challenge
Previously, ServX used boolean flags (e.g., `canAccessGithub`) which granted access to **all** connected resources of that type. To support team environments, we needed a way to restrict users to specific repositories, servers, or databases.

## 2. Granular Allow Lists
We introduced a `granularAllow` object within the user's permission set:

```typescript
export interface GranularAllow {
  repoKeys?: string[];     // Array of "owner/repo" strings
  serverIds?: string[];    // Array of vault UUIDs from hosting_vault
  databaseIds?: string[];  // Array of vault UUIDs from db_vault
}
```

## 3. Nested Resource Mapping
Starting in v2.4, the system implements a parent-child relationship between source code (GitHub) and production environments (Hosting):

- **Auto-Linking**: When fetching resources, the backend `getAdminResources` service attempts to link Vercel/Render projects to their GitHub repositories using `repo_full_name` metadata.
- **Standalone Category**: Resources that cannot be linked are grouped into a `standaloneDeployments` array.

## 4. Enforcement Logic
The enforcement happens at the **Controller** level in the API. Before returning any resource list, the API performs the following steps:

1.  **Retrieve Permissions**: Fetches the user's permissions using `getEffectivePermissions`.
2.  **Category Check**: If the master toggle for a category (e.g., `canAccessHosting`) is false, the entire list is blocked.
3.  **ID Filtering**: If a `granularAllow` list exists for that category:
    - The API fetches all resources the owner has connected.
    - It filters the array using `.filter(item => allowedIds.includes(item.id))`.
    - Only the authorized items are returned to the frontend.

## 5. Security Guard: Ghost Permissions
The UI prevents "Ghost Permissions" by automatically stripping associated deployment IDs when a repository's master deployment toggle is turned off. This ensures that permissions are always logically consistent.
