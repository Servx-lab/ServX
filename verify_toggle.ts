import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// 1. Load apps/api/.env manually
const envPath = 'apps/api/.env';
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let val = parts.slice(1).join('=').trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            process.env[key] = val;
        }
    });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('ERROR: Missing Supabase credentials in .env file!');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const pin = 'svx_test_pin_123';
    const arg = process.argv[2];
    let targetState: boolean;

    if (arg === 'true' || arg === 'on') {
        targetState = true;
    } else if (arg === 'false' || arg === 'off') {
        targetState = false;
    } else {
        const { data, error } = await supabaseAdmin
            .from('servx_repositories')
            .select('is_maintenance')
            .eq('servx_pin', pin)
            .single();

        if (error) {
            console.error('ERROR fetching repository status:', error.message);
            process.exit(1);
        }
        
        targetState = !data.is_maintenance;
    }

    console.log(`Setting is_maintenance to: ${targetState}`);

    const { error: updateError } = await supabaseAdmin
        .from('servx_repositories')
        .update({ is_maintenance: targetState, updated_at: new Date().toISOString() })
        .eq('servx_pin', pin);

    if (updateError) {
        console.error('ERROR updating repository:', updateError.message);
        process.exit(1);
    }

    console.log(`SUCCESS: is_maintenance successfully updated to ${targetState} in Supabase.`);
}

main();
