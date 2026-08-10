# Authentication Bridge (GitHub OAuth)

**Route:** `/bridge`  
**File:** `apps/web/src/features/auth/Bridge.tsx`  
**Guard:** `<RequireAuth requireGitHub={false}>`

The `/bridge` route is a dedicated, protected screen designed to enforce mandatory GitHub OAuth linkage. When a user navigates to a feature that requires codebase access, but they have not yet linked a GitHub account, the `<RequireAuth>` guard forcefully routes them here.

The UI displays the user's current Supabase avatar and a prominent CTA to initiate the OAuth flow, leveraging the **`useAuth().linkGitHub()`** method to hit the API's GitHub OAuth URL generator.

## Architectural Rationale

Users frequently provision accounts via enterprise SSO or Google, which grants them platform access but no codebase authorization. The `/bridge` route elegantly prevents basic auth blockage while seamlessly funneling power users through the required GitHub connection flow.
