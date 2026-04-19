const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  installationId: {
    type: String,
    required: true,
    index: true
  },
  module: {
    type: String,
    required: true
  },
  event: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['normal', 'anomaly', 'critical'],
    default: 'normal'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
