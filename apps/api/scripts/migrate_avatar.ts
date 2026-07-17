import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
  // Let's see if we can construct it from SUPABASE_URL if necessary, but actually in this project there's only SUPABASE_URL.
  console.log('No DATABASE_URL found. Please ask the user to run the SQL in Supabase dashboard.');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Connecting to database...');
  await client.connect();
  
  console.log('Running migration...');
  await client.query(`ALTER TABLE public.hosting_vault ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;`);
  
  console.log('Migration complete!');
  await client.end();
}

main().catch(console.error);
