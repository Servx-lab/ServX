const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 5000;

const app = createApp();

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    // Silence MongoDB logs 
    // console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function connectRedis() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('Redis URL not found in environment, skipping Redis log.');
    return;
  }

  try {
    const { getRedisClient } = require('./src/core/services/redisCache');
    const client = await getRedisClient();
    if (client) {
      console.log('✅ Redis');
    }
  } catch (error) {
    console.error(`Redis Connection Error: ${error.message}`);
  }
}

Promise.all([connectDB(), connectRedis()]).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});

process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
});
