import axios from 'axios';
import { AuthError, ValidationError } from '@servx/errors';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { 
  logNewUserToSheetService, 
  sendServXAlert 
} from './service';
import { prefetchHostingStatuses } from '../connections/service';
import { cacheDelPattern, getRedisClient } from '../../core/services/redisCache';
import { userGhCachePattern } from '../github/controller';

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

function isMissingNetHttpPostError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return err?.code === '42883' && (err?.message || '').includes('function net.http_post');
}

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

    const targetId = ownerId || `legacy-${profile.id}`;

    const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', targetId)
        .single();
    
    const isNewUser = !existingProfile;

    // 1. Update or Create User Profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
            id: targetId,
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

    // 2. store tokens in GitHub Vault (Plaintext as per migration policy)
    const plainAccess = accessToken;
    const plainRefresh = refreshToken || null;

    const { error: vaultError } = await supabaseAdmin
        .from('github_vault')
        .upsert({
            user_id: targetId,
            github_id: profile.id.toString(),
            github_username: profile.login,
            encrypted_access_token: plainAccess,
            encrypted_refresh_token: plainRefresh,
            iv: '', 
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
            await logNewUserToSheetService({ uid: targetId, email: effectiveEmail });
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
                `<h1>GitHub Linked</h1><p><b>Email:</b> ${effectiveEmail}</p><p><b>UID:</b> ${targetId}</p>`
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

function getDeviceNameFromUA(ua: string): string {
  if (/windows/i.test(ua)) {
    return 'Chrome on Windows';
  } else if (/macintosh/i.test(ua)) {
    return 'Safari on macOS';
  } else if (/iphone|ipad/i.test(ua)) {
    return 'Mobile Device (iOS)';
  } else if (/android/i.test(ua)) {
    return 'Mobile Device (Android)';
  } else if (/linux/i.test(ua)) {
    return 'Linux Desktop';
  }
  return 'Web Browser';
}

export async function syncUser(req: any, res: any, next: any): Promise<void> {
  try {
    const { id, email } = req.user;
    const fingerprint = req.headers['x-device-uuid'] as string | undefined;

    if (!fingerprint) {
      res.status(400).json({ error: 'zero_trust_error', message: 'x-device-uuid header is required for zero-trust authorization.' });
      return;
    }

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

    // ─── Zero-Trust Device Authorization Check ───
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('user_devices')
      .select('*')
      .eq('user_uuid', id)
      .eq('device_fingerprint', fingerprint)
      .maybeSingle();

    if (deviceError) {
      throw deviceError;
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    const cleanName = getDeviceNameFromUA(userAgent);

    // Fetch real location data (Fallback to backend's public IP if client is localhost)
    let locationStr: string | undefined;
    let ispStr: string | undefined;
    try {
      let targetIp = Array.isArray(clientIp) ? clientIp[0] : clientIp;
      const isLocal = targetIp === '::1' || targetIp === '127.0.0.1' || targetIp.startsWith('192.168.') || targetIp.startsWith('10.');
      const url = isLocal ? 'http://ip-api.com/json/' : `http://ip-api.com/json/${targetIp}`;
      const geoResponse = await axios.get(url, { timeout: 3000 });
      if (geoResponse.data && geoResponse.data.status === 'success') {
        locationStr = geoResponse.data.city && geoResponse.data.regionName ? `${geoResponse.data.city}, ${geoResponse.data.regionName}` : undefined;
        ispStr = geoResponse.data.isp || undefined;
      }
    } catch (geoErr: any) {
      console.error('[GeoLocation] Failed to fetch IP data:', geoErr.message);
    }

    if (!device) {
      // Check if this user has any main device
      const { count: mainCount, error: mainCountError } = await supabaseAdmin
        .from('user_devices')
        .select('*', { count: 'exact', head: true })
        .eq('user_uuid', id)
        .eq('is_main_device', true);

      if (mainCountError) throw mainCountError;

      const hasMainDevice = mainCount !== null && mainCount > 0;
      const initialStatus = hasMainDevice ? 'PENDING' : 'PENDING_SETUP';

      const { data: newDevice, error: insertError } = await supabaseAdmin
        .from('user_devices')
        .insert({
          user_uuid: id,
          device_fingerprint: fingerprint,
          device_name: cleanName,
          is_main_device: false, // Never auto-promote
          status: initialStatus,
          last_ip: Array.isArray(clientIp) ? clientIp[0] : clientIp,
          last_login: new Date()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (hasMainDevice) {
        // Trigger Redis PubSub event to alert the main device
        const redis = await getRedisClient();
        if (redis) {
          await redis.publish(
            `device_approvals:${id}`,
            JSON.stringify({
              event: 'login_request',
              device_fingerprint: fingerprint,
              device_name: cleanName,
              last_ip: Array.isArray(clientIp) ? clientIp[0] : clientIp,
              location: locationStr,
              isp: ispStr
            })
          );
        }
        res.status(403).json({ error: 'device_pending_approval' });
        return;
      } else {
        res.status(403).json({ error: 'device_setup_required' });
        return;
      }
    } else {
      // Device exists
      if (device.status === 'DENIED') {
        res.status(403).json({ error: 'device_denied', message: 'Access from this device has been explicitly denied.' });
        return;
      }
      
      if (device.status === 'PENDING') {
        // Double check if we lost our main device
        const { count: mainCount } = await supabaseAdmin
          .from('user_devices')
          .select('*', { count: 'exact', head: true })
          .eq('user_uuid', id)
          .eq('is_main_device', true);
          
        if (!mainCount || mainCount === 0) {
            // No main device exists! We must set up this one.
            res.status(403).json({ error: 'device_setup_required' });
            return;
        }
        // Update IP and timestamp
        await supabaseAdmin
          .from('user_devices')
          .update({
            last_ip: Array.isArray(clientIp) ? clientIp[0] : clientIp,
            last_login: new Date()
          })
          .eq('id', device.id);

        // Retrigger Redis PubSub to alert the main device
        const redis = await getRedisClient();
        if (redis) {
          await redis.publish(
            `device_approvals:${id}`,
            JSON.stringify({
              event: 'login_request',
              device_fingerprint: fingerprint,
              device_name: device.device_name,
              last_ip: Array.isArray(clientIp) ? clientIp[0] : clientIp,
              location: locationStr,
              isp: ispStr
            })
          );
        }

        res.status(403).json({ error: 'device_pending_approval' });
        return;
      }

      // Approved device: update last active details
      await supabaseAdmin
        .from('user_devices')
        .update({
          last_ip: clientIp,
          last_login: new Date()
        })
        .eq('id', device.id);
    }

    // Check if user is new BEFORE upsert
    const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', id)
        .single();
    
    const isNewUser = !existingProfile;

    // 1. Sync User Profile
    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
            id: id,
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
        const plainAccess = githubAccessToken;
        const plainRefresh = githubRefreshToken || null;

        const { error: vaultError } = await supabaseAdmin
            .from('github_vault')
            .upsert({
                user_id: id,
                github_id: githubId,
                encrypted_access_token: plainAccess,
                encrypted_refresh_token: plainRefresh,
                iv: '',
                token_expiry: githubTokenExpiry ? new Date(githubTokenExpiry) : undefined,
            });

        if (vaultError && !isMissingNetHttpPostError(vaultError)) {
          throw vaultError;
        }

        if (vaultError && isMissingNetHttpPostError(vaultError)) {
          vaultDegradedByMissingNet = true;
          console.warn('[Auth] github_vault upsert skipped due to missing net.http_post extension.');
        }
        await cacheDelPattern(userGhCachePattern(id));
    }

    const degradedByMissingNet = profileDegradedByMissingNet || vaultDegradedByMissingNet;

    // 3. Pre-fetch hosting statuses in the background if Redis is available
    prefetchHostingStatuses(id).catch(err => {
        console.error('[Auth] Background pre-fetch failed:', err.message);
    });

    res.json({
      message: degradedByMissingNet
        ? 'Profile sync completed in degraded mode'
        : 'Profile synced successfully',
      isNewUser,
      degradedByMissingNet,
      uid: id,
    });
  } catch (error) {
    next(error);
  }
}

export async function disconnectGitHub(req: any, res: any, next: any): Promise<void> {
  try {
    const ownerId = req.user.id;
    const { error } = await supabaseAdmin
        .from('github_vault')
        .delete()
        .eq('user_id', ownerId);

    if (error) throw error;
    await cacheDelPattern(userGhCachePattern(ownerId));

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
    const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (profile) {
        res.json({
            id: profile.id,
            displayName: profile.display_name,
            email: profile.email,
            avatarUrl: profile.avatar_url
        });
        return;
    }

    // Fallback to Supabase Auth Admin
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const userRecord = users.find(u => u.email === email);

    if (userRecord) {
      res.json({
        id: userRecord.id,
        displayName: userRecord.user_metadata?.full_name || userRecord.email?.split('@')[0],
        email: userRecord.email,
        creationTime: userRecord.created_at,
        lastSignInTime: userRecord.last_sign_in_at,
        disabled: !!userRecord.banned_until,
      });
      return;
    }

    throw new AuthError('User not found');
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
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Try user_profiles first
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .limit(limit);

    if (!profileError && profiles && profiles.length > 0) {
        const users = profiles.map((user: any) => ({
          id: user.id,
          displayName: user.display_name,
          email: user.email,
          avatarUrl: user.avatar_url,
        }));
        res.json({ users });
        return;
    }

    // Fallback to Supabase Auth Admin
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
