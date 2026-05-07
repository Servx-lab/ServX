const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true
  },
  surname: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },
  githubAccessToken: {
    type: String,
    select: false // Hide by default
  },
  githubRefreshToken: {
    type: String,
    select: false
  },
  githubTokenExpiry: Date,
  githubInstallationTokenEncrypted: {
    type: String,
    select: false
  },
  githubInstallationTokenIv: {
    type: String,
    select: false
  },
  githubInstallationId: {
    type: String,
    select: false
  },
  githubInstallationTokenUpdatedAt: {
    type: Date,
    select: false
  },
  avatarUrl: String,
  role: {
    type: String,
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Check if the model is already defined to prevent overwriting during hot reloads
module.exports = mongoose.models.User || mongoose.model('User', userSchema);