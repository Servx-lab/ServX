const { JWT } = require('google-auth-library');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const keyFromEnv = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

async function test(label, key) {
  process.stdout.write(`Testing [${label}]... `);
  try {
    const auth = new JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    await auth.authorize();
    process.stdout.write("AUTHORIZED!\n");
    return true;
  } catch (e) {
    process.stdout.write(`FAILED: ${e.message}\n`);
    return false;
  }
}

async function runTests() {
  console.log('Original key from env (JSON):', JSON.stringify(keyFromEnv));
  
  // Variation 1: As is from env (already potentially parsed by dotenv)
  await test("As is from Env", keyFromEnv);

  // Variation 2: Replace manual literal \n (in case dotenv didn't)
  await test("Manual \\n replace", keyFromEnv.replace(/\\n/g, '\n'));

  // Variation 3: Ensure double-newlines are not triple
  await test("Clean up newlines", keyFromEnv.replace(/\\n/g, '\n').replace(/\n\n+/g, '\n'));
  
  // Variation 4: Try without the quotes (in case dotenv kept them)
  if (keyFromEnv.startsWith('"') && keyFromEnv.endsWith('"')) {
    const unquoted = keyFromEnv.slice(1, -1);
    await test("Unquoted + replace", unquoted.replace(/\\n/g, '\n'));
  }
}

runTests();
