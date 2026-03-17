export interface Project {
  id: string;
  name: string;
  provider: 'vercel' | 'render';
  status: string;
  framework: string;
}

export interface ToggleMaintenanceBody {
  projectId: string;
  provider: string;
  isEnabled: boolean;
}

export interface ToggleMaintenanceResponse {
  success: boolean;
  message: string;
  provider: string;
}

export type RemoteTask = 'force-db-backup' | 'clear-redis-cache' | 'sync-github-stats';

export interface ExecuteTaskBody {
  task: RemoteTask;
  targetId: string;
}

export interface FinOpsData {
  projectedSpend: number;
  threshold: number;
  currentSpend: number;
}
