import { decrypt } from '../../../packages/crypto/index';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const userId = 'fb455b85-e3c7-41db-83ae-acc06656d633';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('--- Verifying Encryption for User:', userId, '---');

  const { data: hostingData, error: hostingError } = await supabase
    .from('hosting_vault')
    .select('*')
    .eq('user_id', userId);

  if (hostingError) {
    console.error('Error fetching hosting vault:', hostingError);
    return;
  }

  console.log(`Found ${hostingData?.length || 0} hosting connections.\n`);

  hostingData?.forEach((conn) => {
    console.log(`Connection: ${conn.name} (${conn.provider})`);
    console.log(`Encrypted Content: ${conn.encrypted_config.substring(0, 20)}...`);
    console.log(`IV: ${conn.iv}`);

    try {
      const decrypted = decrypt({ iv: conn.iv, content: conn.encrypted_config });
      const parsed = JSON.parse(decrypted);
      console.log('Decrypted Content (Keys Masked):');
      const masked = { ...parsed };
      if (masked.token) masked.token = '********' + masked.token.substring(masked.token.length - 4);
      if (masked.apiKey) masked.apiKey = '********' + masked.apiKey.substring(masked.apiKey.length - 4);
      console.log(JSON.stringify(masked, null, 2));
      console.log('✅ Decryption Successful\n');
    } catch (err: any) {
      console.error('❌ Decryption Failed:', err.message, '\n');
    }
  });

  const { data: dbData, error: dbError } = await supabase
    .from('db_vault')
    .select('*')
    .eq('user_id', userId);

  if (dbError) {
    console.error('Error fetching db vault:', dbError);
    return;
  }

  console.log(`Found ${dbData?.length || 0} database connections.\n`);

  dbData?.forEach((conn) => {
    console.log(`Connection: ${conn.name} (${conn.provider})`);
    try {
      const decrypted = decrypt({ iv: conn.iv, content: conn.encrypted_config });
      console.log('Decrypted Config:', decrypted);
      console.log('✅ Decryption Successful\n');
    } catch (err: any) {
      console.error('❌ Decryption Failed:', err.message, '\n');
    }
  });
}

verify();
