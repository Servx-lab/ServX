import axios from 'axios';
import { getAuth } from 'firebase-admin/auth';

import { AuthError, ValidationError } from '@servx/errors';

import User from './model';
import {
  findFirebaseConnectionId,
  getFirebaseApp,
  logNewUserToSheetService,
  sendServXAlert,
} from './service';
import { cacheDelPattern } from '../../core/services/redisCache';
import { userGhCachePattern } from '../github/controller';

interface AuthenticatedRequest {
  user: {
    uid: string;
    email: string;
  };
  body: any;
  query: Record<string, unknown>;
}

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export function getGitHubAuthUrl(req: AuthenticatedRequest, res: any): void {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const ownerUid = req.user.uid;

  if (!clientId) {
    throw new AuthError('GitHub Client ID not configured');
  }

  const state = encodeURIComponent(JSON.stringify({ ownerUid }));
  const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&state=${state}`;

  res.json({ url: authorizeUrl });
}

export function redirectToGitHub(req: AuthenticatedRequest, res: any): void {
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

    let user = ownerUid ? await User.findOne({ uid: ownerUid }).select('+githubAccessToken +githubRefreshToken +githubTokenExpiry') : null;

    if (user) {
      user.githubAccessToken = accessToken;
      user.githubRefreshToken = refreshToken || user.githubRefreshToken;
      user.githubTokenExpiry = expiryDate || user.githubTokenExpiry;
      user.githubId = profile.id.toString();
      await user.save();
    } else {
      user = await User.findOne({ githubId: profile.id.toString() }).select('+githubAccessToken +githubRefreshToken +githubTokenExpiry');
      if (!user && profile.email) {
        user = await User.findOne({ email: profile.email }).select('+githubAccessToken +githubRefreshToken +githubTokenExpiry');
      }

      if (user) {
        user.githubAccessToken = accessToken;
        user.githubRefreshToken = refreshToken || user.githubRefreshToken;
        user.githubTokenExpiry = expiryDate || user.githubTokenExpiry;
        if (!user.githubId) {
          user.githubId = profile.id.toString();
        }
        await user.save();
      } else {
        const newUser = await User.create({
          uid: ownerUid || `legacy-${profile.id}`,
          githubId: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email || `${profile.login}@users.noreply.github.com`,
          avatarUrl: profile.avatar_url,
          githubAccessToken: accessToken,
          githubRefreshToken: refreshToken,
          githubTokenExpiry: expiryDate,
        });

        // New User Logging Pipeline: Sheet + Admin Alert
        try {
          await logNewUserToSheetService({ uid: newUser.uid, email: newUser.email });
        } catch (sheetErr) {
          console.error('[Auth] GitHub Sheet log failed (user still created):', (sheetErr as Error).message);
        }

        const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
        if (ADMIN_EMAIL) {
          try {
            await sendServXAlert(
              ADMIN_EMAIL,
              'New User Signup (GitHub)',
              `<h1>New User Registered</h1><p><b>Email:</b> ${newUser.email}</p><p><b>UID:</b> ${newUser.uid}</p>`
            );
          } catch (emailErr) {
            console.error('[Auth] Admin alert failed:', (emailErr as Error).message);
          }
        }
      }
    }

    res.redirect(`${FRONTEND_URL}/github?success=true`);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'auth_failed';
    res.redirect(`${FRONTEND_URL}/github?error=auth_failed&details=${encodeURIComponent(details)}`);
    next(error);
  }
}

export async function syncUser(req: AuthenticatedRequest, res: any, next: any): Promise<void> {
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

    let user = await User.findOne({ uid }).select('+githubAccessToken +githubRefreshToken +githubTokenExpiry');

    if (user) {
      let isModified = false;

      if (name && user.name !== name) {
        user.name = name;
        isModified = true;
      }
      if (avatarUrl && user.avatarUrl !== avatarUrl) {
        user.avatarUrl = avatarUrl;
        isModified = true;
      }
      if (githubAccessToken && user.githubAccessToken !== githubAccessToken) {
        user.githubAccessToken = githubAccessToken;
        isModified = true;
      }
      if (githubRefreshToken && user.githubRefreshToken !== githubRefreshToken) {
        user.githubRefreshToken = githubRefreshToken;
        isModified = true;
      }
      if (githubTokenExpiry) {
        const expiryDate = new Date(githubTokenExpiry);
        if (user.githubTokenExpiry?.getTime() !== expiryDate.getTime()) {
          user.githubTokenExpiry = expiryDate;
          isModified = true;
        }
      }
      if (githubId && user.githubId !== githubId) {
        user.githubId = githubId;
        isModified = true;
      }

      if (isModified) {
        console.log(`[Auth] Syncing profile for user ${uid}: ${Object.keys(user.toObject()).filter(k => user.isDirectModified(k)).join(', ')}`);
        await user.save();

        if (githubAccessToken) {
          await cacheDelPattern(userGhCachePattern(uid));
        }
      }
    } else {
      user = await User.create({
        uid,
        email,
        name: name || email.split('@')[0],
        avatarUrl: avatarUrl || '',
        githubAccessToken: githubAccessToken || undefined,
        githubRefreshToken: githubRefreshToken || undefined,
        githubTokenExpiry: githubTokenExpiry ? new Date(githubTokenExpiry) : undefined,
        githubId: githubId || undefined,
      });

      try {
        await logNewUserToSheetService({ uid, email, role: user.role || 'user' });
      } catch (sheetError) {
        console.error('[Auth] Sheet log failed (user still created):', (sheetError as Error).message);
      }

      try {
        await sendServXAlert(email, 'Welcome to ServX', '<h1>HTML Template Coming Soon</h1>');
      } catch (emailError) {
        console.error('[Auth] Welcome email failed:', (emailError as Error).message);
      }

      const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
      if (ADMIN_EMAIL) {
        try {
          await sendServXAlert(
            ADMIN_EMAIL,
            'New User Signup (Firebase)',
            `<h1>New User Registered</h1><p><b>Email:</b> ${email}</p><p><b>UID:</b> ${uid}</p>`
          );
        } catch (emailErr) {
          console.error('[Auth] Admin alert failed:', (emailErr as Error).message);
        }
      }
    }

    res.json({ message: 'User synced', userId: user._id });
  } catch (error) {
    next(error);
  }
}

export async function disconnectGitHub(req: AuthenticatedRequest, res: any, next: any): Promise<void> {
  try {
    const ownerUid = req.user.uid;
    const user = await User.findOne({ uid: ownerUid });

    if (!user) {
      throw new AuthError('User not found');
    }

    user.githubAccessToken = undefined;
    user.githubRefreshToken = undefined;
    user.githubTokenExpiry = undefined;
    user.githubId = undefined;
    await user.save();

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
    const firebaseConnectionId = connectionId || (await findFirebaseConnectionId());
    const firebaseApp = await getFirebaseApp(firebaseConnectionId);
    const userRecord = await getAuth(firebaseApp).getUserByEmail(email);

    res.json({
      uid: userRecord.uid,
      displayName: userRecord.displayName,
      email: userRecord.email,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      disabled: userRecord.disabled,
    });
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
    const firebaseConnectionId = connectionId || (await findFirebaseConnectionId());
    const firebaseApp = await getFirebaseApp(firebaseConnectionId);
    const listUsersResult = await getAuth(firebaseApp).listUsers(limit);
    const users = listUsersResult.users.map((userRecord: any) => ({
      uid: userRecord.uid,
      displayName: userRecord.displayName,
      email: userRecord.email,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      disabled: userRecord.disabled,
    }));

    res.json({ users, pageToken: listUsersResult.pageToken });
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
