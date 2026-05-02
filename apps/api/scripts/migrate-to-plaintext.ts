import { decrypt } from '../../../packages/crypto/index';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateTable(tableName: string, configColumns: string[], idColumn: string = 'id') {
  console.log(`--- Migrating Table: ${tableName} ---`);

  const { data, error } = await supabase.from(tableName).select('*');

  if (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return;
  }

  console.log(`Found ${data?.length || 0} rows.`);

  for (const row of (data || [])) {
    if (!row.iv || row.iv === '') {
      console.log(`Skipping row ${row[idColumn]} (no IV or already migrated)`);
      continue;
    }

    const updates: Record<string, any> = { iv: '' }; // Use empty string instead of null to satisfy constraints
    let anyDecrypted = false;

    for (const col of configColumns) {
      if (row[col]) {
        try {
          const decrypted = decrypt({ iv: row.iv, content: row[col] });
          updates[col] = decrypted;
          anyDecrypted = true;
        } catch (err: any) {
          console.warn(`⚠️ Could not decrypt column ${col} in row ${row[idColumn]}:`, err.message);
        }
      }
    }

    if (anyDecrypted) {
      console.log(`Updating row ${row[idColumn]}...`);
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq(idColumn, row[idColumn]);

      if (updateError) {
        console.error(`Failed to update row ${row[idColumn]}:`, JSON.stringify(updateError, null, 2));
      } else {
        console.log(`✅ Row ${row[idColumn]} migrated.`);
      }
    }
  }
}

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY is required in .env');
    process.exit(1);
  }

  await migrateTable('hosting_vault', ['encrypted_config']);
  await migrateTable('db_vault', ['encrypted_config']);
  await migrateTable('github_vault', ['encrypted_access_token', 'encrypted_refresh_token'], 'user_id');
}

main().then(() => {
  console.log('Migration finished.');
  process.exit();
});
