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

export const revokeAdmin = async (id: string): Promise<{ message: string }> => {
  const res = await apiClient.delete(`/admin/revoke/${id}`);
  return res.data;
};

export const getPermissions = async (userId: string): Promise<{ permissions: AccessPermissions }> => {
  const res = await apiClient.get(`/admin/permissions/${userId}`);
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

export interface DeviceRecord {
  id: string;
  user_uuid: string;
  device_fingerprint: string;
  device_name: string;
  is_main_device: boolean;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  last_ip: string;
  last_login: string;
  created_at: string;
  updated_at: string;
}

export const getDevices = async (): Promise<DeviceRecord[]> => {
  const res = await apiClient.get('/devices');
  return res.data;
};

export const revokeDeviceApi = async (id: string): Promise<{ success: boolean }> => {
  const res = await apiClient.delete(`/devices/${id}`);
  return res.data;
};

export const approveDeviceApi = async (body: {
  device_fingerprint: string;
  status: 'APPROVED' | 'DENIED';
  device_name?: string;
}): Promise<{ success: boolean }> => {
  const res = await apiClient.post('/devices/approve', body);
  return res.data;
};
