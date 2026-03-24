const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { JWT } = require('google-auth-library');

async function testAuth() {
  try {
    const auth = new JWT();
    const creds = require('../ServX.json');
    auth.fromJSON(creds);
    auth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    
    console.log('JWT object created via fromJSON. Attempting to authorize...');
    await auth.authorize();
    console.log('Authorized!');
  } catch (e) {
    console.error('Auth Error:', e.message);
    // if (e.stack) console.error(e.stack);
  }
}

testAuth();
