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

export type RemoteTask = 'backup-db' | 'clear-redis' | 'sync-github' | string;

export interface ExecuteTaskBody {
  task: RemoteTask;
  targetId: string;
}

export interface AssessTaskBody {
  task: RemoteTask;
  targetId: string;
}

export interface AssessTaskResponse {
  success: boolean;
  task: string;
  targetId: string;
  affectedComponents: number;
  impactLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface AuditLogPayload {
  id: string;
  timestamp: string;
  user: string;
  type: 'security' | 'task' | 'maintenance' | 'auth';
  message: string;
}

export interface FinOpsData {
  projectedSpend: number;
  threshold: number;
  currentSpend: number;
}

export interface Incident {
  id: string;
  timestamp: string;
  path: string;
  method: string;
  error_message: string;
  error_stack: string;
  error_code: number;
  diagnosis: string;
  suggested_fix: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  cached: boolean;
}
