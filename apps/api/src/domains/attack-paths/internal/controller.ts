import type { Request, Response } from 'express';
import { z } from 'zod';
import { getGithubToken } from '../../github/service';
import {
  claimAttackPathsJobLease,
  failAttackPathsJob,
  getAttackPathsJobById,
  setAttackPathsJobResult,
  updateAttackPathsJobProgress,
} from '../services/attackPathsJobService';

const progressSchema = z.object({
  executionLeaseId: z.string().uuid(),
  status: z.string().min(1).max(64),
  progressPct: z.number().min(0).max(100),
  phaseMessage: z.string().min(1).max(500),
});

const completionSchema = z.object({
  executionLeaseId: z.string().uuid(),
  status: z.literal('completed'),
  progressPct: z.literal(100),
  phaseMessage: z.string().min(1).max(500),
  results: z.array(z.unknown()).max(5_000),
  scanArtifacts: z.array(z.unknown()).optional(),
  toolStatuses: z.array(z.unknown()).max(100).optional(),
  graphArtifact: z.unknown().nullable(),
  reportArtifactUrl: z.string().max(2_000).optional(),
  lastError: z.string().max(4_000).optional(),
  assuranceSummary: z.unknown().optional(),
});

const failureSchema = z.object({
  executionLeaseId: z.string().uuid(),
  lastError: z.string().min(1).max(4_000),
  progressPct: z.number().min(0).max(100).optional(),
});

function jobId(req: Request): string {
  return String(req.params.jobId || '').trim();
}

export async function getRemoteJobInput(req: Request, res: Response): Promise<void> {
  const id = jobId(req);
  const initialJob = id ? await getAttackPathsJobById(id) : null;
  if (!initialJob) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  if (['completed', 'cancelled', 'failed'].includes(String(initialJob.status))) {
    res.status(409).json({ error: 'JobNotDispatchable' });
    return;
  }

  const lease = await claimAttackPathsJobLease(id);
  if (!lease) {
    res.status(409).json({ error: 'JobLeaseUnavailable' });
    return;
  }
  const job = lease.job;

  try {
    const { accessToken } = await getGithubToken(String(job.requestedBy));
    res.status(200).json({
      input: {
        jobId: id,
        repoId: String(job.repoId),
        repoFullName: String(job.repoFullName),
        targetUrl: String(job.targetUrl || ''),
        scanTypes: Array.isArray(job.scanTypes) ? job.scanTypes : [],
        analysisDepth: Number(job.analysisDepth || 2),
        profile: String((job as any).profile || 'deep_repo'),
        executionLeaseId: lease.executionLeaseId,
        leaseExpiresAt: lease.leaseExpiresAt.toISOString(),
        githubAccessToken: accessToken,
      },
    });
  } catch (error: any) {
    await failAttackPathsJob(id, {
      executionLeaseId: lease.executionLeaseId,
      lastError: 'GitHub access is no longer available for this repository scan.',
      progressPct: 0,
    });
    res.status(409).json({ error: 'GitHubAccessUnavailable', message: error?.message || 'GitHub access is unavailable.' });
  }
}

export async function updateRemoteJobProgress(req: Request, res: Response): Promise<void> {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BadRequest' });
    return;
  }
  const job = await updateAttackPathsJobProgress(jobId(req), parsed.data, parsed.data.executionLeaseId);
  if (!job) {
    res.status(409).json({ error: 'JobLeaseRejected' });
    return;
  }
  res.status(204).end();
}

export async function completeRemoteJob(req: Request, res: Response): Promise<void> {
  const parsed = completionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BadRequest' });
    return;
  }
  const job = await setAttackPathsJobResult(jobId(req), {
    status: 'completed',
    progressPct: 100,
    phaseMessage: parsed.data.phaseMessage!,
    results: parsed.data.results!,
    scanArtifacts: [],
    toolStatuses: parsed.data.toolStatuses,
    graphArtifact: parsed.data.graphArtifact!,
    reportArtifactUrl: parsed.data.reportArtifactUrl || '',
    lastError: parsed.data.lastError,
    assuranceSummary: parsed.data.assuranceSummary,
    executionLeaseId: parsed.data.executionLeaseId,
  });
  if (!job) {
    res.status(409).json({ error: 'JobLeaseRejected' });
    return;
  }
  res.status(204).end();
}

export async function failRemoteJob(req: Request, res: Response): Promise<void> {
  const parsed = failureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'BadRequest' });
    return;
  }
  const job = await failAttackPathsJob(jobId(req), {
    lastError: parsed.data.lastError!,
    progressPct: parsed.data.progressPct,
    executionLeaseId: parsed.data.executionLeaseId,
  });
  if (!job) {
    res.status(409).json({ error: 'JobLeaseRejected' });
    return;
  }
  res.status(204).end();
}
