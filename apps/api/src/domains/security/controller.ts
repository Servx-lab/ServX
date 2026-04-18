import type { Request, Response, NextFunction } from 'express';

import { ValidationError } from '@servx/errors';

import { cacheGet, cacheSet } from '../../core/services/redisCache';
import { fetchRepoSecurityData } from '../../services/githubGraphScanner';
import {
  getUserInstallationToken,
  saveUserInstallationToken,
} from '../../services/githubInstallationTokenStore';
import {
  transformVulnerabilityAlerts,
  type TransformedVulnerabilityResponse,
} from '../../services/vulnerabilityTransform';

type MemoryCacheEntry = {
  expiresAt: number;
  value: TransformedVulnerabilityResponse;
};

const MEMORY_CACHE_TTL_MS = 15 * 60 * 1000;
const memoryCache = new Map<string, MemoryCacheEntry>();

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function securityCacheKey(uid: string, owner: string, repo: string): string {
  return `security:vuln:${uid.toLowerCase()}:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function readMemoryCache(key: string): TransformedVulnerabilityResponse | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeMemoryCache(key: string, value: TransformedVulnerabilityResponse): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
  });
}

export async function saveInstallationToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const uid = req.user?.uid;
  const token = String(req.body?.token || '').trim();
  const installationId = String(req.body?.installationId || '').trim();

  if (!uid) {
    next(new ValidationError('Authenticated user context is required.'));
    return;
  }
  if (!token) {
    next(new ValidationError('token is required in request body.'));
    return;
  }

  try {
    await saveUserInstallationToken(uid, token, installationId || undefined);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getRepositoryVulnerabilities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const uid = req.user?.uid;
  const owner = getSingleParam(req.params?.owner as string | string[] | undefined).trim();
  const repo = getSingleParam(req.params?.repo as string | string[] | undefined).trim();

  if (!uid) {
    next(new ValidationError('Authenticated user context is required.'));
    return;
  }
  if (!owner || !repo) {
    next(new ValidationError('Both owner and repo route params are required.'));
    return;
  }

  const cacheKey = securityCacheKey(uid, owner, repo);

  try {
    const redisCached = await cacheGet<TransformedVulnerabilityResponse>(cacheKey);
    if (redisCached) {
      res.json({ owner, repo, source: 'cache:redis', ...redisCached });
      return;
    }

    const memoryCached = readMemoryCache(cacheKey);
    if (memoryCached) {
      res.json({ owner, repo, source: 'cache:memory', ...memoryCached });
      return;
    }

    const installationToken = await getUserInstallationToken(uid);
    const raw = await fetchRepoSecurityData(owner, repo, installationToken);
    const transformed = transformVulnerabilityAlerts(raw.nodes);

    await cacheSet(cacheKey, transformed, 15 * 60);
    writeMemoryCache(cacheKey, transformed);

    res.json({
      owner,
      repo,
      uid,
      source: 'live',
      totalOpenAlertsFromGitHub: raw.totalCount,
      ...transformed,
    });
  } catch (err) {
    next(err);
  }
}
