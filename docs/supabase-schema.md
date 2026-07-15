# ServX Supabase Schema Documentation

This document provides a comprehensive overview of the database tables currently configured in the ServX Supabase instance, detailing their structure, responsibilities, and how data is managed across the platform.

## 1. Authentication & User Details (`auth.users`)
**Type:** Built-in Supabase Auth Table (Internal Schema)
**Purpose:** Handles all identity, session management, and authentication for ServX. 

### How User Details Are Saved
Currently, all your onboarding and profile settings—such as **Bio, Location, Professional Headline, LinkedIn, and GitHub profiles**—are saved directly into this table under a secure JSONB column named `raw_user_meta_data`. 

When a user updates their profile in `ProfileSettings.tsx`, it triggers `supabase.auth.updateUser()`, which packs this data into `raw_user_meta_data`. 

**Pros:** No extra tables to manage; tightly coupled with the user session.
**Cons:** Because it's in the secure `auth` schema, other users cannot easily query this data (e.g., if you want a public "Community Profile" page, it's very difficult to expose this securely). 

> [!TIP]
> **Recommendation:** If you plan on letting users view each other's profiles in the future, we should migrate this data into a `public.profiles` table. Let me know if you want me to set that up!

---

## 2. Device Management (`public.user_devices`)
**Type:** Public Schema Table
**Purpose:** Tracks and authorizes the physical devices or browsers a user logs in from. Powers the "Security & Devices" tab.

### Key Columns
- `user_uuid`: Links to `auth.users(id)`.
- `device_fingerprint`: A unique hash identifying the hardware/browser.
- `device_name`: Human-readable name (e.g., "MacBook Pro - Chrome").
- `status`: Enum (`PENDING`, `APPROVED`, `DENIED`). Determines if the device is allowed to access sensitive infrastructure.
- `is_main_device`: Boolean flagging the primary trusted device.

### Uses
When a user logs in from an unrecognized device, an entry is created here as `PENDING`. They cannot perform critical actions until they approve the new device from their `is_main_device` (or via email).

---

## 3. Granular Access Control (`public.team_access_control`)
**Type:** Public Schema Table
**Purpose:** Manages permissions for teammates invited to a project or infrastructure stack.

### Key Columns
- `owner_id`: The UID of the user who owns the resources.
- `user_id`: The UID of the invited teammate.
- `permissions`: A `JSONB` object storing granular toggles.
  - Example: `{"global": {"canAccessHosting": true, "canAccessGithub": false}}`

### Uses
Powers the "Administration" tab where you can invite users and restrict their access to specific features (e.g., allowing them to view databases but not modify GitHub repos).

---

## 4. Repository Control Plane (`public.servx_repositories`)
**Type:** Public Schema Table
**Purpose:** Manages the integration between ServX and a user's GitHub repositories for automated deployments, scanning, and anomaly detection.

### Key Columns
- `user_uuid`: Links to `auth.users(id)`.
- `github_repo_full_name`: E.g., "chitkul/servx-core".
- `servx_pin`: A secure unique PIN generated for verifying CLI connectivity.
- `encrypted_github_token`: Stores the securely encrypted OAuth token scoped *only* to this repository.
- `verification_status`: State machine enum (`PENDING`, `AUTH_OK`, `ENV_OK`, `VERIFIED`). Ensures the repo connection is completely validated before allowing operations.
- `is_maintenance`: A Master Kill Switch boolean that locks the repository down during suspected attacks.

### Uses
Powers the "GitHub" and "Auto-Medic Pipeline" tabs. It guarantees that operations run strictly against verified repositories and handles emergency lockdowns.

---

> [!IMPORTANT] 
> **Are User Details Saving Properly?**
> Yes! Based on the codebase inspection, the user details (Bio, Headline, Location, LinkedIn, GitHub) are successfully saving to `auth.users.raw_user_meta_data`. However, as mentioned above, if you ever need this data to be publicly searchable or viewable by *other* users, we will need to create a `public.profiles` table.
