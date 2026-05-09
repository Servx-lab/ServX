const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const Admin = require('./models/Admin');
    const count = await Admin.countDocuments();
    console.log('Admin count:', count);
    const admins = await Admin.find();
    console.log('Admins:', JSON.stringify(admins, null, 2));
    await mongoose.disconnect();
}

check().catch(console.error);
