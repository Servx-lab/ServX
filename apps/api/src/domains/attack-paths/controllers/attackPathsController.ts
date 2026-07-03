import type { Request, Response } from 'express';
import { z } from 'zod';

import {
  createAttackPathsJob as createAttackPathsJobService,
  getAttackPathsJobById,
  setAttackPathsJobResult,
} from '../services/attackPathsJobService';

import { getGithubToken } from '../../github/service';

const CreateJobSchema = z.object({
  body: z.object({
    repoId: z.string().min(1),
    repoFullName: z.string().min(1),
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

  try {
    const githubVault = await getGithubToken(req.user.id);

    // getGithubToken() returns PLAINTEXT accessToken (and optional expiry),
    // so we must encrypt it before persisting to the AttackPathsJob.
    const tokenPlain = (githubVault as any).accessToken;

    let githubAccessTokenEncFinal = '';
    let githubTokenIvFinal = '';
    const githubTokenExpiryFinal: Date | null = githubVault.expiry ? new Date(githubVault.expiry) : null;

    if (typeof tokenPlain === 'string' && tokenPlain.length > 0) {
      const { encrypt } = await import('@servx/crypto');
      const enc = encrypt(tokenPlain);
      githubAccessTokenEncFinal = enc.content;
      githubTokenIvFinal = enc.iv;
    }

    const job = await createAttackPathsJobService({
      requestedBy: req.user.id,
      repoId: req.body.repoId,
      repoFullName: req.body.repoFullName,
      scanTypes: req.body.scanTypes,
      analysisDepth: req.body.analysisDepth,
      deviceId: req.body.deviceId,
      idempotencyKey: req.body.idempotencyKey,
      githubAccessTokenEnc: githubAccessTokenEncFinal,
      githubTokenIv: githubTokenIvFinal,
      githubTokenExpiry: githubTokenExpiryFinal,
    });

    // v1: response returns jobId; worker execution happens asynchronously.
    // Note: ATTACK_PATHS_SYNC dev shortcut is intentionally disabled now so
    // `/attack` exercises the real worker/SSE pipeline.
    res.status(201).json({ jobId: String(job._id) });
  } catch (err: any) {
    res.status(500).json({ error: 'ServerError', message: err?.message || 'Failed to create job' });
  }
}

/**
 * Phase1: SSE stub. Streams current DB phase only (no worker wiring yet).
 * Later phases will push real progress from worker events.
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
  const pollMs = 1500;
  const started = Date.now();

  while (!closed) {
    const job = await getAttackPathsJobById(jobId);
    if (!job) {
      send('error', { message: 'Job not found' });
      break;
    }

    send('progress', {
      jobId,
      phase: job.status,
      progressPct: job.progressPct,
      statusMessage: job.phaseMessage || '',
      updatedAt: (job as any).updatedAt,
    });

    const isDone = ['completed', 'failed'].includes(String(job.status));
    if (isDone) break;

    if (Date.now() - started > 15 * 60 * 1000) {
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

  res.status(200).json({
    jobId,
    repoId: (job as any).repoId,
    repoFullName: (job as any).repoFullName,
    status: (job as any).status,
    progressPct: (job as any).progressPct,
    phaseMessage: (job as any).phaseMessage,
    results: (job as any).results,
    graphArtifact: (job as any).graphArtifact,
    reportArtifactUrl: (job as any).reportArtifactUrl,
    lastError: (job as any).lastError,
    startedAt: (job as any).startedAt,
    completedAt: (job as any).completedAt,
  });
}
