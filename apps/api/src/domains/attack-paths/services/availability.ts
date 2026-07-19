/**
 * An intentionally simple, deployment-wide emergency stop. It blocks new
 * admissions and executor dispatches without changing historical results or
 * force-killing work already in progress. Set it in the API environment and
 * redeploy/restart the API to take effect.
 */
export function isAttackPathsScanningEnabled(): boolean {
  const value = String(process.env.ATTACK_PATHS_KILL_SWITCH || '').trim().toLowerCase();
  return !['1', 'true', 'yes', 'on'].includes(value);
}

export const ATTACK_PATHS_DISABLED_MESSAGE =
  'Repository scanning is temporarily paused by ServX operations. Please try again later.';
