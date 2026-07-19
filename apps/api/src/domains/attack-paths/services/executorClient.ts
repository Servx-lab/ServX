import { executorClientConfigured, makeExecutorHeaders } from './serviceAuth';

function executorBaseUrl(): string {
  const value = process.env.ATTACK_PATHS_EXECUTOR_URL?.trim().replace(/\/+$/, '');
  if (!value) throw new Error('ATTACK_PATHS_EXECUTOR_URL is required');
  return value;
}

async function executorRequest(path: string, init: RequestInit): Promise<void> {
  if (!executorClientConfigured()) throw new Error('Attack Paths executor is not configured');

  const body = typeof init.body === 'string' ? init.body : '';
  const headers = new Headers(init.headers);
  const signed = makeExecutorHeaders({ method: init.method || 'GET', path, body });
  Object.entries(signed).forEach(([key, value]) => headers.set(key, value));
  if (body) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${executorBaseUrl()}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Executor request ${path} failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
}

export async function warmAttackPathsExecutor(): Promise<void> {
  await executorRequest('/internal/v1/wake', { method: 'POST', body: '{}' });
}

export async function dispatchAttackPathsJob(jobId: string): Promise<void> {
  await executorRequest(`/internal/v1/jobs/${encodeURIComponent(jobId)}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  });
}

export async function cancelAttackPathsExecutorJob(jobId: string): Promise<void> {
  await executorRequest(`/internal/v1/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  });
}
