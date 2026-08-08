import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getExposureSummary,
  getExposureFindings,
  getExposureAssets,
  runManualScan,
  addManualAsset,
} from './api';

export function useExposureSummary() {
  return useQuery({
    queryKey: ['exposure', 'summary'],
    queryFn: getExposureSummary,
    refetchInterval: 30000,
  });
}

export function useExposureFindings(category?: string) {
  return useQuery({
    queryKey: ['exposure', 'findings', category],
    queryFn: () => getExposureFindings(category),
    refetchInterval: 30000,
  });
}

export function useExposureAssets() {
  return useQuery({
    queryKey: ['exposure', 'assets'],
    queryFn: getExposureAssets,
  });
}

export function useManualScan() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runManualScan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exposure'] });
      toast({
        title: 'Scan Complete',
        description: `Discovered ${data.assets} assets and found ${data.findings} new findings.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Scan Failed',
        description: err.response?.data?.message || err.message || 'An error occurred during the scan.',
        variant: 'destructive',
      });
    },
  });
}

export function useAddManualAsset() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ asset_type, value }: { asset_type: string; value: string }) =>
      addManualAsset(asset_type, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exposure', 'assets'] });
      toast({
        title: 'Asset Added',
        description: 'The asset has been added to the monitoring pool.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to add asset',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    },
  });
}
