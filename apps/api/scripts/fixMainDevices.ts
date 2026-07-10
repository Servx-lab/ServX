import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function fixMainDevices() {
  console.log('Starting migration to fix missing main devices...');

  try {
    // 1. Get all unique users who have devices
    const { data: allDevices, error: fetchErr } = await supabaseAdmin
      .from('user_devices')
      .select('id, user_uuid, is_main_device, created_at, last_login')
      .order('last_login', { ascending: true });

    if (fetchErr) throw fetchErr;

    console.log(`Found ${allDevices?.length || 0} total devices in database.`);
    console.log(allDevices);

    // Group by user
    for (const d of allDevices) {
      console.log(`Resetting device ${d.id}...`);
      const { error } = await supabaseAdmin
        .from('user_devices')
        .update({ is_main_device: false, status: 'PENDING_SETUP' })
        .eq('id', d.id);
      if (error) console.error("Error updating:", error);
    }
    
    console.log(`\nMigration complete! Reset all devices.`);
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

fixMainDevices();
