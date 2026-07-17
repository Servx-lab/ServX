import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { useLocalCache } from '@/hooks/useLocalCache';
import { useConnections } from '@/features/databases/hooks';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  ServiceItem, 
  DeploymentItem, 
  ProviderUser 
} from './types';
import { PROVIDER_CONFIGS } from './constants/providerConfigs';
import { ConnectionForm } from './views/ConnectionForm';
import { ConnectedDashboard } from './views/ConnectedDashboard';

interface HostingIntegrationCardProps {
  provider?: 'Render' | 'Vercel' | 'AWS' | 'Railway' | 'DigitalOcean' | 'Fly.io' | 'Coolify';
  connectionId?: string;
}

const HostingIntegrationCard: React.FC<HostingIntegrationCardProps> = ({
  provider = 'Render',
  connectionId,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'connecting' | 'connected' | 'error'>('loading');
  const [tokenInput, setTokenInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [aliasInput, setAliasInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [providerUser, setProviderUser] = useState<ProviderUser | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [deployments, setDeployments] = useState<DeploymentItem[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const loadingTimeoutRef = React.useRef<NodeJS.Timeout|null>(null);
  const { data: cachedData, updateCache } = useLocalCache();
  const navigate = useNavigate();
  const { refetch: refetchGlobalConnections } = useConnections();

  const config = useMemo(() => PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.Render, [provider]);

  const isConnectedInCache = useMemo(() => {
    if (!cachedData?.connections) return false;
    const dbName = {
      'vercel': 'Vercel',
      'render': 'Render',
      'railway': 'Railway',
      'digitalocean': 'DigitalOcean',
      'fly': 'Fly.io',
      'aws': 'AWS',
      'coolify': 'Coolify'
    }[config.key];
    return cachedData.connections.some((c: any) => c.provider === dbName);
  }, [config, cachedData]);

  /**
   * Fetches the latest status and data for the current hosting provider.
   * @param isSilent - If true, prevents showing a full-screen loading state or error message.
   */
  const fetchData = useCallback(async (isSilent = false) => {
    let cancelled = false;
    if (!isSilent) setErrorMsg('');

    if (connectionId === 'new') {
        setStatus('idle');
        return () => { cancelled = true; };
    }

    try {
      const response = await apiClient.get(`/connections/hosting/${config.key}/status`);
      if (cancelled) return;

      if (response.data.connected && response.data.accounts) {
        setAccounts(response.data.accounts);
        
        // Since we have a useEffect watching accounts + selectedAccountId, it will update the other states
        // Use connectionId prop if provided, else fallback to selectedAccountId or first account
        const targetId = connectionId || selectedAccountId;
        const activeAccount = response.data.accounts.find((a: any) => a.connectionId === targetId) || response.data.accounts[0];
        if (activeAccount) {
            setSelectedAccountId(activeAccount.connectionId);
            setProviderUser(activeAccount.user);
            setServices(activeAccount.services || []);
            setDeployments(activeAccount.deployments || []);
            setStatus('connected');
        } else {
            setStatus('idle');
        }
        
        // Update cache with full data for SWR (Stale-While-Revalidate)
        if (updateCache) {
            const updatedStatuses = { 
                ...(cachedData?.hostingStatuses || {}),
                [config.key]: {
                    accounts: response.data.accounts
                }
            };
            updateCache({ hostingStatuses: updatedStatuses });
        }
      } else {
        if (response.data.error && !isSilent) {
            setStatus('error');
            setErrorMsg(response.data.error);
        } else {
            setStatus('idle');
        }
        // Clear from cache if no longer connected
        if (updateCache && cachedData?.hostingStatuses?.[config.key]) {
            const updatedStatuses = { ...cachedData.hostingStatuses };
            delete updatedStatuses[config.key];
            updateCache({ hostingStatuses: updatedStatuses });
        }
      }
    } catch (err: any) {
      if (cancelled) return;
      if (err.response?.status === 404) {
        setStatus('idle');
      } else {
        if (!isSilent) {
          setStatus('error');
          setErrorMsg(err.response?.data?.message || 'Failed to fetch status');
        }
      }
    } finally {
        setRefreshing(false);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }

    return () => { cancelled = true; };
  }, [config.key, updateCache]);

  /**
   * Effect to handle provider switching and initial data loading with SWR pattern.
   */
  useEffect(() => {
    let cancelled = false;
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

    // Initial state reset for new provider or connection switch
    setProviderUser(null);
    setServices([]);
    setDeployments([]);
    setDisconnecting(false);
    setRefreshing(false);
    
    if (connectionId === 'new') {
        setStatus('idle');
        return;
    }
    
    if (!config) { 
        setStatus('idle'); 
        return; 
    }

    // 1. Check for cached data (SWR Pattern)
    const cachedProviderData = cachedData?.hostingStatuses?.[config.key];
    const knownConnected = isConnectedInCache;

    // Artificial brief delay to allow entry animations to trigger (the "vibe" the user wants)
    const MIN_LOADING_MS = 500;
    const startTime = Date.now();

    const handleDataFetch = async (isSilent: boolean) => {
        await fetchData(isSilent);
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_MS) {
            await new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS - elapsed));
        }
        if (!cancelled) setStatus('connected');
    };

    if (cachedProviderData?.accounts) {
        // We have data! Show it but stay in loading state briefly for animations
        setAccounts(cachedProviderData.accounts);
        const activeAccount = cachedProviderData.accounts.find((a: any) => a.connectionId === selectedAccountId) || cachedProviderData.accounts[0];
        if (activeAccount) {
            setSelectedAccountId(activeAccount.connectionId);
            setProviderUser(activeAccount.user);
            setServices(activeAccount.services || []);
            setDeployments(activeAccount.deployments || []);
        }
        
        setStatus('loading'); // Stay in loading to show skeleton
        
        handleDataFetch(true); // Revalidate in background
        return;
    }

    if (!knownConnected) {
        setStatus('idle');
        return;
    }

    // Known connected but no data yet
    setStatus('loading');
    
    // Safety timeout
    loadingTimeoutRef.current = setTimeout(() => {
       if (!cancelled && status === 'loading') setStatus('idle');
    }, 8000);

    handleDataFetch(false);

    return () => { 
      cancelled = true; 
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [provider, config.key, isConnectedInCache, fetchData]);

  useEffect(() => {
    if (accounts.length > 0 && selectedAccountId) {
        const activeAccount = accounts.find((a: any) => a.connectionId === selectedAccountId);
        if (activeAccount) {
            setProviderUser(activeAccount.user);
            setServices(activeAccount.services || []);
            setDeployments(activeAccount.deployments || []);
        }
    }
  }, [selectedAccountId, accounts]);

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    setStatus('connecting');
    setErrorMsg('');

    try {
      // For Coolify, we might need to send the instance URL
      const payload: any = { provider: config.key, token: tokenInput, name: config.label, alias: aliasInput };
      if (config.key === 'coolify' && urlInput) {
          payload.instanceUrl = urlInput;
      }

      const res = await apiClient.post(`/connections/hosting/${config.key}`, payload);

      if (res.data.message.includes('successfully')) {
        setTokenInput('');
        setUrlInput('');
        
        // Refresh the sidebar immediately
        await refetchGlobalConnections();
        
        // Redirect to the newly connected provider ID
        if (res.data.connection && res.data.connection._id) {
           navigate(`/hosting/${config.key}/${res.data.connection._id}`);
        } else {
           await fetchData();
        }
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.message || 'Could not connect. Verify your API token.');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${config.label}?`)) return;
    setDisconnecting(true);
    try {
      await apiClient.delete(`/connections/hosting/${config.key}`);
      setStatus('idle');
      setServices([]);
      setDeployments([]);
      
      // Update local cache manually
      if (cachedData && updateCache) {
          updateCache({
              ...cachedData,
              connections: cachedData.connections.filter((c: any) => c.provider !== config.label)
          });
      }
    } catch (err) {
      alert('Failed to disconnect. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getStateColor = (state: string) => {
    const s = (state || '').toUpperCase();
    if (['READY', 'ACTIVE', 'RUNNING', 'LIVE', 'DEPLOYED', 'HEALTHY', 'SUCCESS'].includes(s)) return 'bg-green-50 text-green-600 border-green-200';
    if (['BUILDING', 'INITIALIZING', 'CONNECTING', 'WAITING', 'PENDING'].includes(s)) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (['ERROR', 'FAILED', 'CRASHED', 'DOWN', 'UNHEALTHY'].includes(s)) return 'bg-red-50 text-red-600 border-red-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  // --- Main Render States ---
  if (status === 'loading') {
    // If we have cached data, show a skeleton that matches the dashboard layout
    if (cachedData?.hostingStatuses?.[config.key]) {
        return (
            <div className="p-8 space-y-8 min-h-[calc(100vh-12rem)] rounded-xl border border-gray-100 bg-white/50 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 mb-8">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] rounded-xl border border-gray-100 bg-white/50 animate-in fade-in duration-500">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-gray-500 font-medium">Communicating with {config.label}...</p>
      </div>
    );
  }

  if (status === 'connected') {
    return (
        <ConnectedDashboard 
            config={config}
            providerUser={providerUser}
            services={services}
            deployments={deployments}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            onAddAccount={() => {
                setTokenInput('');
                setAliasInput('');
                setUrlInput('');
                setStatus('idle');
            }}
            refreshing={refreshing}
            disconnecting={disconnecting}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            onDisconnect={handleDisconnect}
            timeAgo={timeAgo}
            getStateColor={getStateColor}
        />
    );
  }

  // --- Setup Form ---
  return (
    <ConnectionForm 
        config={config}
        tokenInput={tokenInput}
        setTokenInput={setTokenInput}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        aliasInput={aliasInput}
        setAliasInput={setAliasInput}
        showToken={showToken}
        setShowToken={setShowToken}
        status={status}
        setStatus={setStatus}
        errorMsg={errorMsg}
        handleConnect={handleConnect}
    />
  );
};

export default HostingIntegrationCard;
