const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { logNewUserToSheet } = require('../services/sheetsService');

async function testSingle() {
  console.log('Testing logNewUserToSheet...');
  try {
    await logNewUserToSheet({
      uid: 'test-sync-uid-' + Date.now(),
      email: 'test-sync@example.com',
      role: 'tester'
    });
    console.log('SUCCESS!');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testSingle();
