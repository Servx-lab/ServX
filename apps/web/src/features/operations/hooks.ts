import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { executeTask, getProjects, toggleMaintenance } from './api';
import type { ExecuteTaskBody, ToggleMaintenanceBody } from './types';

export function useProjects() {
  return useQuery({
    queryKey: ['operations', 'projects'],
    queryFn: getProjects,
  });
}

export function useToggleMaintenance() {
  return useMutation({
    mutationFn: (body: ToggleMaintenanceBody) => toggleMaintenance(body),
    onSuccess: (data, variables) => {
      if (data?.success) {
        if (variables.isEnabled) {
          toast.error('MAINTENANCE MODE ACTIVATED - TRAFFIC BLOCKED');
        } else {
          toast.success('Maintenance Mode Deactivated - Traffic Restored');
        }
      } else {
        toast.error(data?.message || 'Failed to toggle maintenance mode');
      }
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ?? err?.message ?? 'Failed to toggle maintenance mode';
      toast.error(msg);
    },
  });
}

export function useExecuteTask() {
  return useMutation({
    mutationFn: (body: ExecuteTaskBody) => executeTask(body),
    onSuccess: () => {
      toast.success('Task completed successfully');
    },
    onError: () => {
      toast.error('Task failed. Please try again.');
    },
  });
}
