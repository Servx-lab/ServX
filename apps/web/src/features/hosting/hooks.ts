import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { connectHostingProvider, getHostingStatus } from './api';
import type { ConnectHostingBody } from './types';

import { useLocalCache } from '@/hooks/useLocalCache';

export function useHostingStatus(provider: string) {
  const { data: cachedData, updateCache } = useLocalCache();
  
  const initialData = provider === 'vercel' ? cachedData?.vercelStatus : 
                    provider === 'render' ? cachedData?.renderStatus : undefined;

  return useQuery({
    queryKey: ['hosting', 'status', provider],
    queryFn: async () => {
      const status = await getHostingStatus(provider);
      if (provider === 'vercel') updateCache({ vercelStatus: status });
      else if (provider === 'render') updateCache({ renderStatus: status });
      return status;
    },
    enabled: Boolean(provider),
    initialData,
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
