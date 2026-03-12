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
const gmailRoutes = require('./routes/gmailRoutes');
const operationsRoutes = require('./routes/operationsRoutes');
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
app.use('/api/operations', operationsRoutes);

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


app.use('/api', gmailRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Remote Task Execution (stub - extend with real logic)
app.post('/api/tasks/execute', requireAuth, async (req, res) => {
  try {
    const { task, targetId } = req.body;
    if (!task || !targetId) {
      return res.status(400).json({ message: 'Missing task or targetId' });
    }
    // TODO: Implement actual task execution (backup, cache clear, sync)
    console.log(`[Tasks] ${req.user?.uid} executed ${task} on target ${targetId}`);
    res.json({ success: true, task, targetId });
  } catch (err) {
    console.error('Task execute error:', err);
    res.status(500).json({ message: 'Task execution failed' });
  }
});

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

// --- Generic Hosting Provider Routes ---
const HOSTING_PROVIDERS = {
  vercel:       { dbName: 'Vercel',       label: 'Vercel' },
  render:       { dbName: 'Render',       label: 'Render' },
  railway:      { dbName: 'Railway',      label: 'Railway' },
  digitalocean: { dbName: 'DigitalOcean', label: 'DigitalOcean' },
  fly:          { dbName: 'Fly.io',       label: 'Fly.io' },
  aws:          { dbName: 'AWS',          label: 'AWS' },
};

// GET /api/connections/hosting/:provider/status
app.get('/api/connections/hosting/:provider/status', requireAuth, async (req, res) => {
  try {
    const providerKey = req.params.provider.toLowerCase();
    const providerInfo = HOSTING_PROVIDERS[providerKey];
    if (!providerInfo) return res.status(400).json({ message: 'Unknown hosting provider.' });

    const connection = await UserConnection.findOne({
      ownerUid: req.user.uid,
      provider: providerInfo.dbName
    });

    if (!connection) {
      return res.json({ connected: false });
    }

    const { decrypt } = require('./utils/encryption');
    let token;
    try {
      const decrypted = decrypt({ iv: connection.iv, content: connection.encryptedConfig });
      const parsed = JSON.parse(decrypted);
      token = parsed.token || parsed.apiKey;
    } catch {
      return res.json({ connected: true, connectionId: connection._id, createdAt: connection.createdAt, services: [], deployments: [], error: 'Failed to decrypt token' });
    }

    const axios = require('axios');
    let services = [];
    let deployments = [];
    let user = null;

    try {
      if (providerKey === 'vercel') {
        const headers = { Authorization: `Bearer ${token}` };
        const [userRes, projRes, deplRes] = await Promise.all([
          axios.get('https://api.vercel.com/v2/user', { headers }).catch(() => null),
          axios.get('https://api.vercel.com/v9/projects?limit=20', { headers }).catch(() => null),
          axios.get('https://api.vercel.com/v6/deployments?limit=15', { headers }).catch(() => null),
        ]);
        if (userRes?.data?.user) {
          user = { username: userRes.data.user.username, name: userRes.data.user.name, email: userRes.data.user.email, avatar: userRes.data.user.avatar };
        }
        if (projRes?.data?.projects) {
          services = projRes.data.projects.map(p => ({
            id: p.id, name: p.name, type: p.framework || 'project', status: p.latestDeployments?.[0]?.readyState || 'unknown', url: p.alias?.[0] ? `https://${p.alias[0]}` : null, updatedAt: p.updatedAt,
          }));
        }
        if (deplRes?.data?.deployments) {
          deployments = deplRes.data.deployments.map(d => ({
            id: d.uid, name: d.name, url: d.url ? `https://${d.url}` : null, state: d.state || d.readyState, created: d.created || d.createdAt, commit: d.meta?.githubCommitMessage || null, branch: d.meta?.githubCommitRef || null,
          }));
        }
      } else if (providerKey === 'render') {
        const headers = { Authorization: `Bearer ${token}` };
        const [svcRes, deplRes] = await Promise.all([
          axios.get('https://api.render.com/v1/services?limit=20', { headers }).catch(() => null),
          axios.get('https://api.render.com/v1/services?limit=5', { headers }).then(async (svcList) => {
            if (!svcList?.data?.length) return [];
            const allDeploys = await Promise.all(
              svcList.data.slice(0, 5).map(s =>
                axios.get(`https://api.render.com/v1/services/${s.service.id}/deploys?limit=3`, { headers }).catch(() => ({ data: [] }))
              )
            );
            return allDeploys.flatMap((r, i) => (r.data || []).map(d => ({ ...d, serviceName: svcList.data[i].service.name })));
          }).catch(() => []),
        ]);
        if (svcRes?.data) {
          const ownerInfo = svcRes.data[0]?.service?.ownerId;
          if (ownerInfo) user = { username: ownerInfo, name: '', email: '' };
          services = svcRes.data.map(s => ({
            id: s.service.id, name: s.service.name, type: s.service.type || 'web_service', status: s.service.suspended === 'suspended' ? 'suspended' : 'active', url: s.service.serviceDetails?.url || null, updatedAt: new Date(s.service.updatedAt).getTime(),
          }));
        }
        if (Array.isArray(deplRes)) {
          deployments = deplRes.map(d => ({
            id: d.deploy?.id || d.id, name: d.serviceName || '', url: null, state: d.deploy?.status || 'unknown', created: new Date(d.deploy?.createdAt || d.deploy?.finishedAt || Date.now()).getTime(), commit: d.deploy?.commit?.message || null, branch: null,
          }));
        }
      } else if (providerKey === 'railway') {
        const gql = `{ me { name email } projects(first: 20) { edges { node { id name services { edges { node { id name } } } updatedAt } } } }`;
        const railRes = await axios.post('https://backboard.railway.app/graphql/v2', { query: gql }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }).catch(() => null);
        if (railRes?.data?.data?.me) {
          user = { username: railRes.data.data.me.name, name: railRes.data.data.me.name, email: railRes.data.data.me.email || '' };
        }
        if (railRes?.data?.data?.projects?.edges) {
          services = railRes.data.data.projects.edges.map(e => ({
            id: e.node.id, name: e.node.name, type: 'project', status: 'active', url: null, updatedAt: new Date(e.node.updatedAt).getTime(),
          }));
        }
      } else if (providerKey === 'digitalocean') {
        const headers = { Authorization: `Bearer ${token}` };
        const [acctRes, appRes] = await Promise.all([
          axios.get('https://api.digitalocean.com/v2/account', { headers }).catch(() => null),
          axios.get('https://api.digitalocean.com/v2/apps?per_page=20', { headers }).catch(() => null),
        ]);
        if (acctRes?.data?.account) {
          user = { username: acctRes.data.account.email, name: '', email: acctRes.data.account.email };
        }
        if (appRes?.data?.apps) {
          services = appRes.data.apps.map(a => ({
            id: a.id, name: a.spec?.name || a.id, type: 'app', status: a.active_deployment?.phase || 'unknown', url: a.live_url || null, updatedAt: new Date(a.updated_at).getTime(),
          }));
        }
      } else if (providerKey === 'fly') {
        const gql = `{ viewer { name email } apps(first: 20) { nodes { id name status hostname } } }`;
        const flyRes = await axios.post('https://api.fly.io/graphql', { query: gql }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }).catch(() => null);
        if (flyRes?.data?.data?.viewer) {
          user = { username: flyRes.data.data.viewer.name, name: flyRes.data.data.viewer.name, email: flyRes.data.data.viewer.email || '' };
        }
        if (flyRes?.data?.data?.apps?.nodes) {
          services = flyRes.data.data.apps.nodes.map(a => ({
            id: a.id, name: a.name, type: 'app', status: a.status || 'unknown', url: a.hostname ? `https://${a.hostname}` : null, updatedAt: Date.now(),
          }));
        }
      }
    } catch (apiErr) {
      console.error(`${providerInfo.label} API fetch error:`, apiErr.message);
    }

    res.json({ connected: true, connectionId: connection._id, createdAt: connection.createdAt, user, services, deployments });
  } catch (error) {
    console.error('Error checking hosting status:', error);
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
});

// POST /api/connections/hosting/:provider - Save a hosting provider token
app.post('/api/connections/hosting/:provider', requireAuth, async (req, res) => {
  try {
    const providerKey = req.params.provider.toLowerCase();
    const providerInfo = HOSTING_PROVIDERS[providerKey];
    if (!providerInfo) return res.status(400).json({ message: 'Unknown hosting provider.' });

    const { name, token, edgeConfigId } = req.body;
    const ownerUid = req.user.uid;

    if (!name || !token) {
      return res.status(400).json({ message: `Connection name and ${providerInfo.label} API key are required.` });
    }

    const config = { token };
    if (providerKey === 'vercel' && edgeConfigId) config.edgeConfigId = edgeConfigId;

    const existing = await UserConnection.findOne({ ownerUid, provider: providerInfo.dbName });
    if (existing) {
      const encrypted = encrypt(JSON.stringify(config));
      existing.encryptedConfig = encrypted.content;
      existing.iv = encrypted.iv;
      existing.name = name;
      await existing.save();
      return res.status(200).json({ message: `${providerInfo.label} connection updated successfully`, connection: { _id: existing._id, name: existing.name, provider: providerInfo.dbName, createdAt: existing.createdAt } });
    }

    const encrypted = encrypt(JSON.stringify(config));
    const newConnection = new UserConnection({
      name,
      provider: providerInfo.dbName,
      encryptedConfig: encrypted.content,
      iv: encrypted.iv,
      isEncrypted: true,
      ownerUid
    });
    await newConnection.save();

    res.status(201).json({
      message: `${providerInfo.label} connection saved successfully`,
      connection: { _id: newConnection._id, name: newConnection.name, provider: providerInfo.dbName, createdAt: newConnection.createdAt }
    });
  } catch (error) {
    console.error('Error saving hosting connection:', error);
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
});

// Keep legacy Vercel routes as aliases
app.get('/api/connections/vercel/status', requireAuth, (req, res, next) => { req.params.provider = 'vercel'; req.url = '/api/connections/hosting/vercel/status'; next('route'); });
app.post('/api/connections/vercel', requireAuth, async (req, res) => {
  const providerInfo = HOSTING_PROVIDERS['vercel'];
  const { name, token, edgeConfigId } = req.body;
  const ownerUid = req.user.uid;
  if (!name || !token) return res.status(400).json({ message: 'Connection name and Vercel PAT are required.' });
  const config = { token }; if (edgeConfigId) config.edgeConfigId = edgeConfigId;
  const encrypted = encrypt(JSON.stringify(config));
  const existing = await UserConnection.findOne({ ownerUid, provider: providerInfo.dbName });
  if (existing) { existing.encryptedConfig = encrypted.content; existing.iv = encrypted.iv; existing.name = name; await existing.save(); return res.status(200).json({ message: 'Vercel connection updated', connection: { _id: existing._id, name: existing.name, provider: 'Vercel', createdAt: existing.createdAt } }); }
  const newConnection = new UserConnection({ name, provider: 'Vercel', encryptedConfig: encrypted.content, iv: encrypted.iv, isEncrypted: true, ownerUid });
  await newConnection.save();
  res.status(201).json({ message: 'Vercel connection saved successfully', connection: { _id: newConnection._id, name: newConnection.name, provider: 'Vercel', createdAt: newConnection.createdAt } });
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
