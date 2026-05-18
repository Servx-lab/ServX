import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import apiClient from '@/lib/apiClient';
import { executeTask, getProjects, toggleMaintenance, getLatestIncident, assessTask, logClientEvent } from './api';
import type { ExecuteTaskBody, ToggleMaintenanceBody, AssessTaskBody, AuditLogPayload } from './types';

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

/**
 * Hook to pre-flight assess blast radius.
 */
export function useAssessTask() {
  return useMutation({
    mutationFn: (body: AssessTaskBody) => assessTask(body),
    onError: () => {
      toast.error('Failed to calculate blast radius pre-flight. Please try again.');
    },
  });
}

/**
 * Hook to establish Server-Sent Events (SSE) log audit streaming connection.
 */
export function useAuditStream(isEnabled: boolean = true) {
  const [logs, setLogs] = useState<AuditLogPayload[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!isEnabled) {
      setStatus('disconnected');
      return;
    }

    let eventSource: EventSource | null = null;
    let cancelled = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = async () => {
      try {
        if (cancelled) return;
        setStatus('connecting');
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data.session?.access_token || '';
        
        // Resolve API base path
        const base = apiClient.defaults.baseURL || '/api';
        const url = `${base}/operations/audit/stream?token=${encodeURIComponent(token)}`;

        if (cancelled) return;

        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          if (!cancelled) setStatus('connected');
        };

        eventSource.onmessage = (event) => {
          if (cancelled) return;
          try {
            const data = JSON.parse(event.data) as AuditLogPayload;
            setLogs((prev) => {
              // FIFO buffer - cap at 150 items
              const newLogs = [data, ...prev];
              if (newLogs.length > 150) {
                return newLogs.slice(0, 150);
              }
              return newLogs;
            });
          } catch (err) {
            console.error('[useAuditStream] Error parsing log payload:', err);
          }
        };

        eventSource.onerror = (err) => {
          if (cancelled) return;
          console.warn('[useAuditStream] SSE connection error, reconnecting...', err);
          setStatus('disconnected');
          eventSource?.close();
          
          reconnectTimeout = setTimeout(() => {
            if (!cancelled) connectSSE();
          }, 5000);
        };
      } catch (err) {
        console.error('[useAuditStream] Failed to initialize connection:', err);
        if (!cancelled) {
          setStatus('disconnected');
          reconnectTimeout = setTimeout(() => {
            if (!cancelled) connectSSE();
          }, 5000);
        }
      }
    };

    connectSSE();

    return () => {
      cancelled = true;
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [isEnabled]);

  const clearLogs = () => setLogs([]);

  return { logs, status, clearLogs };
}
