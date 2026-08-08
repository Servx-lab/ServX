
const mongoose = require('mongoose');

const attackPathsJobSchema = new mongoose.Schema(
  {
    requestedBy: { type: String, required: true, index: true },

    repoId: { type: String, required: true, index: true },
    repoFullName: { type: String, required: true },
    targetUrl: { type: String, default: '' },

    // client-provided scan config
    scanTypes: {
      type: [String],
      required: true,
      default: [],
    },
    analysisDepth: { type: Number, required: true },

    deviceId: { type: String, default: '' },
    idempotencyKey: { type: String, default: '', index: true, unique: false },
    profile: { type: String, enum: ['quick', 'deep_repo', 'verified_live'], default: 'deep_repo', index: true },
    dispatchState: { type: String, enum: ['pending', 'accepted', 'retrying'], default: 'pending', index: true },
    targetAssetId: { type: String, default: '' },
    targetUrlSnapshot: { type: String, default: '' },
    executionLeaseId: { type: String, default: '' },
    leaseExpiresAt: { type: Date, default: null },
    attemptCount: { type: Number, default: 0 },
    queuePosition: { type: Number, default: 0 },
    queueReason: { type: String, default: '' },
    cancelRequestedAt: { type: Date, default: null },

    // lifecycle
    status: {
      type: String,
      enum: [
        'warming',
        'queued',
        'cpgraph_building',
        'cpgraph_analyzing',
        'harness_synthesizing',
        'sandbox_verifying',
        'rendering_report',
        'completed',
        'cancelled',
        'failed',
      ],
      default: 'queued',
      index: true,
    },
    phaseMessage: { type: String, default: '' },

    // progress
    progressPct: { type: Number, default: 0 },

    // GitHub repo materialization (encrypted for worker consumption)
    // Stored as encrypted payload parts to avoid ever persisting plaintext tokens.
    githubAccessTokenEnc: { type: String, default: '' }, // encrypted_access_token
    githubTokenIv: { type: String, default: '' }, // iv used for encryption
    githubTokenExpiry: { type: Date, default: null }, // optional expiry from GitHub vault

// results / artifacts (v1)
    results: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    scanArtifacts: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    toolStatuses: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    graphArtifact: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    assuranceSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    scanMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    reportArtifactUrl: { type: String, default: '' },

    // audit
    lastError: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound indexes for the query patterns used across attackPathsJobService:
// - Queue position counts filter by status and order by createdAt.
// - Manual scan quota checks filter by requestedBy + profile within a time window.
// - "Latest job for user" lookups filter by requestedBy and sort by createdAt desc.
attackPathsJobSchema.index({ status: 1, createdAt: 1 });
attackPathsJobSchema.index({ requestedBy: 1, profile: 1, createdAt: -1 });
attackPathsJobSchema.index({ requestedBy: 1, createdAt: -1 });

// Mongoose model safety for hot-reload
module.exports =
  mongoose.models.AttackPathsJob ||
  mongoose.model('AttackPathsJob', attackPathsJobSchema);
