const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
if (!key) {
  console.log('Key NOT defined!');
  process.exit(1);
}

console.log('Key length:', key.length);
console.log('Key (JSON stringified):');
console.log(JSON.stringify(key));

const formatted = key.replace(/\\n/g, '\n');
console.log('Formatted length:', formatted.length);
console.log('Formatted (JSON stringified):');
console.log(JSON.stringify(formatted));
