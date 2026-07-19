
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

    // lifecycle
    status: {
      type: String,
      enum: [
        'queued',
        'cpgraph_building',
        'cpgraph_analyzing',
        'harness_synthesizing',
        'sandbox_verifying',
        'rendering_report',
        'completed',
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
    reportArtifactUrl: { type: String, default: '' },

    // audit
    lastError: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Mongoose model safety for hot-reload
module.exports =
  mongoose.models.AttackPathsJob ||
  mongoose.model('AttackPathsJob', attackPathsJobSchema);
