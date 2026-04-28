import axios from 'axios';

import { decrypt } from '@servx/crypto';
import { VERCEL_REDIRECT_URI, DO_REDIRECT_URI } from '@servx/config';
import { NotFoundError } from '@servx/errors';

import { supabaseAdmin } from '../../utils/supabaseAdmin';

// ─── Vercel ───────────────────────────────────────────────────────────────────

const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID;
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;

export async function getVercelOAuthUrl(ownerUid: string): Promise<string> {
  const { data: connection } = await supabaseAdmin
    .from('hosting_vault')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('provider', 'Vercel')
    .single();

  const state = Math.random().toString(36).substring(7);

  if (!connection) {
    // Fall back to global client ID if configured, otherwise signal mock mode
    if (!VERCEL_CLIENT_ID) {
      return 'mock';
    }
    return `https://vercel.com/oauth/authorize?client_id=${VERCEL_CLIENT_ID}&state=${state}&redirect_uri=${VERCEL_REDIRECT_URI}`;
  }

  const decryptedConfig = JSON.parse(
    decrypt({ content: connection.encrypted_config, iv: connection.iv })
  ) as { clientId?: string };

  const clientId = decryptedConfig.clientId;
  if (!clientId) {
    throw new NotFoundError('Client ID missing in Vercel connection config');
  }

  return `https://vercel.com/oauth/authorize?client_id=${clientId}&state=${state}&redirect_uri=${VERCEL_REDIRECT_URI}&owner_uid=${ownerUid}`;
}

export async function exchangeVercelCode(code: string, ownerUid: string): Promise<string> {
  const { data: connection } = await supabaseAdmin
    .from('hosting_vault')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('provider', 'Vercel')
    .single();

  let clientId = VERCEL_CLIENT_ID;
  let clientSecret = VERCEL_CLIENT_SECRET;

  if (connection) {
    const decryptedConfig = JSON.parse(
      decrypt({ content: connection.encrypted_config, iv: connection.iv })
    ) as { clientId?: string; clientSecret?: string };
    clientId = decryptedConfig.clientId ?? clientId;
    clientSecret = decryptedConfig.clientSecret ?? clientSecret;
  }

  const tokenResponse = await axios.post(
    'https://api.vercel.com/v2/oauth/access_token',
    new URLSearchParams({
      client_id: clientId ?? '',
      client_secret: clientSecret ?? '',
      code,
      redirect_uri: VERCEL_REDIRECT_URI,
    })
  );

  const { access_token } = tokenResponse.data as { access_token: string };
  return access_token;
}

// ─── DigitalOcean ─────────────────────────────────────────────────────────────

const DO_CLIENT_ID = process.env.DO_CLIENT_ID;

export function getDigitalOceanOAuthUrl(): string | null {
  if (!DO_CLIENT_ID) return null;
  return `https://cloud.digitalocean.com/v1/oauth/authorize?client_id=${DO_CLIENT_ID}&redirect_uri=${DO_REDIRECT_URI}&response_type=code&scope=read write`;
}
