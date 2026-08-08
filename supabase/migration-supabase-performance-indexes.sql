-- migration-supabase-performance-indexes.sql
-- Adds missing indexes identified during the codebase performance analysis.
-- These indexes target the exact filter/order patterns used by the API
-- (apps/api/src/domains/exposure/service.ts, connections/service.ts,
-- operations/controller.ts) and are safe to run multiple times.

-- ─── exposure_findings ──────────────────────────────────────────────────────
-- getFindings() filters by user_id + resolved (+ optional category/severity)
-- and orders by severity, created_at desc.
CREATE INDEX IF NOT EXISTS idx_exposure_findings_user_resolved_created
    ON public.exposure_findings (user_id, resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exposure_findings_user_resolved_category
    ON public.exposure_findings (user_id, resolved, category, created_at DESC);

-- ─── exposure_assets ────────────────────────────────────────────────────────
-- getAssets() filters by user_id and orders by created_at desc.
CREATE INDEX IF NOT EXISTS idx_exposure_assets_user_created
    ON public.exposure_assets (user_id, created_at DESC);

-- ─── monitored_assets ───────────────────────────────────────────────────────
-- Assets are commonly filtered by status (active/inactive/decommissioned).
CREATE INDEX IF NOT EXISTS idx_monitored_assets_user_status
    ON public.monitored_assets (user_id, status);

-- ─── vulnerabilities ────────────────────────────────────────────────────────
-- Common query pattern: open (non-mitigated) vulnerabilities for an asset.
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_asset_mitigated
    ON public.vulnerabilities (asset_id, is_mitigated);

-- ─── auto_medic_incidents ───────────────────────────────────────────────────
-- Common join pattern: incidents for a given vulnerability filtered by status.
CREATE INDEX IF NOT EXISTS idx_auto_medic_incidents_vulnerability_status
    ON public.auto_medic_incidents (vulnerability_id, status);

-- ─── hosting_vault / db_vault / incidents ───────────────────────────────────
-- These tables are managed outside of the tracked migration files (created
-- directly in Supabase Studio), so we guard index creation with an existence
-- check to keep this migration safe to run in any environment.
DO $$ BEGIN
  IF to_regclass('public.hosting_vault') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_hosting_vault_user_provider
        ON public.hosting_vault (user_id, provider);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.db_vault') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_db_vault_user_provider
        ON public.db_vault (user_id, provider);
  END IF;
END $$;

-- getLatestIncident / syncDeploymentIncidents filter by user_id + method +
-- connection_id and order by timestamp desc.
DO $$ BEGIN
  IF to_regclass('public.incidents') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_incidents_user_method_connection_timestamp
        ON public.incidents (user_id, method, connection_id, timestamp DESC);
  END IF;
END $$;
