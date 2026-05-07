import { encrypt, decrypt } from '@servx/crypto';
import { NotFoundError, ValidationError } from '@servx/errors';

import admin from '../../utils/firebaseAdmin';
import User from '../domains/auth/model';

type StoredTokenDoc = {
  id: string;
  encryptedToken: string;
  iv: string;
  installationId?: string | null;
  createdAt: string;
  updatedAt: string;
};

async function saveUserInstallationTokenInMongo(
  id: string,
  token: string,
  installationId?: string
): Promise<void> {
  const encrypted = encrypt(token);
  await User.findOneAndUpdate(
    { id },
    {
      githubInstallationTokenEncrypted: encrypted.content,
      githubInstallationTokenIv: encrypted.iv,
      githubInstallationId: installationId?.trim() || undefined,
      githubInstallationTokenUpdatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

async function getUserInstallationTokenFromMongo(id: string): Promise<string> {
  const user = await User.findOne({ id }).select(
    '+githubInstallationTokenEncrypted +githubInstallationTokenIv'
  );
  if (!user?.githubInstallationTokenEncrypted || !user?.githubInstallationTokenIv) {
    throw new NotFoundError('GitHub installation token not found for this user.');
  }

  return decrypt({
    content: user.githubInstallationTokenEncrypted,
    iv: user.githubInstallationTokenIv,
  });
}

export async function saveUserInstallationToken(
  id: string,
  token: string,
  installationId?: string
): Promise<void> {
  const safeId = id?.trim();
  const safeToken = token?.trim();

  if (!safeId) {
    throw new ValidationError('id is required to save installation token.');
  }
  if (!safeToken) {
    throw new ValidationError('installation token is required.');
  }

  await saveUserInstallationTokenInMongo(safeId, safeToken, installationId);
}

export async function getUserInstallationToken(id: string): Promise<string> {
  const safeId = id?.trim();
  if (!safeId) {
    throw new ValidationError('id is required to load installation token.');
  }

  return getUserInstallationTokenFromMongo(safeId);
}
