import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { getRedisClient } from '../../../core/services/redisCache';

const CLOCK_SKEW_SECONDS = 5 * 60;
const NONCE_TTL_SECONDS = 10 * 60;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(params: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  contentSha256: string;
}): string {
  return [params.method.toUpperCase(), params.path, params.timestamp, params.nonce, params.contentSha256].join('\n');
}

function sign(params: {
  secret: string;
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  contentSha256: string;
}): string {
  return crypto.createHmac('sha256', params.secret).update(canonical(params)).digest('hex');
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function header(req: Request, name: string): string {
  return req.header(name)?.trim() || '';
}

export function executorClientConfigured(): boolean {
  return Boolean(
    process.env.ATTACK_PATHS_EXECUTOR_URL?.trim() &&
    process.env.ATTACK_PATHS_EXECUTOR_INBOUND_HMAC_SECRET?.trim() &&
    process.env.ATTACK_PATHS_EXECUTOR_INBOUND_KEY_ID?.trim()
  );
}

export function executorCallbackAuthConfigured(): boolean {
  return Boolean(
    process.env.ATTACK_PATHS_EXECUTOR_OUTBOUND_HMAC_SECRET?.trim() &&
    process.env.ATTACK_PATHS_EXECUTOR_OUTBOUND_KEY_ID?.trim()
  );
}

export function makeExecutorHeaders(params: {
  method: string;
  path: string;
  body?: string;
}): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const contentSha256 = sha256(params.body || '');
  const signature = sign({
    secret: requiredEnv('ATTACK_PATHS_EXECUTOR_INBOUND_HMAC_SECRET'),
    method: params.method,
    path: params.path,
    timestamp,
    nonce,
    contentSha256,
  });

  return {
    Authorization: 'ServX-HMAC v1',
    'X-ServX-Key-Id': requiredEnv('ATTACK_PATHS_EXECUTOR_INBOUND_KEY_ID'),
    'X-ServX-Timestamp': timestamp,
    'X-ServX-Nonce': nonce,
    'X-ServX-Content-SHA256': contentSha256,
    'X-ServX-Signature': `v1=${signature}`,
  };
}

/** Rejects unsigned or replayed callbacks sent by the remote executor. */
export async function requireExecutorServiceAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const timestamp = header(req, 'X-ServX-Timestamp');
    const nonce = header(req, 'X-ServX-Nonce');
    const contentSha256 = header(req, 'X-ServX-Content-SHA256');
    const signatureHeader = header(req, 'X-ServX-Signature');
    const keyId = header(req, 'X-ServX-Key-Id');
    const authorization = header(req, 'Authorization');
    const expectedKeyId = requiredEnv('ATTACK_PATHS_EXECUTOR_OUTBOUND_KEY_ID');

    if (
      authorization !== 'ServX-HMAC v1' ||
      keyId !== expectedKeyId ||
      !timestamp ||
      !nonce ||
      !contentSha256 ||
      !signatureHeader.startsWith('v1=')
    ) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > CLOCK_SKEW_SECONDS) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const rawBody = (req as Request & { rawBody?: string }).rawBody || '';
    if (!safeEqual(contentSha256, sha256(rawBody))) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const expectedSignature = sign({
      secret: requiredEnv('ATTACK_PATHS_EXECUTOR_OUTBOUND_HMAC_SECRET'),
      method: req.method,
      path: req.originalUrl.split('?')[0],
      timestamp,
      nonce,
      contentSha256,
    });
    if (!safeEqual(signatureHeader.slice(3), expectedSignature)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const redis = await getRedisClient();
    if (!redis) {
      res.status(503).json({ error: 'ReplayProtectionUnavailable' });
      return;
    }
    const stored = await redis.set(`attack-paths:nonce:${keyId}:${nonce}`, '1', {
      NX: true,
      EX: NONCE_TTL_SECONDS,
    });
    if (stored !== 'OK') {
      res.status(409).json({ error: 'ReplayRejected' });
      return;
    }

    next();
  } catch (error) {
    console.error('[attackPaths.serviceAuth] callback rejected:', error);
    res.status(503).json({ error: 'ServiceAuthUnavailable' });
  }
}
