import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bxmnuzqujamyuvsomfdj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error(
    'CRITICAL: VITE_SUPABASE_ANON_KEY is not defined. ' +
    'Please set this environment variable in your deployment platform (e.g., Vercel, Render).'
  );
}

// We use a fallback string to prevent the SDK from throwing an "is required" error during bundle initialization.
// This allows the app to at least load, even if Supabase-dependent features fail later.
export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'undefined_anon_key');
