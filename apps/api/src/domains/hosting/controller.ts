import type { Request, Response, NextFunction } from 'express';

import { FRONTEND_URL, HOSTING_PROVIDERS } from '@servx/config';
import { ValidationError, NotFoundError } from '@servx/errors';

import {
  getVercelOAuthUrl,
  exchangeVercelCode,
  getDigitalOceanOAuthUrl,
  getGlobalFailureHistory,
} from './service';
import { saveHostingToken, deleteConnection } from '../connections/service';
import { supabaseAdmin } from '../../utils/supabaseAdmin';

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



// GET /api/oauth/vercel
export async function startVercelOAuth(
  req: any,
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
    
    // Fetch user email for saveHostingToken (needed by ensureUserProfile)
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(targetOwnerUid);
    const email = user?.user?.email ?? 'oauth-user@servx.app';

    await saveHostingToken(
        targetOwnerUid,
        email,
        'vercel',
        'Vercel Account',
        'Default',
        accessToken
    );

    console.log('Vercel Auth Success and saved for uid:', targetOwnerUid);
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

// GET /api/hosting/failures/history
export async function getFailuresHistory(req: any, res: Response, next: NextFunction) {
  try {
    const history = await getGlobalFailureHistory(req.user.uid);
    res.json({ history });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/hosting/disconnect
export async function disconnectHosting(req: any, res: Response, next: NextFunction) {
  try {
    const providerKey = req.query.provider as string;
    if (!providerKey) {
      throw new ValidationError('Provider query parameter is required');
    }
    const providerInfo = HOSTING_PROVIDERS[providerKey.toLowerCase()];
    if (!providerInfo) {
      throw new ValidationError(`Unknown provider: ${providerKey}`);
    }

    // Find connection in hosting_vault
    const { data: connections, error } = await supabaseAdmin
      .from('hosting_vault')
      .select('id')
      .eq('user_id', req.user.uid)
      .eq('provider', providerInfo.dbName);

    if (error) {
      throw error;
    }

    if (connections && connections.length > 0) {
      await deleteConnection(connections[0].id, req.user.uid);
    }

    res.json({ message: `${providerInfo.label} disconnected successfully` });
  } catch (err) {
    next(err);
  }
}
