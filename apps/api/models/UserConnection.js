const mongoose = require('mongoose');

const userConnectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Connection name is required'],
    trim: true
  },
  provider: {
    type: String,
    required: [true, 'Provider type is required'],
    enum: [
      'Vercel',
      'Render',
      'DigitalOcean',
      'Railway',
      'Fly.io',
      'AWS',
      'Firebase', 
      'MongoDB',
      'Supabase', 
      'MySQL', 
      'PostgreSQL', 
      'AWS RDS', 
      'Oracle', 
      'Redis', 
      'MariaDB',
      'GitHub'
    ]
  },
  // GitHub specific: store the app's installation ID for multi-tenant webhooks
  installationId: {
    type: String,
    index: true
  },
  // Store encrypted configuration as a JSON string
  encryptedConfig: {
    type: String,
    required: true
  },
  
  // Security & Metadata
  isEncrypted: {
    type: Boolean,
    default: true
  },
  iv: {
    type: String, // Initialization Vector for encryption
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTestedAt: {
    type: Date
  },
  ownerUid: {
    type: String, // Associated Firebase UID
    required: [true, 'Owner UID is required'],
    index: true
  },
  status: {
    type: String,
    enum: ['connected', 'error', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Helper method to get safe display string
userConnectionSchema.methods.getDisplayString = function() {
  return `${this.provider} Connection`;
};

module.exports = mongoose.models.UserConnection || mongoose.model('UserConnection', userConnectionSchema);