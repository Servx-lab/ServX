import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://bxmnuzqujamyuvsomfdj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.warn('Supabase Service Role Key is missing. Supabase token verification will fail.');
}

let supabaseAdmin: any = null;

if (supabaseUrl && supabaseServiceKey) {
    try {
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        console.log('✅ Supabase');
    } catch (err: any) {
        console.error('[Supabase] Failed to initialize admin client:', err.message);
    }
} else {
    console.error('[Supabase] Cannot initialize client: SUPABASE_SERVICE_ROLE_KEY is missing in environment.');
}

export { supabaseAdmin };
