import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { connectHostingProvider, getHostingStatus } from './api';
import type { ConnectHostingBody } from './types';

export function useHostingStatus(provider: string) {
  return useQuery({
    queryKey: ['hosting', 'status', provider],
    queryFn: () => getHostingStatus(provider),
    enabled: Boolean(provider),
    refetchInterval: 30_000,
  });
}

export function useConnectHosting() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ provider, body }: { provider: string; body: ConnectHostingBody }) =>
      connectHostingProvider(provider, body),
    onSuccess: () => {
      toast({
        title: 'Connected successfully',
        description: 'Your hosting provider has been connected.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Connection failed',
        description:
          err.response?.data?.message ?? 'Failed to connect. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
