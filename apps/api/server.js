const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 5000;



// Safety nets for silent crashes
process.on('uncaughtException', (err) => {
  console.error('❌ FATAL: Uncaught Exception');
  console.error(err.stack || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ FATAL: Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

async function startServer() {
  try {
    console.log('🎬 Starting server boot...');
    const app = createApp();
    console.log('🚀 App created successfully');

    const host = '0.0.0.0';
    console.log(`📡 Attempting to listen on ${host}:${PORT}...`);
    
    app.listen(PORT, host, async () => {
      console.log(`✅ Server is LIVE at http://${host}:${PORT}`);
      console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);

      // Connections (established in the background after port binding is successful)
      try {
        await connectDB();
      } catch (err) {
        console.error('❌ MongoDB Connection failed during async boot:', err.stack || err);
      }

      try {
        await connectRedis();
      } catch (err) {
        console.error('❌ Redis Connection failed during async boot:', err.stack || err);
      }

      try {
        const { startAttackPathsRecovery } = require('./src/workers/attackPathsRecovery');
        startAttackPathsRecovery();
      } catch (err) {
        console.error('❌ Failed to boot Attack Paths recovery worker:', err.message);
      }
    });

  } catch (err) {
    console.error('❌ CRITICAL: Server failed to start');
    console.error(err.stack || err);
    process.exit(1);
  }
}

async function connectDB() {
  console.log('📡 Connecting to MongoDB...');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment');
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
  console.log('✅ MongoDB connected');
}

async function connectRedis() {
  console.log('📡 Connecting to Redis...');
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️ No Redis URL, skipping...');
    return;
  }

  const { getRedisClient } = require('./src/core/services/redisCache');
  const client = await getRedisClient();
  if (client) {
    console.log('✅ Redis connected');
    
    // Boot the DEFCON real-time state synchronization listener
    try {
      const { initDefconService } = require('./src/domains/operations/defconService');
      await initDefconService();
    } catch (err) {
      console.error('❌ Failed to boot DEFCON service:', err.message);
    }

    // Boot the background incident reconciliation poller
    try {
      const { startIncidentPoller } = require('./src/workers/incidentPoller');
      startIncidentPoller();
    } catch (err) {
      console.error('❌ Failed to boot incident poller:', err.message);
    }
  }
}

// Execute boot
startServer();
