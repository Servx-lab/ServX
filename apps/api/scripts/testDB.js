const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function test() {
  console.log('Starting test...');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');
    await mongoose.connection.close();
    console.log('Closed!');
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
