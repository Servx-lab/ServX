-- Run this script in your Supabase SQL Editor to support multi-tenant Incident Records

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS connection_id UUID;

-- Optional: Create an index to speed up the FIFO pruning queries
CREATE INDEX IF NOT EXISTS idx_incidents_user_connection 
ON incidents(user_id, connection_id) 
WHERE method = 'DEPLOY';
