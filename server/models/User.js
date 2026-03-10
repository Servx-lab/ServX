const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true
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