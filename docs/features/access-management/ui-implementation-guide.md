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
- **Accordions**: Resources are grouped into GitHub, Servers, and Databases to reduce cognitive load.
- **Category Toggles**: Each section has a "Master Toggle" at the top. If this is turned off, the individual resource switches below it are disabled and visually dimmed.
- **Truncation & Tooltips**: Long repository names (`owner/very-long-repo-name`) are truncated with ellipsis to maintain layout integrity.

## 3. Saving Workflow
- When "Save Access" is clicked, the UI constructs a unified `AccessPermissions` object.
- It translates the local "Set" of checked IDs back into standard arrays for the API.
- Upon success, it triggers a "Toast" notification and refreshes the parent dashboard state.
