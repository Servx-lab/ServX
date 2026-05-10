import apiClient from '@/lib/apiClient';
import type {
  ExecuteTaskBody,
  Project,
  ToggleMaintenanceBody,
  ToggleMaintenanceResponse,
  Incident,
} from './types';

/**
 * Fetches hosting projects from the backend.
 */
export async function getProjects(): Promise<{ projects: Project[] }> {
  const res = await apiClient.get<{ projects: Project[] }>('/operations/projects');
  return res.data;
}

/**
 * Toggles maintenance mode for a project.
 */
export async function toggleMaintenance(
  body: ToggleMaintenanceBody,
): Promise<ToggleMaintenanceResponse> {
  const res = await apiClient.post<ToggleMaintenanceResponse>(
    '/operations/toggle-maintenance',
    body,
  );
  return res.data;
}

/**
 * Executes a remote infrastructure task.
 */
export async function executeTask(
  body: ExecuteTaskBody,
): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ success: boolean }>('/tasks/execute', body);
  return res.data;
}

/**
 * Fetches the most recent server-side incident.
 */
export async function getLatestIncident(): Promise<{ incident: Incident | null }> {
  const res = await apiClient.get<{ incident: Incident | null }>('/operations/incidents/latest');
  return res.data;
}
