# Repository Control Plane - Phase 1 Details

## Objective
Establish the core data structure to allow ServX users to bind specific GitHub repositories to a global maintenance toggle ("Kill Switch"). This binding operates securely on the backend while allowing a completely public SDK running on client browsers to instantly cut off access.

## RLS & Architecture Decisions
### 1. `servx_repositories`
This table bridges the authenticated `user_uuid` with external GitHub Repositories.
By adding `UNIQUE(user_uuid, github_repo_id)`, we prevent split states where a repository could accidentally be assigned two different PINs. 

### 2. Isolation (Row Level Security)
Since the ServX dashboard operates dynamically, users must only fetch their own active Kill Switches.
```sql
CREATE POLICY "Users can view their own repositories"
ON public.servx_repositories FOR SELECT USING (auth.uid() = user_uuid);
```
No frontend API key logic is required because Supabase handles the `auth.uid()` evaluation transparently based on the user's JWT.

### 3. Symmetric Encryption Strategy
To manage the repo without prompting the user for an OAuth grant every time they toggle maintenance, we store the GitHub token. To satisfy enterprise compliance:
- **Never store tokens in plaintext.**
- Use `crypto.createCipheriv` in Node.js (Phase 2).
- The `iv` and `encrypted_payload` are persisted to `github_token_iv` and `encrypted_github_token` respectively.
- The `ENCRYPTION_KEY` lives strictly in the `.env` of the server.
