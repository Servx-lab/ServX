import { NotFoundError } from '@servx/errors';

import type { UserConnectionProvider } from '@servx/types';

import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { decrypt } from '@servx/crypto';

export async function getConnectionString(connectionId: string, ownerUid: string): Promise<string> {
  const { data: connection, error } = await supabaseAdmin
    .from('db_vault')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', ownerUid)
    .single();

  if (!connection || error) {
    throw new NotFoundError('Connection not found or access denied');
  }
  let rawConfig = connection.encrypted_config;
  if (connection.iv && connection.iv !== '') {
    rawConfig = decrypt({ iv: connection.iv, content: connection.encrypted_config });
  }

  const config = JSON.parse(rawConfig) as { connectionUri?: string };
  if (!config.connectionUri) {
    throw new NotFoundError('Invalid connection configuration - missing connectionUri');
  }
  return config.connectionUri;
}

export async function getDecryptedConfig(connectionId: string, ownerUid: string): Promise<{ provider: UserConnectionProvider; config: Record<string, unknown> }> {
  const { data: connection, error } = await supabaseAdmin
    .from('db_vault')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', ownerUid)
    .single();

  if (!connection || error) {
    throw new NotFoundError('Connection not found or access denied');
  }
  
  let rawConfig = connection.encrypted_config;
  if (connection.iv && connection.iv !== '') {
    rawConfig = decrypt({ iv: connection.iv, content: connection.encrypted_config });
  }

  const config = JSON.parse(rawConfig) as Record<string, unknown>;
  
  return {
    provider: connection.provider as UserConnectionProvider,
    config,
  };
}
