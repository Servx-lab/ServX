import { NotFoundError } from '@servx/errors';
import { decrypt } from '@servx/crypto';
import type { UserConnectionProvider } from '@servx/types';

import UserConnection from './model';

export async function getConnectionString(connectionId: string, ownerUid: string): Promise<string> {
  const connection = await UserConnection.findOne({ _id: connectionId, ownerUid });
  if (!connection) {
    throw new NotFoundError('Connection not found or access denied');
  }
  const decrypted = decrypt({
    content: (connection as any).encryptedConfig as string,
    iv: (connection as any).iv as string,
  });
  const config = JSON.parse(decrypted) as { connectionUri?: string };
  if (!config.connectionUri) {
    throw new NotFoundError('Invalid connection configuration - missing connectionUri');
  }
  return config.connectionUri;
}

export async function getDecryptedConfig(connectionId: string, ownerUid: string): Promise<{ provider: UserConnectionProvider; config: Record<string, unknown> }> {
  const connection = await UserConnection.findOne({ _id: connectionId, ownerUid });
  if (!connection) {
    throw new NotFoundError('Connection not found or access denied');
  }
  
  const decrypted = decrypt({
    content: (connection as any).encryptedConfig as string,
    iv: (connection as any).iv as string,
  });
  
  return {
    provider: (connection as any).provider as UserConnectionProvider,
    config: JSON.parse(decrypted) as Record<string, unknown>,
  };
}
