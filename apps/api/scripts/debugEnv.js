const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
console.log('Env Path:', envPath);
console.log('File Exists:', fs.existsSync(envPath));

const envConfig = dotenv.config({ path: envPath });
if (envConfig.error) {
  console.error('Dotenv Error:', envConfig.error);
}

const vars = ['MONGODB_URI', 'SPREADSHEET_ID', 'GOOGLE_SHEETS_CLIENT_EMAIL', 'GOOGLE_SHEETS_PRIVATE_KEY'];

vars.forEach(v => {
  const val = process.env[v];
  if (val) {
    console.log(`${v} length: ${val.length}`);
    console.log(`${v} starts with: ${val.substring(0, 30)}`);
  } else {
    console.log(`${v}: NOT RED`);
  }
});
