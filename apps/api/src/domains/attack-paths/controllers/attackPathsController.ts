import type { Request, Response } from 'express';
import { z } from 'zod';
import { isAppError } from '@servx/errors';

import {
  AttackPathsConflictError,
  AttackPathsQueueFullError,
  AttackPathsQuotaError,
  cancelAttackPathsJob as cancelAttackPathsJobService,
  createAttackPathsJob as createAttackPathsJobService,
  getAttackPathsQueuePosition,
  getAttackPathsJobById,
  getLatestAttackPathsJobForUser,
  getManualRepositoryScanAllowance,
  markAttackPathsJobDispatch,
} from '../services/attackPathsJobService';
import { assertScanRepositoryAccess } from '../services/scanAuthorization';
import { cancelAttackPathsExecutorJob, dispatchAttackPathsJob, warmAttackPathsExecutor } from '../services/executorClient';
import { ATTACK_PATHS_DISABLED_MESSAGE, isAttackPathsScanningEnabled } from '../services/availability';

const CreateJobSchema = z.object({
  body: z.object({
    repoId: z.string().min(1),
    repoFullName: z.string().min(1),
    targetUrl: z.string().url().optional(),
    scanTypes: z.array(z.string()).min(1),
    analysisDepth: z.number().int().min(1).max(5),
    deviceId: z.string().optional(),
    idempotencyKey: z.string().optional(),
  }),
});

export async function createAttackPathsJob(req: Request, res: Response): Promise<void> {
  const parse = CreateJobSchema.safeParse({ body: req.body });
  if (!parse.success) {
    res.status(400).json({ error: 'BadRequest', message: 'Invalid request body', issues: parse.error.issues });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing authenticated user' });
    return;
  }

  if (!isAttackPathsScanningEnabled()) {
    res.status(503).json({ error: 'AttackPathsPaused', message: ATTACK_PATHS_DISABLED_MESSAGE });
    return;
  }

  if (parse.data.body.targetUrl) {
    res.status(400).json({
      error: 'TargetVerificationRequired',
      message: 'Live scans require a verified connected deployment and are not enabled in the repository-scan beta.',
    });
    return;
  }

  try {
    await assertScanRepositoryAccess({
      userId: req.user.id,
      repoId: parse.data.body.repoId,
      repoFullName: parse.data.body.repoFullName,
    });

    const created = await createAttackPathsJobService({
      requestedBy: req.user.id,
      repoId: parse.data.body.repoId,
      repoFullName: parse.data.body.repoFullName,
      scanTypes: parse.data.body.scanTypes,
      analysisDepth: parse.data.body.analysisDepth,
      deviceId: parse.data.body.deviceId,
      idempotencyKey: parse.data.body.idempotencyKey,
      profile: 'deep_repo',
    });

    if (!created.reused) {
      void dispatchNewJob(String(created.job._id));
    }

    const queuePosition = await getAttackPathsQueuePosition(created.job);
    res.status(created.reused ? 200 : 201).json({
      jobId: String(created.job._id),
      status: created.job.status,
      profile: 'deep_repo',
      quotaRemaining: created.quotaRemaining,
      quota: created.quota,
      queuePosition,
      createdAt: (created.job as any).createdAt,
      updatedAt: (created.job as any).updatedAt,
      startedAt: (created.job as any).startedAt,
      completedAt: (created.job as any).completedAt,
      message: created.reused ? 'Returning existing scan job.' : 'Queueing deep repository scan...',
    });
  } catch (err: any) {
    if (err instanceof AttackPathsQuotaError) {
      res.setHeader('Retry-After', '3600');
      res.status(429).json({ error: 'ScanLimitReached', message: err.message });
      return;
    }
    if (err instanceof AttackPathsConflictError) {
      res.status(409).json({ error: 'ScanAlreadyActive', message: err.message });
      return;
    }
    if (err instanceof AttackPathsQueueFullError) {
      res.setHeader('Retry-After', '300');
      res.status(429).json({ error: 'ScanQueueFull', message: err.message });
      return;
    }
    if (isAppError(err)) {
      res.status(err.statusCode).json({ error: err.code, message: err.message });
      return;
    }
    res.status(500).json({ error: 'ServerError', message: err?.message || 'Failed to create job' });
  }
}

/** Current manual-scan allowance. This is intentionally separate from a job so
 * the UI stays accurate before the user queues their next scan. */
export async function getAttackPathsQuota(req: Request, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing authenticated user' });
    return;
  }
  const quota = await getManualRepositoryScanAllowance(req.user.id);
  res.status(200).json(quota);
}

async function dispatchNewJob(jobId: string): Promise<void> {
  if (!isAttackPathsScanningEnabled()) return;
  try {
    await warmAttackPathsExecutor();
    await markAttackPathsJobDispatch(jobId, {
      state: 'accepted',
      status: 'queued',
      phaseMessage: 'Queued for the shared repository scan executor.',
    });
    await dispatchAttackPathsJob(jobId);
  } catch (error: any) {
    console.error(`[attackPaths] executor dispatch failed for ${jobId}:`, error?.message || error);
    await markAttackPathsJobDispatch(jobId, {
      state: 'retrying',
      status: 'warming',
      phaseMessage: 'Waiting for the scan executor to become available...',
    });
  }
}

export async function warmAttackPaths(req: Request, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!isAttackPathsScanningEnabled()) {
    res.status(503).json({ error: 'AttackPathsPaused', message: ATTACK_PATHS_DISABLED_MESSAGE });
    return;
  }
  try {
    await warmAttackPathsExecutor();
    res.status(202).json({ status: 'warming' });
  } catch (error: any) {
    console.warn(`[attackPaths] Executor warmup failed: ${error?.message || 'Executor unavailable.'}`);
    res.status(202).json({ status: 'warming', warning: 'Executor unavailable.' });
  }
}

export async function cancelAttackPathsJob(req: Request, res: Response): Promise<void> {
  const jobId = String(req.params.jobId || '').trim();
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!jobId) {
    res.status(400).json({ error: 'BadRequest', message: 'Missing jobId' });
    return;
  }

  const job = await cancelAttackPathsJobService(jobId, req.user.id);
  if (!job) {
    res.status(409).json({ error: 'JobNotCancellable', message: 'This scan is no longer queued or running.' });
    return;
  }

  void cancelAttackPathsExecutorJob(jobId).catch((error: any) => {
    console.warn(`[attackPaths] executor cancellation request failed for ${jobId}:`, error?.message || error);
  });
  res.status(202).json({
    jobId,
    status: 'cancelled',
    phaseMessage: 'Scan cancelled by the user.',
  });
}

/**
 * Streams progress from persisted job state.
 */
export async function streamAttackPathsJobProgress(req: Request, res: Response): Promise<void> {
  const jobId = String(req.params.jobId || '');
  if (!jobId) {
    res.status(400).json({ error: 'BadRequest', message: 'Missing jobId' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // @ts-ignore
  res.flushHeaders?.();

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  const send = (event: string, data: any) => {
    if (closed) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send a single snapshot and keep-alive polling until completed/failed.
  // Polling every 3s (rather than 1.5s) roughly halves MongoDB load for
  // long-running scans without a noticeable UX difference.
  const pollMs = 3000;
  const started = Date.now();

  while (!closed) {
    const job = await getAttackPathsJobById(jobId);
    if (!job) {
      send('error', { message: 'Job not found' });
      break;
    }

    // Queue position only matters while the job is still queued/warming; once
    // it starts running there's no need to keep querying for it on every tick.
    const needsQueuePosition = ['queued', 'warming'].includes(String(job.status));
    const queuePosition = needsQueuePosition ? await getAttackPathsQueuePosition(job) : 0;
    send('progress', {
      jobId,
      phase: job.status,
      status: job.status,
      progressPct: job.progressPct,
      statusMessage: job.phaseMessage || '',
      lastError: (job as any).lastError || '',
      createdAt: (job as any).createdAt,
      updatedAt: (job as any).updatedAt,
      startedAt: (job as any).startedAt,
      completedAt: (job as any).completedAt,
      queuePosition,
      queueReason: (job as any).queueReason || '',
    });

    const isDone = ['completed', 'cancelled', 'failed'].includes(String(job.status));
    if (isDone) {
      const terminalEvent = String(job.status) === 'completed' ? 'completed' : String(job.status) === 'cancelled' ? 'cancelled' : 'failed';
      send(terminalEvent, {
        jobId,
        phase: job.status,
        status: job.status,
        progressPct: job.progressPct,
        statusMessage: job.phaseMessage || '',
        lastError: (job as any).lastError || '',
        createdAt: (job as any).createdAt,
        updatedAt: (job as any).updatedAt,
        startedAt: (job as any).startedAt,
        completedAt: (job as any).completedAt,
        queuePosition: 0,
        queueReason: '',
      });
      break;
    }

    if (Date.now() - started > 110 * 60 * 1000) {
      send('error', { message: 'SSE timeout' });
      break;
    }

    await new Promise(r => setTimeout(r, pollMs));
  }

  res.end();
}

export async function getAttackPathsJobResult(req: Request, res: Response): Promise<void> {
  const jobId = String(req.params.jobId || '');
  if (!jobId) {
    res.status(400).json({ error: 'BadRequest', message: 'Missing jobId' });
    return;
  }

  const job = await getAttackPathsJobById(jobId);
  if (!job) {
    res.status(404).json({ error: 'NotFound', message: 'Attack paths job not found' });
    return;
  }

  const [queuePosition, quota] = await Promise.all([
    getAttackPathsQueuePosition(job),
    getManualRepositoryScanAllowance((job as any).requestedBy),
  ]);
  res.status(200).json({
    jobId,
    repoId: (job as any).repoId,
    repoFullName: (job as any).repoFullName,
    targetUrl: (job as any).targetUrl,
    status: (job as any).status,
    profile: (job as any).profile || 'deep_repo',
    dispatchState: (job as any).dispatchState || 'pending',
    queuePosition,
    queueReason: (job as any).queueReason || '',
    progressPct: (job as any).progressPct,
    phaseMessage: (job as any).phaseMessage,
    results: (job as any).results,
    findings: (job as any).results,
    scanArtifacts: (job as any).scanArtifacts || [],
    toolStatuses: (job as any).toolStatuses || [],
    graphArtifact: (job as any).graphArtifact,
    reportArtifactUrl: (job as any).reportArtifactUrl,
    assuranceSummary: (job as any).assuranceSummary || {},
    scanMetrics: (job as any).scanMetrics || {},
    lastError: (job as any).lastError,
    createdAt: (job as any).createdAt,
    updatedAt: (job as any).updatedAt,
    startedAt: (job as any).startedAt,
    completedAt: (job as any).completedAt,
    quotaRemaining: quota.remaining,
    quota,
  });
}

/** The browser uses this after a refresh or revisit; ownership is enforced in the query. */
export async function getLatestAttackPathsJobResult(req: Request, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const repoFullName = typeof req.query.repoFullName === 'string' && req.query.repoFullName.trim()
    ? req.query.repoFullName.trim()
    : undefined;

  const job = await getLatestAttackPathsJobForUser(req.user.id, repoFullName);
  if (!job) {
    res.status(200).json({ found: false, message: 'No Attack Paths scans found.' });
    return;
  }
  const [queuePosition, quota] = await Promise.all([
    getAttackPathsQueuePosition(job),
    getManualRepositoryScanAllowance(req.user.id),
  ]);
  res.status(200).json({
    jobId: String((job as any)._id),
    repoId: (job as any).repoId,
    repoFullName: (job as any).repoFullName,
    targetUrl: (job as any).targetUrl,
    status: (job as any).status,
    profile: (job as any).profile || 'deep_repo',
    dispatchState: (job as any).dispatchState || 'pending',
    queuePosition,
    queueReason: (job as any).queueReason || '',
    progressPct: (job as any).progressPct,
    phaseMessage: (job as any).phaseMessage,
    results: (job as any).results,
    findings: (job as any).results,
    scanArtifacts: (job as any).scanArtifacts || [],
    toolStatuses: (job as any).toolStatuses || [],
    graphArtifact: (job as any).graphArtifact,
    reportArtifactUrl: (job as any).reportArtifactUrl,
    assuranceSummary: (job as any).assuranceSummary || {},
    scanMetrics: (job as any).scanMetrics || {},
    lastError: (job as any).lastError,
    createdAt: (job as any).createdAt,
    updatedAt: (job as any).updatedAt,
    startedAt: (job as any).startedAt,
    completedAt: (job as any).completedAt,
    quotaRemaining: quota.remaining,
    quota,
  });
}
