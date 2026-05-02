# Firebase client (web)

**File:** `apps/web/src/lib/firebase.ts`

Initializes the Firebase **web app**, **Analytics**, and exports **`auth`** (`getAuth`) used across the SPA for sign-in and ID tokens.

## Usage

Imported as `auth` or default `app` wherever `getAuth()` / user session is needed (e.g. `AuthContext`, `apiClient`).

## Configuration

Firebase config is currently **in source** in this file. For production hardening, prefer **`import.meta.env`** (`VITE_*`) so secrets and project IDs are not committed — align with your deployment pipeline.
