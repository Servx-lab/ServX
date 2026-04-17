import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://bxmnuzqujamyuvsomfdj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.warn('Supabase Service Role Key is missing. Supabase token verification will fail.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
