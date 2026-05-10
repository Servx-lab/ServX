import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { executeTask, getProjects, toggleMaintenance, getLatestIncident } from './api';
import type { ExecuteTaskBody, ToggleMaintenanceBody } from './types';

/**
 * Hook to fetch hosting projects.
 */
export function useProjects() {
  return useQuery({
    queryKey: ['operations', 'projects'],
    queryFn: getProjects,
  });
}

/**
 * Hook to toggle maintenance mode.
 */
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

/**
 * Hook to execute infrastructure tasks.
 */
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

/**
 * Hook to poll for the latest server incident every 5 seconds.
 */
export function useLatestIncident() {
  return useQuery({
    queryKey: ['operations', 'incidents', 'latest'],
    queryFn: getLatestIncident,
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 4000,
  });
}
