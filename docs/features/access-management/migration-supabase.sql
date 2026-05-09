-- Create the team_access_control table in Supabase
-- This table stores granular permissions for team members, linked to the resource owner.

CREATE TABLE IF NOT EXISTS public.team_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL, -- The resource owner (UID from Supabase Auth)
    user_id TEXT NOT NULL,  -- The team member (UID from Supabase Auth)
    permissions JSONB NOT NULL DEFAULT '{
        "global": {
            "canAccessHosting": false,
            "canAccessGithub": false,
            "canAccessDatabases": false
        },
        "granularAllow": null
    }',
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one record per owner/user pair
    UNIQUE(owner_id, user_id)
);

-- Enable RLS (Row Level Security) if needed, but for now we rely on the Admin service
-- ALTER TABLE public.team_access_control ENABLE ROW LEVEL SECURITY;
