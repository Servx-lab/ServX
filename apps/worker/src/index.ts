import { generateExpertCache } from './jobs/generateExpertCache.js';
import { seedCache } from './jobs/seedCache.js';

async function main() {
  console.log('🚀 Worker process started');
  
  try {
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
