const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 5000;

console.log('🎬 Starting server boot...');
const app = createApp();
console.log('🚀 App created successfully');

async function connectDB() {
  console.log('📡 Connecting to MongoDB...');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
}

async function connectRedis() {
  console.log('📡 Connecting to Redis...');
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️ No Redis URL, skipping...');
    return;
  }

  try {
    const { getRedisClient } = require('./src/core/services/redisCache');
    const client = await getRedisClient();
    if (client) {
      console.log('✅ Redis connected');
    }
  } catch (error) {
    console.error(`❌ Redis Error: ${error.message}`);
  }
}

// Start connections
connectDB();
connectRedis();

console.log(`📡 Attempting to listen on port ${PORT}...`);
app.listen(PORT, () => {
  console.log(`✅ Server is LIVE on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});
