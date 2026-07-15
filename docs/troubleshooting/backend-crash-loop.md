# Backend Crash Loop Analysis

## Background
The ServX backend utilizes `tsx --watch` via the `concurrently` package to automatically restart the Node.js server whenever a file change is detected during development.

## The Problem
If a critical module is imported but missing from `package.json`, the backend will crash on startup with a fatal `MODULE_NOT_FOUND` error. Because `tsx --watch` interprets process exits, or the outer script restarts on failure, it can enter an infinite restart loop.

During a recent update to the Profile feature (`apps/api/src/domains/profile/controller.ts`), the `cloudinary` SDK was imported to handle avatar uploads, but `cloudinary` was never added to `apps/api/package.json`. 

This caused the backend to crash immediately after initializing the Supabase Admin client. As a result, the frontend UI constantly displayed `ERR_CONNECTION_REFUSED` network errors because the API server was effectively offline.

## The PGRST204 Schema Error
While diagnosing the crash, a secondary issue was discovered regarding the Supabase schema. We attempted to insert a `status` column value (`status: 'connected'`) into the `hosting_vault` table.

However, `hosting_vault` did not contain a `status` column. This triggered a `PGRST204: Could not find the 'status' column of 'hosting_vault' in the schema cache` error from PostgREST (Supabase).

## Resolution
1. **Dependency Installation**: Added `"cloudinary": "^2.5.1"` to `apps/api/package.json` and ran `npm install` to resolve the `MODULE_NOT_FOUND` error and stop the crash loop.
2. **Schema Logic Reversion**: Instead of running a database migration to add a `status` column to `hosting_vault`, we reverted the backend logic. The UI relies on the presence of the `error` field in the JSON response to determine connection health, making a dedicated `status` column in the database unnecessary.
