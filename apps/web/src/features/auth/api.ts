import apiClient from '@/lib/apiClient';
import { SyncUserPayload } from './types';

export const syncUser = async (payload: SyncUserPayload): Promise<{ message: string; userId: string }> => {
  const res = await apiClient.post('/auth/sync', payload);
  return res.data;
};
