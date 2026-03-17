import apiClient from '@/lib/apiClient';
import type { CreateConnectionBody } from '@servx/types';
import type {
  ConnectionListItem,
  ConnectionResponse,
  DbInfo,
  FirebaseUser,
  FirebaseUserListResponse,
} from './types';

export async function getConnections(): Promise<ConnectionListItem[]> {
  const res = await apiClient.get('/connections');
  return res.data;
}

export async function addConnection(payload: CreateConnectionBody): Promise<ConnectionResponse> {
  const res = await apiClient.post('/connections', payload);
  return res.data;
}

export async function deleteConnection(id: string): Promise<void> {
  await apiClient.delete(`/connections/${id}`);
}

export async function exploreDatabases(connectionId: string): Promise<{ databases: DbInfo[] }> {
  const res = await apiClient.get(`/db/explore/databases?connectionId=${connectionId}`);
  return res.data;
}

export async function exploreCollections(
  connectionId: string,
  dbName: string,
): Promise<{ collections: string[] }> {
  const res = await apiClient.get(
    `/db/explore/collections?connectionId=${connectionId}&dbName=${encodeURIComponent(dbName)}`,
  );
  return res.data;
}

export async function exploreDocuments(
  connectionId: string,
  dbName: string,
  collectionName: string,
): Promise<{ documents: unknown[] }> {
  const res = await apiClient.post('/db/explore/documents', {
    connectionId,
    dbName,
    collectionName,
  });
  return res.data;
}

export async function listFirebaseUsers(
  connectionId?: string,
  limit = 100,
): Promise<FirebaseUserListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (connectionId) params.set('connectionId', connectionId);
  const res = await apiClient.get(`/auth/users/list?${params}`);
  return res.data;
}

export async function searchFirebaseUser(
  email: string,
  connectionId?: string,
): Promise<FirebaseUser> {
  const params = new URLSearchParams({ email });
  if (connectionId) params.set('connectionId', connectionId);
  const res = await apiClient.get(`/auth/users/search?${params}`);
  return res.data;
}
