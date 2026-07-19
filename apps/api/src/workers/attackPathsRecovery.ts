import {
  listDispatchableAttackPathsJobs,
  markAttackPathsJobDispatch,
  requeueExpiredAttackPathsJobs,
} from '../domains/attack-paths/services/attackPathsJobService';
import {
  dispatchAttackPathsJob,
  warmAttackPathsExecutor,
} from '../domains/attack-paths/services/executorClient';
import { executorClientConfigured } from '../domains/attack-paths/services/serviceAuth';
import { isAttackPathsScanningEnabled } from '../domains/attack-paths/services/availability';

const RECOVERY_INTERVAL_MS = 60_000;
let timer: NodeJS.Timeout | undefined;
let isRecovering = false;

async function recoverOnce(): Promise<void> {
  if (isRecovering || !executorClientConfigured() || !isAttackPathsScanningEnabled()) return;
  isRecovering = true;

  try {
    const expired = await requeueExpiredAttackPathsJobs();
    if (expired > 0) {
      console.warn(`[attackPathsRecovery] requeued ${expired} expired scan lease(s)`);
    }

    const jobs = await listDispatchableAttackPathsJobs();
    if (jobs.length === 0) return;

    await warmAttackPathsExecutor();
    for (const job of jobs) {
      const jobId = String(job._id);
      try {
        await markAttackPathsJobDispatch(jobId, {
          state: 'accepted',
          status: 'queued',
          phaseMessage: 'Queued for the shared repository scan executor.',
        });
        await dispatchAttackPathsJob(jobId);
      } catch (error: any) {
        console.warn(`[attackPathsRecovery] dispatch failed for ${jobId}:`, error?.message || error);
        await markAttackPathsJobDispatch(jobId, {
          state: 'retrying',
          status: 'warming',
          phaseMessage: 'Waiting for the scan executor to become available...',
        });
      }
    }
  } catch (error: any) {
    console.error('[attackPathsRecovery] recovery pass failed:', error?.message || error);
  } finally {
    isRecovering = false;
  }
}

/** Starts idempotent recovery of work that survived an executor/API restart. */
export function startAttackPathsRecovery(): void {
  if (timer) return;
  void recoverOnce();
  timer = setInterval(() => void recoverOnce(), RECOVERY_INTERVAL_MS);
  timer.unref?.();
}
