import { NotFoundError } from '@servx/errors';
import { decrypt } from '@servx/crypto';
import type { UserConnectionProvider } from '@servx/types';

import { supabaseAdmin } from '../../utils/supabaseAdmin';

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
  const decrypted = decrypt({
    content: connection.encrypted_config,
    iv: connection.iv,
  });
  const config = JSON.parse(decrypted) as { connectionUri?: string };
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
  
  const decrypted = decrypt({
    content: connection.encrypted_config,
    iv: connection.iv,
  });
  
  return {
    provider: connection.provider as UserConnectionProvider,
    config: JSON.parse(decrypted) as Record<string, unknown>,
  };
}
