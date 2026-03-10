const mongoose = require('mongoose');

const AccessControlSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true
  },
  userUid: {
    type: String,
    required: true,
    index: true
  },
  permissions: {
    repos: [{
      name: String,
      canViewLogs: { type: Boolean, default: false },
      canViewCommits: { type: Boolean, default: false },
      canTriggerPipeline: { type: Boolean, default: false }
    }],
    dbs: [{
      name: String,
      canView: { type: Boolean, default: false },
      canModify: { type: Boolean, default: false }
    }],
    global: {
      isFullControl: { type: Boolean, default: false },
      canBanIPs: { type: Boolean, default: false },
      canViewDeviceUUIDs: { type: Boolean, default: false }
    }
  },
  ownerLogoUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Ensure unique combination of owner and user
AccessControlSchema.index({ ownerUid: 1, userUid: 1 }, { unique: true });

module.exports = mongoose.model('AccessControl', AccessControlSchema);
