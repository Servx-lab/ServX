import apiClient from '@/lib/apiClient';
import type {
  ExecuteTaskBody,
  Project,
  ToggleMaintenanceBody,
  ToggleMaintenanceResponse,
} from './types';

export async function getProjects(): Promise<{ projects: Project[] }> {
  const res = await apiClient.get<{ projects: Project[] }>('/operations/projects');
  return res.data;
}

export async function toggleMaintenance(
  body: ToggleMaintenanceBody,
): Promise<ToggleMaintenanceResponse> {
  const res = await apiClient.post<ToggleMaintenanceResponse>(
    '/operations/toggle-maintenance',
    body,
  );
  return res.data;
}

export async function executeTask(
  body: ExecuteTaskBody,
): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ success: boolean }>('/tasks/execute', body);
  return res.data;
}
