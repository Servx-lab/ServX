import { supabaseAdmin } from '../src/utils/supabase';

async function checkSchema() {
  const { data, error } = await supabaseAdmin.from('hosting_vault').select('*').limit(1);
  console.log('Error:', error);
  console.log('Sample Data:', data);
}

checkSchema();
