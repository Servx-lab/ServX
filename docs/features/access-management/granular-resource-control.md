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

## 3. Enforcement Logic
The enforcement happens at the **Controller** level in the API. Before returning any resource list, the API performs the following steps:

1.  **Retrieve Permissions**: Fetches the user's permissions using `getEffectivePermissions`.
2.  **Category Check**: If the master toggle for a category (e.g., `canAccessHosting`) is false, the entire list is blocked.
3.  **ID Filtering**: If a `granularAllow` list exists for that category:
    - The API fetches all resources the owner has connected.
    - It filters the array using `.filter(item => allowedIds.includes(item.id))`.
    - Only the authorized items are returned to the frontend.

## 4. Impact on Security
This architecture ensures that even if a team member knows the ID of a repository or server they aren't assigned to, the API will refuse to return any metadata or allow any operations on that resource.
