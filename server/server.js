const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const User = require('./models/User');
const UserConnection = require('./models/UserConnection');
const authRoutes = require('./routes/authRoutes');
const githubRoutes = require('./routes/githubRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const databaseExplorerRoutes = require('./routes/databaseExplorerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const requireAuth = require('./middleware/requireAuth');
const autoMedicMiddleware = require('./middleware/autoMedicMiddleware');
const { encrypt } = require('./utils/encryption');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL, 
      'http://localhost:8080', 
      'http://localhost:8083', 
      'http://localhost:5173'
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      // If we want to be more permissive during development
      if (process.env.NODE_ENV !== 'production') {
         return callback(null, true);
      }
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/db', databaseExplorerRoutes);
app.use('/api/admin', adminRoutes);

// Database Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

// Routes

// Health Check
app.get('/', (req, res) => {
  res.send('API is running...');
});

// POST /api/connections - Save a new database connection securely
app.post('/api/connections', requireAuth, async (req, res) => {
  try {
    const { name, provider, config } = req.body;
    const ownerUid = req.user.uid; // Enforce ownerUid from verified token

    if (!name || !provider || !config) {
      return res.status(400).json({ message: 'Missing required configuration' });
    }

    // Firebase-specific: validate service account JSON before saving
    if (provider === 'Firebase') {
      const raw = config.serviceAccountJson;
      if (!raw) {
        return res.status(400).json({ message: 'Service Account JSON is required for Firebase.' });
      }
      try {
        const parsed = JSON.parse(raw);
        if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
          return res.status(400).json({ message: 'Service Account JSON missing required fields: project_id, private_key, client_email.' });
        }
      } catch (e) {
        return res.status(400).json({ message: 'Invalid Service Account JSON format.' });
      }
    }

    // Encrypt the configuration object
    const configString = JSON.stringify(config);
    const encrypted = encrypt(configString);

    const newConnection = new UserConnection({
      name,
      provider,
      encryptedConfig: encrypted.content,
      iv: encrypted.iv,
      isEncrypted: true,
      ownerUid // Forcefully inject the user's UID
    });

    await newConnection.save();

    res.status(201).json({ 
      message: 'Connection saved successfully',
      connection: {
        _id: newConnection._id,
        name: newConnection.name,
        provider: newConnection.provider,
        createdAt: newConnection.createdAt
      }
    });
  } catch (error) {
    console.error('Error saving connection:', error);
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
});

// GET /api/connections - List all saved connections (masked)
app.get('/api/connections', requireAuth, async (req, res) => {
  try {
    // Hardcode ownerUid filter so users can only see their own data
    const connections = await UserConnection.find(
      { ownerUid: req.user.uid }, 
      'name provider createdAt isActive lastTestedAt'
    ); 
    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE /api/connections/:id - Delete a connection
app.delete('/api/connections/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Ensure the connection belongs to the user before deleting
    const deleted = await UserConnection.findOneAndDelete({ _id: id, ownerUid: req.user.uid });
    if (!deleted) {
      return res.status(404).json({ message: 'Connection not found or unauthorized' });
    }
    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
});

// GET /api/connections/vercel/status - Check if Vercel is connected + fetch projects & deployments
app.get('/api/connections/vercel/status', requireAuth, async (req, res) => {
  try {
    const connection = await UserConnection.findOne({
      ownerUid: req.user.uid,
      provider: 'Vercel'
    });

    if (!connection) {
      return res.json({ connected: false });
    }

    const { decrypt } = require('./utils/encryption');
    let vercelToken;
    try {
      const decrypted = decrypt({ iv: connection.iv, content: connection.encryptedConfig });
      const parsed = JSON.parse(decrypted);
      vercelToken = parsed.token;
    } catch {
      return res.json({ connected: true, connectionId: connection._id, createdAt: connection.createdAt, projects: [], deployments: [], error: 'Failed to decrypt token' });
    }

    const axios = require('axios');
    const headers = { Authorization: `Bearer ${vercelToken}` };

    let projects = [];
    let deployments = [];
    let user = null;

    try {
      const [userRes, projRes, deplRes] = await Promise.all([
        axios.get('https://api.vercel.com/v2/user', { headers }).catch(() => null),
        axios.get('https://api.vercel.com/v9/projects?limit=20', { headers }).catch(() => null),
        axios.get('https://api.vercel.com/v6/deployments?limit=15', { headers }).catch(() => null),
      ]);

      if (userRes?.data?.user) {
        user = {
          username: userRes.data.user.username,
          name: userRes.data.user.name,
          email: userRes.data.user.email,
          avatar: userRes.data.user.avatar,
        };
      }

      if (projRes?.data?.projects) {
        projects = projRes.data.projects.map(p => ({
          id: p.id,
          name: p.name,
          framework: p.framework,
          updatedAt: p.updatedAt,
          latestDeploymentStatus: p.latestDeployments?.[0]?.readyState || 'unknown',
          url: p.alias?.[0] ? `https://${p.alias[0]}` : null,
        }));
      }

      if (deplRes?.data?.deployments) {
        deployments = deplRes.data.deployments.map(d => ({
          uid: d.uid,
          name: d.name,
          url: d.url ? `https://${d.url}` : null,
          state: d.state || d.readyState,
          created: d.created || d.createdAt,
          source: d.source,
          meta: d.meta ? { githubCommitMessage: d.meta.githubCommitMessage, githubCommitRef: d.meta.githubCommitRef } : null,
        }));
      }
    } catch (apiErr) {
      console.error('Vercel API fetch error:', apiErr.message);
    }

    res.json({
      connected: true,
      connectionId: connection._id,
      createdAt: connection.createdAt,
      user,
      projects,
      deployments,
    });
  } catch (error) {
    console.error('Error checking Vercel status:', error);
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
});

// POST /api/connections/vercel - Save a Vercel Personal Access Token
app.post('/api/connections/vercel', requireAuth, async (req, res) => {
  try {
    const { name, token } = req.body;
    const ownerUid = req.user.uid;

    if (!name || !token) {
      return res.status(400).json({ message: 'Connection name and Vercel PAT are required.' });
    }

    // Encrypt the token
    const encrypted = encrypt(JSON.stringify({ token }));

    const newConnection = new UserConnection({
      name,
      provider: 'Vercel',
      encryptedConfig: encrypted.content,
      iv: encrypted.iv,
      isEncrypted: true,
      ownerUid
    });

    await newConnection.save();

    res.status(201).json({ 
      message: 'Vercel connection saved successfully',
      connection: {
        _id: newConnection._id,
        name: newConnection.name,
        provider: 'Vercel',
        createdAt: newConnection.createdAt
      }
    });
  } catch (error) {
    console.error('Error saving Vercel connection:', error);
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
});

// GET /api/databases/mongodb/users
app.get('/api/databases/mongodb/users', async (req, res) => {
  try {
    // Check connection state
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database disconnected' });
    }

    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    // Pass error to Auto-Medic Middleware
    next(error);
  }
});

// --- Auto-Medic Middleware ---
// Must be last middleware after routes
app.use(autoMedicMiddleware);

// Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
