import type { Response, NextFunction } from 'express';

import { ValidationError } from '@servx/errors';

import {
  runScan,
  getExposureSummary,
  getFindings,
  getAssets,
  addManualAsset,
  type ExposureAssetType,
} from './service';

// Basic domain validation to prevent scanning arbitrary/malformed input.
const DOMAIN_RE = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})+$/;
const VALID_ASSET_TYPES: ExposureAssetType[] = ['DOMAIN', 'SUBDOMAIN', 'IP', 'BUCKET'];

// GET /api/exposure/summary
export async function getSummary(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await getExposureSummary(req.user.uid);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

// GET /api/exposure/findings?category=critical
export async function listFindings(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const findings = await getFindings(req.user.uid, category);
    res.json({ findings });
  } catch (err) {
    next(err);
  }
}

// GET /api/exposure/assets
export async function listAssets(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const assets = await getAssets(req.user.uid);
    res.json({ assets });
  } catch (err) {
    next(err);
  }
}

// POST /api/exposure/scan  { domain }
export async function startScan(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const domain = String(req.body?.domain ?? '').trim().toLowerCase();
    if (!domain || !DOMAIN_RE.test(domain)) {
      throw new ValidationError('A valid root domain is required (e.g. "company.com").');
    }
    // Fire-and-forget: return immediately, stream progress via SSE audit feed.
    const result = await runScan(req.user.uid, req.user.email, domain);
    res.status(202).json({ message: 'Scan complete', ...result });
  } catch (err) {
    next(err);
  }
}

// POST /api/exposure/assets  { assetType, value }
export async function createAsset(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const assetType = String(req.body?.assetType ?? '').toUpperCase() as ExposureAssetType;
    const value = String(req.body?.value ?? '').trim();
    if (!VALID_ASSET_TYPES.includes(assetType)) {
      throw new ValidationError(`assetType must be one of: ${VALID_ASSET_TYPES.join(', ')}`);
    }
    if (!value) {
      throw new ValidationError('Asset value is required.');
    }
    const asset = await addManualAsset(req.user.uid, assetType, value);
    res.status(201).json({ asset });
  } catch (err) {
    next(err);
  }
}
