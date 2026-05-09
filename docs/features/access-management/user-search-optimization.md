# User Search & Discovery Optimization

This document explains the logic and architecture of the high-performance user discovery system in ServX.

## 1. Overview
The User Discovery system is designed to allow administrators to find and invite any user within the Supabase ecosystem, even if the user has not yet initialized a public profile record.

## 2. The Hybrid Search Model
To ensure 100% coverage, the system uses a **Parallel Hybrid Search** approach:

### Source A: Public Profiles (PostgreSQL)
- **Target**: `public.user_profiles` table.
- **Method**: Case-insensitive `ILIKE` search with wildcards (`%query%`).
- **Optimization**: Recommended use of `pg_trgm` GIN indexes on `email` and `display_name` columns to prevent full table scans.

### Source B: Authentication Admin (Supabase Auth)
- **Target**: `auth.users` schema (via `supabaseAdmin.auth.admin.listUsers()`).
- **Role**: Serves as a fallback/complement for new users who haven't completed their first-time synchronization.
- **Logic**: Fetches the master user list and performs a fuzzy filter across multiple metadata fields:
    - `email`
    - `user_metadata.full_name`
    - `user_metadata.name`
    - `user_metadata.display_name`

## 3. Data Flow & Deduplication
1.  **Request**: Frontend sends query string (min 3 characters).
2.  **Parallel Execution**: Both Source A and Source B are queried.
3.  **Deduplication**: Results are merged into a `Map<string, UserSearchHit>` using the `UID` as the key. This ensures that if a user appears in both the public table and the auth list, they only show up once in the UI.
4.  **Final Payload**: The unique list is converted to an array, limited to the top 100 results, and returned to the frontend.

## 4. Frontend UX Logic
- **Debouncing**: A 320ms debounce prevents "API hammering" while the user is still typing.
- **Minimum Threshold**: Search only triggers after **3 characters** to maintain database performance and reduce irrelevant results.
- **State Feedback**: 
    - **Loading**: A custom CSS spinner shows active database communication.
    - **Empty State**: An explicit "No users found" message appears if both search sources return zero matches.
    - **Visibility**: The dropdown remains open during loading and empty states to provide constant feedback to the admin.

## 5. Performance Recommendations
For production environments with >10,000 users, the following SQL must be applied to the Supabase database:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_trgm ON user_profiles USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_profiles_name_trgm ON user_profiles USING gin (display_name gin_trgm_ops);
```
