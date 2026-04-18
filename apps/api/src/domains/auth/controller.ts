import axios from 'axios';

import { AuthError, ValidationError } from '@servx/errors';
import { encrypt, decrypt } from '@servx/crypto';
import { supabaseAdmin } from '../../utils/supabaseAdmin';

import { 
  logNewUserToSheetService, 
  sendServXAlert 
} from './service';
import { prefetchHostingStatuses } from '../connections/service';
import { cacheDelPattern } from '../../core/services/redisCache';
import { userGhCachePattern } from '../github/controller';

// Using global Express.Request extension from requireAuth.ts

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

function isMissingNetHttpPostError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return err?.code === '42883' && (err?.message || '').includes('function net.http_post');
}

export function getGitHubAuthUrl(req: any, res: any): void {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const ownerUid = req.user.uid;

  if (!clientId) {
    throw new AuthError('GitHub Client ID not configured');
  }

  const state = encodeURIComponent(JSON.stringify({ ownerUid }));
  const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&state=${state}`;

  res.json({ url: authorizeUrl });
}

export function redirectToGitHub(req: any, res: any): void {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const ownerUid = req.user.uid;

  const state = encodeURIComponent(JSON.stringify({ ownerUid }));
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&state=${state}`;

  res.redirect(redirectUri);
}

export async function handleGitHubCallback(req: any, res: any, next: any): Promise<void> {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  let ownerUid: string | null = null;

  if (state) {
    try {
      const decodedState = JSON.parse(decodeURIComponent(state)) as { ownerUid?: string };
      ownerUid = decodedState.ownerUid || null;
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

    const targetUid = ownerUid || `legacy-${profile.id}`;

    const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', targetUid)
        .single();
    
    const isNewUser = !existingProfile;

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

    if (profileError && !isMissingNetHttpPostError(profileError)) {
      throw profileError;
    }

    const profileDegradedByMissingNet = Boolean(profileError && isMissingNetHttpPostError(profileError));
    if (profileDegradedByMissingNet) {
      console.warn('[Auth] callback user_profiles upsert skipped due to missing net.http_post extension.');
    }

    const effectiveEmail =
      userProfile?.email || profile.email || `${profile.login}@users.noreply.github.com`;

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
            iv: encryptedAccess.iv, // Use access token IV for the row
            token_expiry: expiryDate,
        });

    if (vaultError && !isMissingNetHttpPostError(vaultError)) {
      throw vaultError;
    }

    const vaultDegradedByMissingNet = Boolean(vaultError && isMissingNetHttpPostError(vaultError));
    if (vaultDegradedByMissingNet) {
      console.warn('[Auth] callback github_vault upsert skipped due to missing net.http_post extension.');
    }

    const degradedByMissingNet = profileDegradedByMissingNet || vaultDegradedByMissingNet;

    // New User Logging Pipeline: Sheet + Admin Alert (only if new)
    if (isNewUser) {
        try {
            await logNewUserToSheetService({ uid: targetUid, email: effectiveEmail });
        } catch (sheetErr) {
            console.error('[Auth] GitHub Sheet log failed:', (sheetErr as Error).message);
        }
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    if (ADMIN_EMAIL) {
        try {
            await sendServXAlert(
                ADMIN_EMAIL,
                'User GitHub Linked',
                `<h1>GitHub Linked</h1><p><b>Email:</b> ${effectiveEmail}</p><p><b>UID:</b> ${targetUid}</p>`
            );
        } catch (emailErr) {
            console.error('[Auth] Admin alert failed:', (emailErr as Error).message);
        }
    }

        const degradedQuery = degradedByMissingNet ? '&degraded=true' : '';
        res.redirect(`${FRONTEND_URL}/github?success=true${degradedQuery}`);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'auth_failed';
    res.redirect(`${FRONTEND_URL}/github?error=auth_failed&details=${encodeURIComponent(details)}`);
    next(error);
  }
}

export async function syncUser(req: any, res: any, next: any): Promise<void> {
  try {
    const { uid, email } = req.user;
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

    // Check if user is new BEFORE upsert
    const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', uid)
        .single();
    
    const isNewUser = !existingProfile;

    // 1. Sync User Profile
    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
            id: uid,
            email: email,
            display_name: name || email.split('@')[0],
            avatar_url: avatarUrl || '',
        });

    if (profileError && !isMissingNetHttpPostError(profileError)) {
      throw profileError;
    }

    const profileDegradedByMissingNet = Boolean(profileError && isMissingNetHttpPostError(profileError));
    if (profileDegradedByMissingNet) {
      console.warn('[Auth] user_profiles upsert skipped due to missing net.http_post extension.');
    }

    let vaultDegradedByMissingNet = false;

    // 2. Sync GitHub Vault if tokens are provided
    if (githubAccessToken) {
        const encryptedAccess = encrypt(githubAccessToken);
        const encryptedRefresh = githubRefreshToken ? encrypt(githubRefreshToken) : null;

        const { error: vaultError } = await supabaseAdmin
            .from('github_vault')
            .upsert({
                user_id: uid,
                github_id: githubId,
                encrypted_access_token: encryptedAccess.content,
                encrypted_refresh_token: encryptedRefresh?.content,
                iv: encryptedAccess.iv,
                token_expiry: githubTokenExpiry ? new Date(githubTokenExpiry) : undefined,
            });

        if (vaultError && !isMissingNetHttpPostError(vaultError)) {
          throw vaultError;
        }

        if (vaultError && isMissingNetHttpPostError(vaultError)) {
          vaultDegradedByMissingNet = true;
          console.warn('[Auth] github_vault upsert skipped due to missing net.http_post extension.');
        }
        await cacheDelPattern(userGhCachePattern(uid));
    }

    const degradedByMissingNet = profileDegradedByMissingNet || vaultDegradedByMissingNet;

    // 3. Pre-fetch hosting statuses in the background if Redis is available
    prefetchHostingStatuses(uid).catch(err => {
        console.error('[Auth] Background pre-fetch failed:', err.message);
    });

    res.json({
      message: degradedByMissingNet
        ? 'Profile sync completed in degraded mode'
        : 'Profile synced successfully',
      isNewUser,
      degradedByMissingNet,
    });
  } catch (error) {
    next(error);
  }
}

export async function disconnectGitHub(req: any, res: any, next: any): Promise<void> {
  try {
    const ownerUid = req.user.uid;
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
  const connectionId = req.query.connectionId as string | undefined;

  if (!email) {
    throw new ValidationError('Email query parameter is required', {
      email: 'Email query parameter is required',
    });
  }

  try {
    // Firebase is disabled. Returning mock data or searching user_profiles.
    const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (profile) {
        res.json({
            uid: profile.id,
            displayName: profile.display_name,
            email: profile.email,
            avatarUrl: profile.avatar_url
        });
        return;
    }

    throw new AuthError('User not found in Supabase');
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/user-not-found') {
      next(new AuthError('User not found'));
      return;
    }

    console.error('Error in /users/search:', err.message);

    const mockUser = {
      uid: `mock-search-${Date.now()}`,
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
  const rawLimit = req.query.limit as string | undefined;
  const limit = Number.parseInt(rawLimit || '100', 10);
  const connectionId = req.query.connectionId as string | undefined;

  try {
    const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .limit(limit);

    if (error) throw error;

    const users = (profiles || []).map((user: any) => ({
      uid: user.id,
      displayName: user.display_name,
      email: user.email,
      avatarUrl: user.avatar_url,
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error in /users/list:', (error as Error).message);

    const mockUsers = Array.from({ length: 5 }).map((_, index) => ({
      uid: `mock-uid-${index + 1}`,
      displayName: `Mock User ${index + 1}`,
      email: `mockuser${index + 1}@example.com`,
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
      disabled: index % 3 === 0,
    }));

    res.json({
      users: mockUsers,
      warning: 'Showing mock data because Firebase Admin could not connect. Check server logs for details.',
    });
  }
}
