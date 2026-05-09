# Admin UI Implementation Guide

This document describes the frontend implementation of the granular access management interface.

## 1. Component Architecture: `GranularAccessModal.tsx`
The management interface is built as a highly responsive modal that provides real-time feedback on resource availability.

### Data Fetching
When opened, the modal triggers two parallel requests:
1.  `getPermissions(userUid)`: Retrieves the current permission set for the target user.
2.  `getAdminResources()`: Retrieves the full list of repositories, servers, and databases available to the owner.

### State Management
- **Local Permissions State**: Tracks changes to global toggles.
- **Granular Allow (GA) State**: Tracks the list of checked IDs.
- **Initial Sync**: If the user has never had granular permissions before, the UI defaults to "Full Access" (all items checked) to ensure backward compatibility with simple category toggles.

## 2. Visual Hierarchy
- **Nested Accordions**: Resources are grouped into a primary "Infrastructure & Apps" section. Each repository is an `AccordionItem` that expands to show associated deployments.
- **Dual Toggles**: Each repo has a "GitHub Graph Access" switch and a "Deployment Access" switch.
- **Conditional Visibility**: Deployment checklists only appear if the master "Deployment Access" toggle is ON. If OFF, the children are dimmed and disabled.
- **Standalone Section**: Unmapped deployments are listed in a separate "Standalone Deployments" section below the repos.

## 3. Security Logic: Ghost Permissions
To ensure data integrity, the modal implements a reactive cleanup strategy:
- When the `Deployment Access` master toggle for a repo is turned **OFF**, the UI automatically filters the `ga.serverIds` array to remove all child IDs belonging to that repo.
- This prevents a scenario where a user might retain hidden access to sub-resources after the parent access is revoked.

## 4. Saving Workflow
- When "Save Access" is clicked, the UI constructs a unified `AccessPermissions` object.
- It translates the local state back into standard arrays (`repoKeys`, `serverIds`, `databaseIds`).
- Upon success, it triggers a "Toast" notification and closes the modal.
