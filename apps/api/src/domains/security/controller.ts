import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@servx/errors';
import * as svc from './service';
import { scanLiveDeployment } from '../../services/dastScanner';
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

// Local memory cache removed in favor of redisCache.ts integrated RAM layer.

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function securityCacheKey(uid: string, owner: string, repo: string): string {
  return `security:vuln:${uid.toLowerCase()}:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

/**
 * Trigger a dynamic target scan for a given URL.
 */
export async function scanTarget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url } = req.body;

    if (!url) {
      throw new ValidationError('A target URL is required for scanning.');
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid target URL format.');
    }

    console.log(`[Security] Triggering scan for: ${url} (User: ${req.user?.id})`);
    
    // Perform the scan
    const findings = await scanLiveDeployment(url);

    res.json({
      success: true,
      url,
      timestamp: new Date().toISOString(),
      score: findings.length === 0 ? 100 : Math.max(0, 100 - findings.length * 20),
      findings
    });
  } catch (err) {
    next(err);
  }
}

export async function saveInstallationToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const uid = req.user?.id;
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
  const uid = req.user?.id;
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
      res.setHeader('X-Cache-Status', 'HIT');
      res.json({ owner, repo, source: 'cache:redis', ...redisCached });
      return;
    }

    const installationToken = await getUserInstallationToken(uid);
    const raw = await fetchRepoSecurityData(owner, repo, installationToken);
    const transformed = transformVulnerabilityAlerts(raw.nodes);

    await cacheSet(cacheKey, transformed, 15 * 60);

    res.setHeader('X-Cache-Status', 'MISS');
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

/**
 * Fetch all project groups for the authenticated user.
 */
export async function listGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await svc.getUserProjectGroups(req.user?.id || '');
    res.json(groups);
  } catch (err) {
    next(err);
  }
}

/**
 * Create or update a project group.
 */
export async function saveGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const group = await svc.saveProjectGroup(req.user?.id || '', req.body);
    res.json(group);
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a project group.
 */
export async function deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await svc.deleteProjectGroup(req.user?.id || '', String(id));
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (err) {
    next(err);
  }
}
