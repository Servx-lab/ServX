# Bridge (GitHub linking)

**Route:** `/bridge`  
**File:** `apps/web/src/features/auth/Bridge.tsx`  
**Guard:** `<RequireAuth requireGitHub={false}>`

Dedicated screen to **link GitHub** when the rest of the app expects a connected GitHub account. Shows Firebase user avatar (via **`ProfilePhoto`**) and a CTA to start GitHub OAuth. Uses **`useAuth().linkGitHub()`** which hits the API’s GitHub OAuth URL flow.

## Why a separate route

Users can be authenticated with Google (or others) but not yet authorized for GitHub-backed features; `/bridge` avoids blocking basic auth while still funneling power users through GitHub connection.
