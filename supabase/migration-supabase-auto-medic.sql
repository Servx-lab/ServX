-- migration-supabase-auto-medic.sql
-- ServX Data Architecture: monitored_assets, vulnerabilities, auto_medic_incidents, runbooks (pgvector)
-- Tenant-scoped by user_id, consistent with exposure_assets/exposure_findings/hosting_vault conventions.

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.asset_status AS ENUM ('active', 'inactive', 'decommissioned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.vulnerability_severity AS ENUM ('CRITICAL', 'WARNING', 'INFO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.auto_medic_status AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 1. monitored_assets ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monitored_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,              -- e.g. "api-staging.servx.io"
    asset_type TEXT NOT NULL,              -- e.g. "domain", "ip_address", "s3_bucket"
    status TEXT NOT NULL DEFAULT 'active',  -- e.g. "active"
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitored_assets_user ON public.monitored_assets (user_id);

-- ─── 2. vulnerabilities ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.monitored_assets(id) ON DELETE CASCADE,
    severity TEXT NOT NULL,                -- e.g. "CRITICAL", "WARNING"
    issue_type TEXT NOT NULL,              -- e.g. "OPEN_PORT_5432", "MISSING_HSTS"
    is_mitigated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vulnerabilities_asset ON public.vulnerabilities (asset_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_mitigated ON public.vulnerabilities (is_mitigated);

-- ─── 3. auto_medic_incidents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auto_medic_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability_id UUID NOT NULL REFERENCES public.vulnerabilities(id) ON DELETE CASCADE,
    ai_action_plan JSONB DEFAULT '{}'::jsonb,  -- JSON object of what the AI decided to do
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS', -- "IN_PROGRESS", "RESOLVED", "FAILED"
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_medic_incidents_vulnerability ON public.auto_medic_incidents (vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_auto_medic_incidents_status ON public.auto_medic_incidents (status);

-- ─── 4. runbooks (pgvector RAG brain) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,                 -- markdown text of the runbook
    embedding VECTOR(1536),                -- OpenAI text-embedding-3-small dimension; adjust if using a different model
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ANN index for fast cosine-similarity search over runbooks
CREATE INDEX IF NOT EXISTS idx_runbooks_embedding ON public.runbooks
    USING hnsw (embedding vector_cosine_ops);

-- RPC used by Auto-Medic to do "vector math search" against runbooks
CREATE OR REPLACE FUNCTION public.match_runbooks(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        runbooks.id,
        runbooks.content,
        1 - (runbooks.embedding <=> query_embedding) AS similarity
    FROM public.runbooks
    WHERE 1 - (runbooks.embedding <=> query_embedding) > match_threshold
    ORDER BY runbooks.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ─── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.monitored_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_medic_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbooks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage their own monitored assets"
    ON public.monitored_assets FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- vulnerabilities inherit tenancy through their parent asset
DO $$ BEGIN
  CREATE POLICY "Users manage vulnerabilities on their own assets"
    ON public.vulnerabilities FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.monitored_assets a
        WHERE a.id = vulnerabilities.asset_id AND a.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.monitored_assets a
        WHERE a.id = vulnerabilities.asset_id AND a.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- auto_medic_incidents inherit tenancy through vulnerability -> asset
DO $$ BEGIN
  CREATE POLICY "Users manage their own auto-medic incidents"
    ON public.auto_medic_incidents FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.vulnerabilities v
        JOIN public.monitored_assets a ON a.id = v.asset_id
        WHERE v.id = auto_medic_incidents.vulnerability_id AND a.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.vulnerabilities v
        JOIN public.monitored_assets a ON a.id = v.asset_id
        WHERE v.id = auto_medic_incidents.vulnerability_id AND a.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- runbooks are shared/global RAG knowledge; readable by any authenticated user, writable only via service role
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read runbooks"
    ON public.runbooks FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── updated_at triggers (reuses public.handle_updated_at if already defined by other migrations) ─────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_monitored_assets_updated_at ON public.monitored_assets;
CREATE TRIGGER trigger_monitored_assets_updated_at
    BEFORE UPDATE ON public.monitored_assets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_vulnerabilities_updated_at ON public.vulnerabilities;
CREATE TRIGGER trigger_vulnerabilities_updated_at
    BEFORE UPDATE ON public.vulnerabilities
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_auto_medic_incidents_updated_at ON public.auto_medic_incidents;
CREATE TRIGGER trigger_auto_medic_incidents_updated_at
    BEFORE UPDATE ON public.auto_medic_incidents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_runbooks_updated_at ON public.runbooks;
CREATE TRIGGER trigger_runbooks_updated_at
    BEFORE UPDATE ON public.runbooks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Real-time: enable Supabase Realtime replication for live UI updates ───
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vulnerabilities;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_medic_incidents;
EXCEPTION WHEN duplicate_object THEN null; END $$;
