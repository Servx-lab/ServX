-- migration-supabase-exposure.sql
-- Exposure Analysis: perimeter assets and findings (tenant-scoped by user_id).

-- ─── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.exposure_asset_type AS ENUM ('DOMAIN', 'SUBDOMAIN', 'IP', 'BUCKET');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.exposure_severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.exposure_category AS ENUM ('network', 'cloud_storage', 'dns', 'iam', 'web_headers');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── exposure_assets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exposure_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_type public.exposure_asset_type NOT NULL,
    value TEXT NOT NULL,                 -- e.g. "api.company.com" or "203.0.113.10"
    source TEXT,                         -- 'dns', 'vercel', 'digitalocean', 'manual'
    parent_domain TEXT,                  -- root domain this asset was discovered under
    metadata JSONB DEFAULT '{}'::jsonb,  -- provider ids, record types, etc.
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(user_id, asset_type, value)
);

CREATE INDEX IF NOT EXISTS idx_exposure_assets_user ON public.exposure_assets (user_id);

-- ─── exposure_findings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exposure_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.exposure_assets(id) ON DELETE CASCADE,
    asset_value TEXT NOT NULL,           -- denormalized for fast feed rendering
    category public.exposure_category NOT NULL,
    severity public.exposure_severity NOT NULL,
    title TEXT NOT NULL,                 -- e.g. "Port 5432 (PostgreSQL) exposed to 0.0.0.0/0"
    description TEXT,
    remediation TEXT,                    -- suggested fix, feeds Auto-Medic handoff
    dedupe_key TEXT NOT NULL,            -- stable key so re-scans upsert instead of duplicate
    resolved BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_exposure_findings_user ON public.exposure_findings (user_id);
CREATE INDEX IF NOT EXISTS idx_exposure_findings_user_severity ON public.exposure_findings (user_id, severity);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.exposure_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exposure_findings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage their own exposure assets"
    ON public.exposure_assets FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage their own exposure findings"
    ON public.exposure_findings FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── updated_at trigger (reuses public.handle_updated_at if present) ───────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_exposure_assets_updated_at ON public.exposure_assets;
CREATE TRIGGER trigger_exposure_assets_updated_at
    BEFORE UPDATE ON public.exposure_assets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_exposure_findings_updated_at ON public.exposure_findings;
CREATE TRIGGER trigger_exposure_findings_updated_at
    BEFORE UPDATE ON public.exposure_findings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
