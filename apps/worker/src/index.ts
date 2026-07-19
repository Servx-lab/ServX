import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const mongoUri = process.env.MONGODB_URI;
const encryptionKey = process.env.ENCRYPTION_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!mongoUri) {
  console.error('Missing MONGODB_URI in environment');
}
if (!encryptionKey) {
  console.error('Missing ENCRYPTION_KEY in environment');
}

async function verifyScannerBinaries(): Promise<void> {
  const scanners = ['nuclei', 'gitleaks', 'trivy', 'semgrep', 'syft', 'node'];
  console.log('🔍 Verifying scanner binary availability...');
  
  const checks = await Promise.all(scanners.map(async (scanner) => {
    try {
      await new Promise<boolean>((resolve, reject) => {
        const child = spawn('which', [scanner], { stdio: ['ignore', 'pipe', 'pipe'] });
        let found = false;
        child.stdout?.on('data', () => { found = true; });
        child.on('close', (code) => { resolve(found && code === 0); });
        child.on('error', () => { resolve(false); });
      });
      return { scanner, installed: true };
    } catch {
      return { scanner, installed: false };
    }
  }));

  const installed = checks.filter(c => c.installed).map(c => c.scanner);
  const missing = checks.filter(c => !c.installed).map(c => c.scanner);
  
  console.log(`   Installed: ${installed.join(', ') || 'none'}`);
  if (missing.length) {
    console.warn(`   Missing: ${missing.join(', ')}`);
    console.warn('   Note: Missing scanners will be reported as "skipped" in scan jobs');
  } else {
    console.log('   All security scanners are available');
  }
}

import { generateExpertCache } from './jobs/generateExpertCache.js';
import { seedCache } from './jobs/seedCache.js';
import { runAttackPathsJobV1 } from './jobs/attackPaths/attackPathsJobRunner.js';
import mongoose from 'mongoose';

declare const process: any;

async function connectWorkerDb() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required for worker execution');
  }

  await mongoose.connect(mongoUri);
}

async function main() {
  console.log('🚀 Worker process started');
  
  await verifyScannerBinaries();

  try {
    // Backward-compatible: default behavior remains expert cache jobs.
    // To test Phase-2 skeleton without introducing queue wiring yet,
    // set ATTACK_PATHS_WORKER=true and provide a dummy job.
    const attackWorkerEnabled = process.env.ATTACK_PATHS_WORKER === 'true';

    if (attackWorkerEnabled) {
      await connectWorkerDb();
      console.log('--- Phase-A: Attack Paths Worker (polling) ---');
      await runAttackPathsJobV1();
      return;
    }

    console.log('--- Step 1: Generating Expert Cache ---');
    await generateExpertCache();

    console.log('\n--- Step 2: Seeding Cache ---');
    await seedCache();

    console.log('\n✅ All worker jobs completed successfully');
  } catch (error) {
    console.error('❌ Worker job failed:', error);
    process.exit(1);
  }
}

main();
