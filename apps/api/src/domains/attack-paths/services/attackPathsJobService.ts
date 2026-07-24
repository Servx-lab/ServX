import type { Document } from 'mongoose';
import crypto from 'crypto';
import AttackPathsJobModel from '../../../../models/AttackPathsJob';

const MANUAL_SCAN_LIMIT_PER_DAY = 3;
export const ACTIVE_STATUSES = ['warming', 'queued', 'cpgraph_building', 'cpgraph_analyzing', 'harness_synthesizing', 'sandbox_verifying', 'rendering_report'] as const;
const DISPATCHABLE_STATUSES = ['warming', 'queued'];
const LEASE_DURATION_MS = 90 * 60 * 1000;

export class AttackPathsQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttackPathsQuotaError';
  }
}

export class AttackPathsConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttackPathsConflictError';
  }
}

export class AttackPathsQueueFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttackPathsQueueFullError';
  }
}

export type AttackPathsJobDoc = Document & {
  _id: any;
  requestedBy: string;

  repoId: string;
  repoFullName: string;
  targetUrl?: string;

  scanTypes: string[];
  analysisDepth: number;
  profile?: 'quick' | 'deep_repo' | 'verified_live';
  dispatchState?: 'pending' | 'accepted' | 'retrying';
  executionLeaseId?: string;
  leaseExpiresAt?: Date | null;
  attemptCount?: number;
  queuePosition?: number;
  queueReason?: string;
  cancelRequestedAt?: Date | null;

  status: string;
  progressPct: number;

  phaseMessage?: string;

  // encrypted GitHub token materialization for worker
  githubAccessTokenEnc?: string;
  githubTokenIv?: string;
  githubTokenExpiry?: Date | null;

  results: any;
  scanArtifacts: any;
  toolStatuses: any[];
  graphArtifact: any;
  assuranceSummary?: any;
  scanMetrics?: any;
  reportArtifactUrl: string;

  createdAt?: Date;
  updatedAt?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;

  lastError?: string;
};

export type CreatedAttackPathsJob = {
  job: AttackPathsJobDoc;
  reused: boolean;
  quotaRemaining: number;
  quota: ManualRepositoryScanAllowance;
};

export type ManualRepositoryScanAllowance = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string | null;
};

function maxQueuedJobs(): number {
  const configured = Number(process.env.ATTACK_PATHS_MAX_QUEUED_JOBS || 25);
  return Math.min(Math.max(1, Number.isFinite(configured) ? Math.floor(configured) : 25), 100);
}

function isManualRepositoryProfile(profile: string): boolean {
  return profile === 'quick' || profile === 'deep_repo';
}

function activeJobFilter(): Record<string, unknown> {
  return { status: { $in: ACTIVE_STATUSES } };
}

/**
 * Single source of truth for both quota enforcement and the allowance shown in
 * the browser. A cancelled or failed manual request still counts: it consumed
 * executor capacity and prevents users from retrying around the rate limit.
 */
export async function getManualRepositoryScanAllowance(requestedBy: string): Promise<ManualRepositoryScanAllowance> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const quotaFilter = {
    requestedBy,
    profile: { $in: ['quick', 'deep_repo'] },
    createdAt: { $gte: since },
  };
  const [used, oldest] = await Promise.all([
    AttackPathsJobModel.countDocuments(quotaFilter).exec(),
    AttackPathsJobModel.findOne(quotaFilter).sort({ createdAt: 1 }).select({ createdAt: 1 }).lean().exec(),
  ]);
  const oldestCreatedAt = (oldest as any)?.createdAt;
  return {
    limit: MANUAL_SCAN_LIMIT_PER_DAY,
    used,
    remaining: Math.max(0, MANUAL_SCAN_LIMIT_PER_DAY - used),
    resetAt: oldestCreatedAt instanceof Date ? new Date(oldestCreatedAt.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
  };
}

export async function createAttackPathsJob(params: {
  requestedBy: string;
  repoId: string;
  repoFullName: string;
  targetUrl?: string;
  scanTypes: string[];
  analysisDepth: number;
  deviceId?: string;
  idempotencyKey?: string;
  profile?: 'quick' | 'deep_repo' | 'verified_live';
}): Promise<CreatedAttackPathsJob> {
  const profile = params.profile || 'deep_repo';
  const idempotencyKey = params.idempotencyKey?.trim() || crypto.randomUUID();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existing = await AttackPathsJobModel.findOne({
    requestedBy: params.requestedBy,
    idempotencyKey,
    createdAt: { $gte: since },
  }).exec();
  if (existing) {
    const quota = await getManualRepositoryScanAllowance(params.requestedBy);
    return { job: existing as AttackPathsJobDoc, reused: true, quotaRemaining: quota.remaining, quota };
  }

  let quota: ManualRepositoryScanAllowance = {
    limit: MANUAL_SCAN_LIMIT_PER_DAY,
    used: 0,
    remaining: MANUAL_SCAN_LIMIT_PER_DAY,
    resetAt: null,
  };
  if (isManualRepositoryProfile(profile)) {
    const [allowance, activeForRepo, queuedCount] = await Promise.all([
      getManualRepositoryScanAllowance(params.requestedBy),
      AttackPathsJobModel.findOne({ requestedBy: params.requestedBy, repoId: params.repoId, ...activeJobFilter() }).exec(),
      AttackPathsJobModel.countDocuments(activeJobFilter()).exec(),
    ]);
    quota = allowance;
    if (quota.remaining <= 0) {
      throw new AttackPathsQuotaError('You have reached the limit of three repository scans in the last 24 hours.');
    }
    if (activeForRepo) {
      throw new AttackPathsConflictError('A scan for this repository is already queued or running.');
    }
    if (queuedCount >= maxQueuedJobs()) {
      throw new AttackPathsQueueFullError('The scan queue is at capacity. Please try again shortly.');
    }
  }

  const doc = await AttackPathsJobModel.create({
    requestedBy: params.requestedBy,
    repoId: params.repoId,
    repoFullName: params.repoFullName,
    targetUrl: params.targetUrl || '',
    scanTypes: params.scanTypes,
    analysisDepth: params.analysisDepth,
    deviceId: params.deviceId || '',
    idempotencyKey,
    profile,
    dispatchState: 'pending',
    status: 'warming',
    progressPct: 0,
    phaseMessage: 'Starting scan executor...',
    startedAt: null,
    completedAt: null,

    results: [],
    scanArtifacts: [],
    toolStatuses: [],
    graphArtifact: null,
    reportArtifactUrl: '',
    lastError: '',
    queuePosition: 0,
    queueReason: 'Waiting for the shared serial executor.',
    executionLeaseId: '',
    leaseExpiresAt: null,
    cancelRequestedAt: null,
  });

  return {
    job: doc as AttackPathsJobDoc,
    reused: false,
    quotaRemaining: isManualRepositoryProfile(profile) ? Math.max(0, quota.remaining - 1) : 0,
    quota: isManualRepositoryProfile(profile)
      ? { ...quota, used: quota.used + 1, remaining: Math.max(0, quota.remaining - 1), resetAt: quota.resetAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
      : quota,
  };
}

export async function getAttackPathsJobById(jobId: string): Promise<AttackPathsJobDoc | null> {
  const doc = await AttackPathsJobModel.findById(jobId).exec();
  return (doc as AttackPathsJobDoc) || null;
}

/** Returns the caller's most recent job so completed evidence survives a page refresh. */
export async function getLatestAttackPathsJobForUser(requestedBy: string, repoFullName?: string): Promise<AttackPathsJobDoc | null> {
  const query: Record<string, unknown> = { requestedBy };
  if (repoFullName) {
    const escaped = repoFullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.repoFullName = { $regex: new RegExp(`^${escaped}$`, 'i') };
  }
  const doc = await AttackPathsJobModel.findOne(query)
    .sort({ createdAt: -1 })
    .exec();
  return (doc as AttackPathsJobDoc) || null;
}

export async function updateAttackPathsJobProgress(jobId: string, update: {
  status?: string;
  progressPct?: number;
  phaseMessage?: string;
}, executionLeaseId?: string): Promise<AttackPathsJobDoc | null> {
  const filter: Record<string, unknown> = {
    _id: jobId,
    status: { $in: ACTIVE_STATUSES },
  };
  if (executionLeaseId) filter.executionLeaseId = executionLeaseId;
  const doc = await AttackPathsJobModel.findOneAndUpdate(
    filter,
    {
      $set: {
        ...(update.status ? { status: update.status } : {}),
        ...(typeof update.progressPct === 'number' ? { progressPct: update.progressPct } : {}),
        ...(update.phaseMessage ? { phaseMessage: update.phaseMessage } : {}),
      }
    },
    { new: true }
  ).exec();

  return (doc as AttackPathsJobDoc) || null;
}

export async function markAttackPathsJobDispatch(jobId: string, update: {
  state: 'accepted' | 'retrying';
  phaseMessage?: string;
  status?: 'warming' | 'queued';
}): Promise<AttackPathsJobDoc | null> {
  const doc = await AttackPathsJobModel.findByIdAndUpdate(
    jobId,
    {
      $set: {
        dispatchState: update.state,
        ...(update.status ? { status: update.status } : {}),
        ...(update.phaseMessage ? { phaseMessage: update.phaseMessage } : {}),
      },
    },
    { new: true }
  ).exec();
  return (doc as AttackPathsJobDoc) || null;
}

export async function failAttackPathsJob(jobId: string, update: {
  lastError: string;
  progressPct?: number;
  executionLeaseId?: string;
}): Promise<AttackPathsJobDoc | null> {
  const filter: Record<string, unknown> = {
    _id: jobId,
    status: { $in: ACTIVE_STATUSES },
  };
  if (update.executionLeaseId) filter.executionLeaseId = update.executionLeaseId;
  const doc = await AttackPathsJobModel.findOneAndUpdate(
    filter,
    {
      $set: {
        status: 'failed',
        phaseMessage: 'Job failed',
        lastError: update.lastError,
        ...(typeof update.progressPct === 'number' ? { progressPct: update.progressPct } : {}),
        completedAt: new Date(),
        queuePosition: 0,
        queueReason: '',
      },
      $unset: { executionLeaseId: '', leaseExpiresAt: '' },
    },
    { new: true }
  ).exec();
  return (doc as AttackPathsJobDoc) || null;
}

export async function setAttackPathsJobResult(jobId: string, update: {
  status: string;
  progressPct: number;
  phaseMessage: string;
  results: any;
  scanArtifacts?: any;
  toolStatuses?: any[];
  graphArtifact: any;
  reportArtifactUrl: string;
  failedScanners?: any[];
  lastError?: string;
  assuranceSummary?: any;
  executionLeaseId?: string;
}): Promise<AttackPathsJobDoc | null> {
  const filter: Record<string, unknown> = {
    _id: jobId,
    status: { $in: ACTIVE_STATUSES },
  };
  if (update.executionLeaseId) filter.executionLeaseId = update.executionLeaseId;
  const completedAt = new Date();
  const doc = await AttackPathsJobModel.findOneAndUpdate(
    filter,
    {
      $set: {
        status: update.status,
        progressPct: update.progressPct,
        phaseMessage: update.phaseMessage,
        results: update.results,
        scanArtifacts: update.scanArtifacts ?? [],
        toolStatuses: update.toolStatuses ?? [],
        graphArtifact: update.graphArtifact,
        reportArtifactUrl: update.reportArtifactUrl,
        assuranceSummary: update.assuranceSummary ?? {},
        lastError: update.lastError || '',
        completedAt,
        queuePosition: 0,
        queueReason: '',
      }
    },
    { new: true }
  ).exec();

  if (!doc) return null;

  const startedAt = doc.startedAt ? new Date(doc.startedAt).getTime() : completedAt.getTime();
  const createdAt = doc.createdAt ? new Date(doc.createdAt).getTime() : startedAt;
  const scanMetrics = {
    queuedAt: new Date(createdAt).toISOString(),
    startedAt: new Date(startedAt).toISOString(),
    completedAt: completedAt.toISOString(),
    queueWaitMs: Math.max(0, startedAt - createdAt),
    durationMs: Math.max(0, completedAt.getTime() - startedAt),
    attemptCount: Number(doc.attemptCount || 0),
    profile: String(doc.profile || 'deep_repo'),
  };
  const finalized = await AttackPathsJobModel.findByIdAndUpdate(
    jobId,
    {
      $set: { scanMetrics },
      $unset: { executionLeaseId: '', leaseExpiresAt: '' },
    },
    { new: true }
  ).exec();
  return (finalized as AttackPathsJobDoc) || null;
}

export type AttackPathsLease = {
  executionLeaseId: string;
  leaseExpiresAt: Date;
  job: AttackPathsJobDoc;
};

/** Atomically claims a queued job so an old/restarted executor cannot race a new worker. */
export async function claimAttackPathsJobLease(jobId: string): Promise<AttackPathsLease | null> {
  const now = new Date();
  const executionLeaseId = crypto.randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);
  const doc = await AttackPathsJobModel.findOneAndUpdate(
    {
      _id: jobId,
      status: { $in: DISPATCHABLE_STATUSES },
      $or: [
        { executionLeaseId: '' },
        { executionLeaseId: { $exists: false } },
        { leaseExpiresAt: null },
        { leaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        executionLeaseId,
        leaseExpiresAt,
        dispatchState: 'accepted',
        status: 'cpgraph_building',
        progressPct: 3,
        phaseMessage: 'Executor accepted the queued repository scan.',
        startedAt: now,
        queuePosition: 0,
        queueReason: '',
      },
      $inc: { attemptCount: 1 },
    },
    { new: true }
  ).exec();
  if (!doc) return null;
  return { executionLeaseId, leaseExpiresAt, job: doc as AttackPathsJobDoc };
}

export async function cancelAttackPathsJob(jobId: string, requestedBy: string): Promise<AttackPathsJobDoc | null> {
  const now = new Date();
  const doc = await AttackPathsJobModel.findOneAndUpdate(
    {
      _id: jobId,
      requestedBy,
      status: { $in: ACTIVE_STATUSES },
    },
    {
      $set: {
        status: 'cancelled',
        progressPct: 0,
        phaseMessage: 'Scan cancelled by the user.',
        lastError: '',
        completedAt: now,
        cancelRequestedAt: now,
        queuePosition: 0,
        queueReason: '',
      },
      $unset: { executionLeaseId: '', leaseExpiresAt: '' },
    },
    { new: true }
  ).exec();
  return (doc as AttackPathsJobDoc) || null;
}

export async function getAttackPathsQueuePosition(job: AttackPathsJobDoc): Promise<number> {
  if (!['warming', 'queued'].includes(String(job.status))) return 0;
  const createdAt = job.createdAt ? new Date(job.createdAt) : new Date();
  return AttackPathsJobModel.countDocuments({
    status: { $in: ACTIVE_STATUSES },
    createdAt: { $lte: createdAt },
  }).exec();
}

/** Makes expired work dispatchable again after an executor restart or lost process. */
export async function requeueExpiredAttackPathsJobs(): Promise<number> {
  const now = new Date();
  const result = await AttackPathsJobModel.updateMany(
    {
      status: { $in: ACTIVE_STATUSES.filter((status) => !DISPATCHABLE_STATUSES.includes(status as 'warming' | 'queued')) },
      // A non-dispatchable job without a lease cannot be owned by the signed
      // executor. This also recovers jobs left by the retired direct-Mongo
      // worker without racing any lease-bound executor callback.
      $or: [
        { leaseExpiresAt: { $lte: now } },
        { executionLeaseId: '' },
        { executionLeaseId: { $exists: false } },
        { leaseExpiresAt: null },
      ],
    },
    {
      $set: {
        status: 'queued',
        dispatchState: 'retrying',
        progressPct: 0,
        phaseMessage: 'Executor lease expired. Returning to the queue.',
        queueReason: 'Waiting for executor recovery.',
      },
      $unset: { executionLeaseId: '', leaseExpiresAt: '' },
    }
  ).exec();
  return Number(result.modifiedCount || 0);
}

export async function listDispatchableAttackPathsJobs(limit = 25): Promise<AttackPathsJobDoc[]> {
  const docs = await AttackPathsJobModel.find({
    status: { $in: DISPATCHABLE_STATUSES },
    $or: [
      { executionLeaseId: '' },
      { executionLeaseId: { $exists: false } },
      { leaseExpiresAt: null },
      { leaseExpiresAt: { $lte: new Date() } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(Math.min(Math.max(1, limit), maxQueuedJobs()))
    .exec();
  return docs as AttackPathsJobDoc[];
}
