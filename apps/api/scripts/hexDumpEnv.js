const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const buffer = fs.readFileSync(envPath);

console.log('File size:', buffer.length);
console.log('Hex dump around private key:');

const search = Buffer.from('GOOGLE_SHEETS_PRIVATE_KEY=');
const index = buffer.indexOf(search);

if (index === -1) {
  console.log('Key NOT found!');
  process.exit(1);
}

const start = Math.max(0, index);
const end = Math.min(buffer.length, index + 200);
const slice = buffer.slice(start, end);

console.log(slice.toString('hex').match(/.{1,32}/g).join('\n'));
console.log('Plaintext slice:');
console.log(slice.toString());
