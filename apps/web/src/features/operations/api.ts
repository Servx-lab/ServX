import apiClient from '@/lib/apiClient';
import type {
  ExecuteTaskBody,
  Project,
  ToggleMaintenanceBody,
  ToggleMaintenanceResponse,
  Incident,
  AssessTaskBody,
  AssessTaskResponse,
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

/**
 * Assesses the blast radius of a task before execution.
 */
export async function assessTask(
  body: AssessTaskBody,
): Promise<AssessTaskResponse> {
  const res = await apiClient.post<AssessTaskResponse>(
    '/operations/tasks/assess',
    body,
  );
  return res.data;
}

/**
 * Log client-side actions to the operational audit log.
 */
export async function logClientEvent(
  type: 'security' | 'auth' | 'task' | 'maintenance',
  message: string,
): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ success: boolean }>(
    '/operations/audit/log',
    { type, message },
  );
  return res.data;
}
