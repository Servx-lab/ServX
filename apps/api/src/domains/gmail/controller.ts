import type { Request, Response, NextFunction } from 'express';

import { AuthError } from '@servx/errors';
import { FRONTEND_URL } from '@servx/config';

import * as gmailService from './service';
import type { GmailStatusResponse } from './types';



export function getGoogleAuthUrl(req: any, res: Response): void {
  const url = gmailService.getAuthUrl(req.user.uid);
  res.json({ url });
}

export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    res.redirect(`${FRONTEND_URL}/emails?error=oauth_failed`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}/emails?error=missing_code_or_state`);
    return;
  }

  try {
    await gmailService.handleOAuthCallback(code, state);
    res.redirect(`${FRONTEND_URL}/emails?success=true`);
  } catch (err) {
    if ((err as Error).message === 'no_refresh_token') {
      res.redirect(`${FRONTEND_URL}/emails?error=no_refresh_token`);
      return;
    }
    res.redirect(`${FRONTEND_URL}/emails?error=callback_failed`);
  }
}

export async function getGmailStatus(
  req: any,
  res: Response<GmailStatusResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const connected = await gmailService.getConnectionStatus(req.user.uid);
    res.json({ connected });
  } catch (err) {
    next(err);
  }
}

export async function getInbox(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emails = await gmailService.getInboxMessages(req.user.uid);
    res.json(emails);
  } catch (err) {
    const message = (err as Error).message || '';

    if (message === 'gmail_not_connected') {
      next(new AuthError('Gmail not connected'));
      return;
    }

    if (message.includes('invalid_grant')) {
      await gmailService.disconnectGmail(req.user.uid);
      next(new AuthError('Gmail authentication expired. Please reconnect.'));
      return;
    }

    if ((err as any)?.code === 401) {
      await gmailService.disconnectGmail(req.user.uid);
      next(new AuthError('Gmail authentication expired. Please reconnect.'));
      return;
    }

    next(err);
  }
}
