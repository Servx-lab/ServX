const mongoose = require('mongoose');

const userConnectionSchema = new mongoose.Schema({
  dbName: {
    type: String,
    required: true
  },
  dbType: {
    type: String,
    required: true,
    enum: ['MongoDB', 'MySQL', 'PostgreSQL'] // Basic validation, can be expanded
  },
  connectionString: {
    type: String, // This will store the encrypted string
    required: true
  },
  iv: {
    type: String, // Initialization vector for encryption
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.UserConnection || mongoose.model('UserConnection', userConnectionSchema);