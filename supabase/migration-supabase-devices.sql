-- Create device status ENUM
CREATE TYPE public.device_status_type AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- Create user_devices table
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT NOT NULL,
    is_main_device BOOLEAN NOT NULL DEFAULT false,
    status public.device_status_type NOT NULL DEFAULT 'PENDING',
    last_ip TEXT,
    last_login TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure device fingerprint is unique per user
    UNIQUE(user_uuid, device_fingerprint)
);

-- Indexing for quick lookups on fingerprints and user associations
CREATE INDEX IF NOT EXISTS idx_user_devices_user_fingerprint ON public.user_devices (user_uuid, device_fingerprint);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own devices
CREATE POLICY "Users can view their own devices"
ON public.user_devices
FOR SELECT
USING (auth.uid() = user_uuid);

-- Policy: Users can insert their own devices
CREATE POLICY "Users can insert their own devices"
ON public.user_devices
FOR INSERT
WITH CHECK (auth.uid() = user_uuid);

-- Policy: Users can update their own devices (e.g. rename, revoke, approve)
CREATE POLICY "Users can update their own devices"
ON public.user_devices
FOR UPDATE
USING (auth.uid() = user_uuid)
WITH CHECK (auth.uid() = user_uuid);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_timestamp
    BEFORE UPDATE ON public.user_devices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
