-- These tables exist in production but were created by hand; this file lets a fresh/local database match.

-- ─── 0. Enum Extensions ───────────────────────────────────────────────────────
-- Add PENDING_SETUP value to device_status_type if not already present.
-- NOTE: In PostgreSQL, ALTER TYPE ... ADD VALUE cannot run inside an explicit multi-command transaction block.
ALTER TYPE public.device_status_type ADD VALUE IF NOT EXISTS 'PENDING_SETUP';

-- ─── 1. user_profiles ─────────────────────────────────────────────────────────
-- Primary profile store used by apps/api (auth/sync, admin, connections).
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ─── 2. github_vault ──────────────────────────────────────────────────────────
-- Stores GitHub tokens and metadata per user. user_id is the primary key.
CREATE TABLE IF NOT EXISTS public.github_vault (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    github_id TEXT,
    github_username TEXT,
    encrypted_access_token TEXT,
    encrypted_refresh_token TEXT,
    iv TEXT NOT NULL DEFAULT '',
    token_expiry TIMESTAMPTZ,
    installation_id TEXT,
    status TEXT NOT NULL DEFAULT 'connected',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_github_vault_user ON public.github_vault (user_id);
ALTER TABLE public.github_vault ENABLE ROW LEVEL SECURITY;

-- ─── 3. hosting_vault ─────────────────────────────────────────────────────────
-- Stores hosting provider credentials and connections (Vercel, Render, Railway, DigitalOcean, etc.).
CREATE TABLE IF NOT EXISTS public.hosting_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    alias TEXT,
    provider TEXT NOT NULL,
    encrypted_config TEXT NOT NULL,
    iv TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, provider, alias)
);

CREATE INDEX IF NOT EXISTS idx_hosting_vault_user_provider ON public.hosting_vault (user_id, provider);
ALTER TABLE public.hosting_vault ENABLE ROW LEVEL SECURITY;

-- ─── 4. db_vault ──────────────────────────────────────────────────────────────
-- Stores database connection configs (MongoDB, PostgreSQL, MySQL, Redis, etc.).
CREATE TABLE IF NOT EXISTS public.db_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    encrypted_config TEXT NOT NULL,
    iv TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'connected',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_db_vault_user_provider ON public.db_vault (user_id, provider);
ALTER TABLE public.db_vault ENABLE ROW LEVEL SECURITY;

-- ─── 5. incidents ─────────────────────────────────────────────────────────────
-- Auto-Medic deployment and runtime incident tracking.
-- Note: id is text (e.g. DEP-<connectionId>-<deploymentId>).
CREATE TABLE IF NOT EXISTS public.incidents (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    method TEXT NOT NULL,
    path TEXT,
    error_message TEXT,
    error_stack TEXT,
    error_code INTEGER,
    diagnosis TEXT,
    suggested_fix TEXT,
    severity TEXT NOT NULL DEFAULT 'critical',
    cached BOOLEAN NOT NULL DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.hosting_vault(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_user_method_connection_timestamp
    ON public.incidents (user_id, method, connection_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_user_connection 
    ON public.incidents (user_id, connection_id) 
    WHERE method = 'DEPLOY';
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- ─── 6. error_cache ───────────────────────────────────────────────────────────
-- Auto-Medic signature-based error cache to minimize LLM inference calls.
CREATE TABLE IF NOT EXISTS public.error_cache (
    signature TEXT PRIMARY KEY,
    original_error TEXT,
    diagnosis TEXT,
    suggested_fix TEXT,
    severity TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.error_cache ENABLE ROW LEVEL SECURITY;

-- ─── 7. project_groups ────────────────────────────────────────────────────────
-- Security perimeter asset groups.
CREATE TABLE IF NOT EXISTS public.project_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    assets JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_groups_user ON public.project_groups (user_id);
ALTER TABLE public.project_groups ENABLE ROW LEVEL SECURITY;
