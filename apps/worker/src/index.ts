import { generateExpertCache } from './jobs/generateExpertCache.js';
import { seedCache } from './jobs/seedCache.js';
import { runAttackPathsJobV1 } from './jobs/attackPaths/attackPathsJobRunner.js';

declare const process: any;

async function main() {
  console.log('🚀 Worker process started');

  try {
    // Backward-compatible: default behavior remains expert cache jobs.
    // To test Phase-2 skeleton without introducing queue wiring yet,
    // set ATTACK_PATHS_WORKER=true and provide a dummy job.
    const attackWorkerEnabled = process.env.ATTACK_PATHS_WORKER === 'true';

    if (attackWorkerEnabled) {
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
