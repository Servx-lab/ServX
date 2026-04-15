import apiClient from '@/lib/apiClient';
import { 
  AdminRecord, 
  InviteAdminBody, 
  AccessPermissions, 
  UpdatePermissionsBody, 
  AdminResource,
  UserSearchHit,
} from './types';

export const getAdminList = async (): Promise<AdminRecord[]> => {
  const res = await apiClient.get('/admin/list');
  return res.data;
};

export const inviteAdmin = async (body: InviteAdminBody): Promise<{ message: string; admin: AdminRecord }> => {
  const res = await apiClient.post('/admin/invite', body);
  return res.data;
};

export const revokeAdmin = async (uid: string): Promise<{ message: string }> => {
  const res = await apiClient.delete(`/admin/revoke/${uid}`);
  return res.data;
};

export const getPermissions = async (userUid: string): Promise<{ permissions: AccessPermissions }> => {
  const res = await apiClient.get(`/admin/permissions/${userUid}`);
  return res.data;
};

export const updatePermissions = async (body: UpdatePermissionsBody): Promise<AccessPermissions> => {
  const res = await apiClient.post('/admin/permissions/update', body);
  return res.data.permissions || res.data; // Aligning with common API responses
};

export const getAdminResources = async (): Promise<AdminResource> => {
  const res = await apiClient.get('/admin/resources');
  return res.data;
};

export const searchUsers = async (q: string): Promise<UserSearchHit[]> => {
  const res = await apiClient.get<{ users: UserSearchHit[] }>('/users/search', {
    params: { q: q.trim() },
  });
  return res.data.users ?? [];
};
