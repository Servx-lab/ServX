import type { Document } from 'mongoose';
import AttackPathsJobModel from '../../../../models/AttackPathsJob';

export type AttackPathsJobDoc = Document & {
  _id: any;
  requestedBy: string;

  repoId: string;
  repoFullName: string;

  scanTypes: string[];
  analysisDepth: number;

  status: string;
  progressPct: number;

  phaseMessage?: string;

  // encrypted GitHub token materialization for worker
  githubAccessTokenEnc?: string;
  githubTokenIv?: string;
  githubTokenExpiry?: Date | null;

  results: any;
  graphArtifact: any;
  reportArtifactUrl: string;

  createdAt?: Date;
  updatedAt?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;

  lastError?: string;
};

export async function createAttackPathsJob(params: {
  requestedBy: string;
  repoId: string;
  repoFullName: string;
  scanTypes: string[];
  analysisDepth: number;
  deviceId?: string;
  idempotencyKey?: string;

  githubAccessTokenEnc?: string;
  githubTokenIv?: string;
  githubTokenExpiry?: Date | null;
}): Promise<AttackPathsJobDoc> {
  // v1: simple insert; dedupe can be added by idempotencyKey later
  const doc = await AttackPathsJobModel.create({
    requestedBy: params.requestedBy,
    repoId: params.repoId,
    repoFullName: params.repoFullName,
    scanTypes: params.scanTypes,
    analysisDepth: params.analysisDepth,
    deviceId: params.deviceId || '',
    idempotencyKey: params.idempotencyKey || '',
    status: 'queued',
    progressPct: 0,
    phaseMessage: 'Queued',
    startedAt: null,
    completedAt: null,

    githubAccessTokenEnc: params.githubAccessTokenEnc || '',
    githubTokenIv: params.githubTokenIv || '',
    githubTokenExpiry: params.githubTokenExpiry ?? null,

    results: {},
    graphArtifact: null,
    reportArtifactUrl: '',
    lastError: '',
  });

  return doc as AttackPathsJobDoc;
}

export async function getAttackPathsJobById(jobId: string): Promise<AttackPathsJobDoc | null> {
  const doc = await AttackPathsJobModel.findById(jobId).exec();
  return (doc as AttackPathsJobDoc) || null;
}

export async function updateAttackPathsJobProgress(jobId: string, update: {
  status?: string;
  progressPct?: number;
  phaseMessage?: string;
}): Promise<AttackPathsJobDoc | null> {
  const doc = await AttackPathsJobModel.findByIdAndUpdate(
    jobId,
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

export async function setAttackPathsJobResult(jobId: string, update: {
  status: string;
  progressPct: number;
  phaseMessage: string;
  results: any;
  graphArtifact: any;
  reportArtifactUrl: string;
  failedScanners?: any[];
  lastError?: string;
}): Promise<AttackPathsJobDoc | null> {
  const doc = await AttackPathsJobModel.findByIdAndUpdate(
    jobId,
    {
      $set: {
        status: update.status,
        progressPct: update.progressPct,
        phaseMessage: update.phaseMessage,
        results: update.results,
        graphArtifact: update.graphArtifact,
        reportArtifactUrl: update.reportArtifactUrl,
        lastError: update.lastError || '',
        completedAt: new Date(),
      }
    },
    { new: true }
  ).exec();

  return (doc as AttackPathsJobDoc) || null;
}
