const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const keyFromEnv = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

function test(label, key) {
  console.log(`--- Testing [${label}] ---`);
  try {
    const pkey = crypto.createPrivateKey(key);
    console.log('SUCCESS: Key parsed correctly!');
    console.log('Type:', pkey.type);
    console.log('Asymm Type:', pkey.asymmetricKeyType);
  } catch (e) {
    console.error('FAILED:', e.message);
    if (e.stack) console.error(e.stack);
  }
}

const formatted = keyFromEnv.replace(/\\n/g, '\n');
test("Formatted from Env", formatted);

// Try removing all newlines except header/footer
const header = "-----BEGIN PRIVATE KEY-----";
const footer = "-----END PRIVATE KEY-----";
let body = formatted.replace(header, '').replace(footer, '').replace(/\s+/g, '');
const oneLineBody = `${header}\n${body}\n${footer}`;
test("One Line Body", oneLineBody);

// Try manual PKCS#8 formatting (64 chars per line)
let pkcs8 = `${header}\n`;
for (let i = 0; i < body.length; i += 64) {
  pkcs8 += body.substring(i, i + 64) + '\n';
}
pkcs8 += footer + '\n';
test("Manual PKCS#8 Formatting", pkcs8);
