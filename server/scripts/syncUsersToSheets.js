const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { batchLogUsersToSheet } = require('../services/sheetsService');

async function syncUsers() {
  console.log('[Sync] Starting user synchronization to Google Sheets...');

  try {
    // 1. Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Sync] Connected to MongoDB');

    // 2. Fetch all users
    const users = await User.find({}).lean();
    console.log(`[Sync] Found ${users.length} users in database`);

    if (users.length === 0) {
      console.log('[Sync] No users to export.');
    } else {
      // 3. Export to Google Sheets
      await batchLogUsersToSheet(users);
      console.log('[Sync] Synchronization successful!');
    }

  } catch (error) {
    console.error('[Sync] Error during synchronization:', error.message);
  } finally {
    // 4. Close MongoDB connection
    await mongoose.connection.close();
    console.log('[Sync] Database connection closed.');
    process.exit(0);
  }
}

syncUsers();
