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
const databaseExplorerRoutes = require('./routes/databaseExplorerRoutes');
const autoMedicMiddleware = require('./middleware/autoMedicMiddleware');
const { encrypt } = require('./utils/encryption');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:8080', 'http://localhost:5173'].filter(Boolean),
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/db', databaseExplorerRoutes);

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
app.post('/api/connections', async (req, res) => {
  try {
    const { name, provider, config } = req.body;

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
      isEncrypted: true
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
app.get('/api/connections', async (req, res) => {
  try {
    const connections = await UserConnection.find({}, 'name provider createdAt isActive lastTestedAt'); 
    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE /api/connections/:id - Delete a connection
app.delete('/api/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await UserConnection.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting connection:', error);
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
