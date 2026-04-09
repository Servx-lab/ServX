const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

let keyLine = lines.find(l => l.startsWith('GOOGLE_SHEETS_PRIVATE_KEY='));
if (!keyLine) {
  console.log('Key line NOT found!');
  process.exit(1);
}

let val = keyLine.substring('GOOGLE_SHEETS_PRIVATE_KEY='.length).trim();
console.log('Raw value in line:', val.substring(0, 50) + '...');
console.log('Raw value length:', val.length);

if (val.startsWith('"') && val.endsWith('"')) {
  val = val.substring(1, val.length - 1);
}

console.log('Unquoted length:', val.length);
console.log('Unquoted (JSON stringified):', JSON.stringify(val));

const formatted = val.replace(/\\n/g, '\n');
console.log('Formatted length:', formatted.length);
console.log('Formatted (JSON stringified):', JSON.stringify(formatted));
