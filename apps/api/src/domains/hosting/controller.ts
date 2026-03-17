import type { Request, Response, NextFunction } from 'express';

import { FRONTEND_URL } from '@servx/config';

import {
  getVercelOAuthUrl,
  exchangeVercelCode,
  getDigitalOceanOAuthUrl,
} from './service';

// ─── Redirect helpers ─────────────────────────────────────────────────────────

function redirectSuccess(
  res: Response,
  path: string,
  params: Record<string, string>
): void {
  const qs = new URLSearchParams(params).toString();
  res.redirect(`${FRONTEND_URL}${path}?${qs}`);
}

function redirectError(res: Response, path: string, errorCode: string): void {
  res.redirect(`${FRONTEND_URL}${path}?error=${errorCode}`);
}

// ─── Route handlers ───────────────────────────────────────────────────────────

interface AuthenticatedRequest extends Request {
  user: { uid: string };
}

// GET /api/oauth/vercel
export async function startVercelOAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const url = await getVercelOAuthUrl(req.user.uid);
    if (url === 'mock') {
      redirectSuccess(res, '/infrastructure', { vercel_connected: 'true', mock: 'true' });
      return;
    }
    res.redirect(url);
  } catch (err) {
    console.error('Vercel OAuth Setup Error:', (err as Error).message);
    redirectError(res, '/infrastructure', 'vercel_setup_failed');
  }
}

// GET /api/oauth/vercel/callback
export async function handleVercelCallback(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { code, owner_uid: ownerUid } = req.query as {
    code?: string;
    owner_uid?: string;
  };
  const targetOwnerUid = ownerUid ?? 'mock-user-123';

  if (!code) {
    redirectError(res, '/infrastructure', 'no_code');
    return;
  }

  try {
    const accessToken = await exchangeVercelCode(code, targetOwnerUid);
    console.log('Vercel Auth Success for uid:', targetOwnerUid, '— token length:', accessToken?.length);
    redirectSuccess(res, '/infrastructure', { vercel_connected: 'true' });
  } catch (err) {
    const axiosErr = err as any;
    console.error('Vercel OAuth Error:', axiosErr.response?.data ?? (err as Error).message);
    redirectError(res, '/infrastructure', 'vercel_auth_failed');
  }
}

// GET /api/oauth/digitalocean
export function startDigitalOceanOAuth(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const url = getDigitalOceanOAuthUrl();
  if (!url) {
    redirectSuccess(res, '/infrastructure', { digitalocean_connected: 'true', mock: 'true' });
    return;
  }
  res.redirect(url);
}

// GET /api/oauth/digitalocean/callback
export function handleDigitalOceanCallback(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  redirectSuccess(res, '/infrastructure', { digitalocean_connected: 'true' });
}

// GET /api/oauth/railway
export function startRailwayOAuth(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Railway does not have a public OAuth flow — use API tokens via the connections domain.
  redirectSuccess(res, '/infrastructure', { railway_connected: 'true', mock: 'true' });
}
