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
      'Firebase', 
      'Supabase', 
      'MySQL', 
      'PostgreSQL', 
      'AWS RDS', 
      'Oracle', 
      'Redis', 
      'MariaDB'
    ]
  },
  // Store provider-specific configuration
  config: {
    // Shared / Common Fields
    host: { type: String },
    port: { type: Number },
    username: { type: String },
    password: { type: String }, // Should be encrypted before saving
    dbName: { type: String },
    
    // URI-based (MySQL, Postgres, MariaDB, Redis)
    connectionUri: { type: String },

    // Firebase Specific
    apiKey: { type: String },
    authDomain: { type: String },
    projectId: { type: String },
    storageBucket: { type: String },

    // Supabase Specific
    projectUrl: { type: String },
    anonKey: { type: String }, // Treated as sensitive

    // AWS RDS Specific
    endpoint: { type: String },

    // Oracle Specific
    serviceName: { type: String }
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

// Create a virtual property to get the type-specific connection string equivalent if possible
userConnectionSchema.virtual('displayString').get(function() {
  if (this.config.connectionUri) return this.config.connectionUri.replace(/:[^:]*@/, ':****@'); // Mask password
  if (this.config.host) return `${this.config.host}:${this.config.port}`;
  if (this.config.projectUrl) return this.config.projectUrl;
  if (this.config.projectId) return this.config.projectId;
  return 'Unknown Endpoint';
});

module.exports = mongoose.models.UserConnection || mongoose.model('UserConnection', userConnectionSchema);