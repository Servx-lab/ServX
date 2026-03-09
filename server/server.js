require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const User = require('./models/User');
const UserConnection = require('./models/UserConnection');
const authRoutes = require('./routes/authRoutes');
const githubRoutes = require('./routes/githubRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Encryption Configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
const IV_LENGTH = 16; // AES block size

// Helper: Encrypt
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString('hex'), content: encrypted.toString('hex') };
}

// Middleware
// Allow requests from your frontend (adjust origin as needed for production)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);

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
    const { dbName, dbType, connectionString } = req.body;

    if (!dbName || !dbType || !connectionString) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Encrypt the connection string
    const encrypted = encrypt(connectionString);

    const newConnection = new UserConnection({
      dbName,
      dbType,
      connectionString: encrypted.content,
      iv: encrypted.iv
    });

    await newConnection.save();

    res.status(201).json({ 
      message: 'Connection saved successfully',
      connection: {
        _id: newConnection._id,
        dbName: newConnection.dbName,
        dbType: newConnection.dbType
      }
    });
  } catch (error) {
    console.error('Error saving connection:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET /api/connections - List all saved connections (masked)
app.get('/api/connections', async (req, res) => {
  try {
    const connections = await UserConnection.find({}, 'dbName dbType createdAt'); // Select only safe fields
    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Server Error' });
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
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

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
