const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const { searchUsers } = require('./src/domains/users/service');

async function test() {
    console.log('Testing search for "player"...');
    try {
        const results = await searchUsers('player');
        console.log('Results:', JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
