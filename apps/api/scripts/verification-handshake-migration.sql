-- ====================================================================
-- migration: 3-step E2E verification handshake state machine schema
-- table: servx_repositories
-- ====================================================================

-- 1. ADD COLUMNS
-- Adds 'verification_status' and 'framework_meta' columns with fallback defaults
ALTER TABLE servx_repositories 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
ADD COLUMN IF NOT EXISTS framework_meta JSONB DEFAULT '{}'::jsonb NOT NULL;

-- 2. ADD CHECK CONSTRAINT
-- Enforces valid states for the verification state machine:
-- - PENDING: Initial state upon PIN generation
-- - AUTH_OK: Authenticated successfully by the CLI ping test
-- - META_OK: Environment scanned and framework info synced
-- - VERIFIED: Live persistent connection handshake verified
ALTER TABLE servx_repositories
DROP CONSTRAINT IF EXISTS check_verification_status;

ALTER TABLE servx_repositories
ADD CONSTRAINT check_verification_status 
CHECK (verification_status IN ('PENDING', 'AUTH_OK', 'META_OK', 'VERIFIED'));

-- 3. MIGRATE EXISTING PRODUCTION RECORDS
-- Set existing active records to 'VERIFIED' to prevent service interruption
UPDATE servx_repositories
SET verification_status = 'VERIFIED'
WHERE verification_status = 'PENDING';

-- 4. AUTO-PRUNING CRON SERVICE FOR STALE PENDING DATA
-- Cleans up abandoned configurations older than 1 hour automatically
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION cleanup_stale_pending_repositories()
RETURNS void AS $$
BEGIN
  DELETE FROM servx_repositories
  WHERE verification_status IN ('PENDING', 'AUTH_OK', 'META_OK')
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron job to run every hour
SELECT cron.schedule(
  'cleanup-stale-pending-repos-job', -- job name
  '0 * * * *',                       -- cron syntax: every hour
  'SELECT cleanup_stale_pending_repositories();'
);
