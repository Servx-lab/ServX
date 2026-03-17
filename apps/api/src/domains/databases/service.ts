import { MongoClient } from 'mongodb';

import { NotFoundError } from '@servx/errors';
import { decrypt } from '@servx/crypto';

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
    throw new NotFoundError('Invalid connection configuration');
  }
  return config.connectionUri;
}

export async function listDatabases(
  connectionString: string
): Promise<{ name: string; sizeOnDisk: number }[]> {
  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const result = await client.db().admin().listDatabases();
    return result.databases
      .map((db) => ({ name: db.name as string, sizeOnDisk: (db.sizeOnDisk ?? 0) as number }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } finally {
    await client.close();
  }
}

export async function listCollections(
  connectionString: string,
  dbName: string
): Promise<string[]> {
  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collections = await client.db(dbName).listCollections().toArray();
    return collections.map((c) => c.name).sort();
  } finally {
    await client.close();
  }
}

export async function listDocuments(
  connectionString: string,
  dbName: string,
  collectionName: string
): Promise<unknown[]> {
  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    return await client.db(dbName).collection(collectionName).find({}).limit(50).toArray();
  } finally {
    await client.close();
  }
}
