import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthError, ValidationError } from '@servx/errors';
import { encrypt } from '@servx/crypto';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import {
  logNewUserToSheetService,
  sendServXAlert,
} from './service';
import { cacheDelPattern } from '../../core/services/redisCache';
import { userGhCachePattern } from '../github/controller';

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export function getGitHubAuthUrl(req: any, res: any): void {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const ownerId = req.user.id;

  if (!clientId) {
    throw new AuthError('GitHub Client ID not configured');
  }

  const state = encodeURIComponent(JSON.stringify({ ownerId }));
  const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&state=${state}`;

  res.json({ url: authorizeUrl });
}

export function redirectToGitHub(req: any, res: any): void {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const ownerId = req.user.id;

  const state = encodeURIComponent(JSON.stringify({ ownerId }));
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&state=${state}`;

  res.redirect(redirectUri);
}

export async function handleGitHubCallback(req: any, res: any, next: any): Promise<void> {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  let ownerId: string | null = null;

  if (state) {
    try {
      const decodedState = JSON.parse(decodeURIComponent(state)) as { ownerId?: string };
      ownerId = decodedState.ownerId || null;
    } catch (error) {
      console.error('Failed to parse OAuth state:', (error as Error).message);
    }
  }

  if (!code) {
    res.redirect(`${FRONTEND_URL}/github?error=no_code_provided`);
    return;
  }

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const { 
      access_token: accessToken, 
      refresh_token: refreshToken, 
      expires_in: expiresIn 
    } = tokenResponse.data;

    if (!accessToken) {
      throw new AuthError(
        `Failed to obtain access token from GitHub: ${tokenResponse.data.error_description || tokenResponse.data.error || 'Unknown error'}`
      );
    }

    const expiryDate = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    const userProfileResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = userProfileResponse.data as {
      id: number;
      email?: string;
      name?: string;
      login: string;
      avatar_url?: string;
    };

    const targetUid = ownerId || `legacy-${profile.id}`;

    // 1. Update or Create User Profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
            id: targetUid,
            email: profile.email || `${profile.login}@users.noreply.github.com`,
            display_name: profile.name || profile.login,
            avatar_url: profile.avatar_url,
        })
        .select()
        .single();

    if (profileError) throw profileError;

    // 2. Encrypt and store tokens in GitHub Vault
    const encryptedAccess = encrypt(accessToken);
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

    const { error: vaultError } = await supabaseAdmin
        .from('github_vault')
        .upsert({
            user_id: targetUid,
            github_id: profile.id.toString(),
            github_username: profile.login,
            encrypted_access_token: encryptedAccess.content,
            encrypted_refresh_token: encryptedRefresh?.content,
            iv: encryptedAccess.iv,
            token_expiry: expiryDate,
        });

    if (vaultError) throw vaultError;

    // New User Logging Pipeline: Sheet + Admin Alert
    try {
        await logNewUserToSheetService({ uid: targetUid, email: userProfile.email });
    } catch (sheetErr) {
        console.error('[Auth] GitHub Sheet log failed:', (sheetErr as Error).message);
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    if (ADMIN_EMAIL) {
        try {
            await sendServXAlert(
                ADMIN_EMAIL,
                'User GitHub Linked',
                `<h1>GitHub Linked</h1><p><b>Email:</b> ${userProfile.email}</p><p><b>UID:</b> ${targetUid}</p>`
            );
        } catch (emailErr) {
            console.error('[Auth] Admin alert failed:', (emailErr as Error).message);
        }
    }

    res.redirect(`${FRONTEND_URL}/github?success=true`);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'auth_failed';
    res.redirect(`${FRONTEND_URL}/github?error=auth_failed&details=${encodeURIComponent(details)}`);
    next(error);
  }
}

export async function syncUser(req: any, res: any, next: any): Promise<void> {
  try {
    const { id, email } = req.user;
    const { 
      name, 
      avatarUrl, 
      githubAccessToken, 
      githubRefreshToken,
      githubTokenExpiry,
      githubId 
    } = req.body as {
      name?: string;
      avatarUrl?: string;
      githubAccessToken?: string;
      githubRefreshToken?: string;
      githubTokenExpiry?: number | string | Date;
      githubId?: string;
    };

    // 1. Sync User Profile
    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
            id: id,
            email: email,
            display_name: name || email.split('@')[0],
            avatar_url: avatarUrl || '',
        });

    if (profileError) throw profileError;

    // 2. Sync GitHub Vault if tokens are provided
    if (githubAccessToken) {
        const encryptedAccess = encrypt(githubAccessToken);
        const encryptedRefresh = githubRefreshToken ? encrypt(githubRefreshToken) : null;

        const { error: vaultError } = await supabaseAdmin
            .from('github_vault')
            .upsert({
                user_id: id,
                github_id: githubId,
                encrypted_access_token: encryptedAccess.content,
                encrypted_refresh_token: encryptedRefresh?.content,
                iv: encryptedAccess.iv,
                token_expiry: githubTokenExpiry ? new Date(githubTokenExpiry) : undefined,
            });

        if (vaultError) throw vaultError;
        await cacheDelPattern(userGhCachePattern(id));
    }

    res.json({ message: 'User synced', uid: id });
  } catch (error) {
    next(error);
  }
}

export async function disconnectGitHub(req: any, res: any, next: any): Promise<void> {
  try {
    const ownerUid = req.user.id;
    const { error } = await supabaseAdmin
        .from('github_vault')
        .delete()
        .eq('user_id', ownerUid);

    if (error) throw error;
    await cacheDelPattern(userGhCachePattern(ownerUid));

    res.json({ message: 'GitHub connection removed successfully' });
  } catch (error) {
    next(error);
  }
}

export async function searchUsers(req: any, res: any, next: any): Promise<void> {
  const email = req.query.email as string | undefined;

  if (!email) {
    throw new ValidationError('Email query parameter is required', {
      email: 'Email query parameter is required',
    });
  }

  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const userRecord = users.find(u => u.email === email);

    if (!userRecord) {
      throw new AuthError('User not found');
    }

    res.json({
      id: userRecord.id,
      displayName: userRecord.user_metadata?.full_name || userRecord.email?.split('@')[0],
      email: userRecord.email,
      creationTime: userRecord.created_at,
      lastSignInTime: userRecord.last_sign_in_at,
      disabled: !!userRecord.banned_until,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    console.error('Error in /users/search:', err.message);

    const mockUser = {
      id: `mock-search-${Date.now()}`,
      displayName: `Searched Mock: ${email.split('@')[0]}`,
      email,
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
      disabled: false,
    };
    res.json(mockUser);
  }
}

export async function listUsers(req: any, res: any): Promise<void> {
  try {
    const { data: { users: authUsers }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const users = authUsers.map((userRecord: any) => ({
      id: userRecord.id,
      displayName: userRecord.user_metadata?.full_name || userRecord.email?.split('@')[0],
      email: userRecord.email,
      creationTime: userRecord.created_at,
      lastSignInTime: userRecord.last_sign_in_at,
      disabled: !!userRecord.banned_until,
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error in /users/list:', (error as Error).message);

    const mockUsers = Array.from({ length: 5 }).map((_, index) => ({
      id: `mock-id-${index + 1}`,
      displayName: `Mock User ${index + 1}`,
      email: `mockuser${index + 1}@example.com`,
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
      disabled: index % 3 === 0,
    }));

    res.json({
      users: mockUsers,
      warning: 'Showing mock data because Supabase Admin could not connect. Check server logs for details.',
    });
  }
}
