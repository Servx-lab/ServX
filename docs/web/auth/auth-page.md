# Auth Page (Sign-In & Provisioning)

**Route:** `/auth`  
**File:** `apps/web/src/features/auth/AuthPage.tsx` 

This route hosts the primary authentication UI, fully powered by the Supabase Auth client. Depending on environment configuration, it supports standard Email/Password provisioning as well as SSO providers (e.g., Google, GitHub).

Upon a successful credential exchange, the application intelligently routes the user to either the `/onboarding` pipeline or the main dashboard, dictating the initial user experience.
