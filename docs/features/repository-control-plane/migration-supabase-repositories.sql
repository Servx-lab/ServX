-- Create servx_repositories table
CREATE TABLE IF NOT EXISTS public.servx_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    github_repo_id TEXT NOT NULL,
    github_repo_full_name TEXT NOT NULL,
    servx_pin TEXT NOT NULL UNIQUE,
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    
    -- Encrypted GitHub token strictly bound to this repository
    encrypted_github_token TEXT,
    github_token_iv TEXT,
    github_token_auth_tag TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure a repo isn't registered multiple times by the same user
    UNIQUE(user_uuid, github_repo_id)
);

-- Enable RLS
ALTER TABLE public.servx_repositories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only select their own repositories
CREATE POLICY "Users can view their own repositories"
ON public.servx_repositories
FOR SELECT
USING (auth.uid() = user_uuid);

-- Policy: Users can only insert their own repositories
CREATE POLICY "Users can insert their own repositories"
ON public.servx_repositories
FOR INSERT
WITH CHECK (auth.uid() = user_uuid);

-- Policy: Users can only update their own repositories
CREATE POLICY "Users can update their own repositories"
ON public.servx_repositories
FOR UPDATE
USING (auth.uid() = user_uuid)
WITH CHECK (auth.uid() = user_uuid);

-- Policy: Users can only delete their own repositories
CREATE POLICY "Users can delete their own repositories"
ON public.servx_repositories
FOR DELETE
USING (auth.uid() = user_uuid);
