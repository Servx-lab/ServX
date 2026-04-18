const mongoose = require('mongoose');

const AccessControlSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
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
    },
    /**
     * Optional per-resource allow lists. When omitted, all connected resources are allowed.
     * When present, only listed keys/ids are visible to the team member.
     * repoKeys: GitHub full_name; serverIds/databaseIds: UserConnection _id strings.
     */
    granularAllow: {
      repoKeys: [{ type: String }],
      serverIds: [{ type: String }],
      databaseIds: [{ type: String }]
    }
  },
  ownerLogoUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Ensure unique combination of owner and user
AccessControlSchema.index({ ownerId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AccessControl', AccessControlSchema);
