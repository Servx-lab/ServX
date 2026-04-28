import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useLocalCache } from '@/hooks/useLocalCache';

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
}

const HostingIntegrationCard: React.FC<HostingIntegrationCardProps> = ({
  provider = 'Render',
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'connecting' | 'connected' | 'error'>('loading');
  const [tokenInput, setTokenInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [providerUser, setProviderUser] = useState<ProviderUser | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [deployments, setDeployments] = useState<DeploymentItem[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const loadingTimeoutRef = React.useRef<NodeJS.Timeout|null>(null);
  const { data: cachedData, updateCache } = useLocalCache();

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

  const fetchData = useCallback(async (isSilent = false) => {
    let cancelled = false;
    if (!isSilent) setErrorMsg('');

    try {
      const response = await apiClient.get(`/connections/hosting/${config.key}/status`);
      if (cancelled) return;

      if (response.data.connected) {
        setProviderUser(response.data.user);
        setServices(response.data.services || []);
        setDeployments(response.data.deployments || []);
        setStatus('connected');
        
        // Update cache implicitly (timestamp)
        if (updateCache) {
            updateCache({});
        }
      } else {
        setStatus('idle');
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

  useEffect(() => {
    let cancelled = false;
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

    // Initial state reset for new provider
    setProviderUser(null);
    setServices([]);
    setDeployments([]);
    setDisconnecting(false);
    setRefreshing(false);
    
    if (!config) { 
        setStatus('idle'); 
        return; 
    }

    // Determine if we should show a loading state
    const shouldFetchAnyway = !cachedData?.lastUpdated; 
    const knownConnected = isConnectedInCache;

    if (!knownConnected && !shouldFetchAnyway) {
        setStatus('idle');
        return;
    }

    setStatus('loading');
    
    // Safety timeout
    loadingTimeoutRef.current = setTimeout(() => {
       if (!cancelled && status === 'loading') setStatus('idle');
    }, 8000);

    fetchData();

    return () => { 
      cancelled = true; 
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [provider, config.key, isConnectedInCache, fetchData]);

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    setStatus('connecting');
    setErrorMsg('');

    try {
      // For Coolify, we might need to send the instance URL
      const payload: any = { provider: config.key, token: tokenInput };
      if (config.key === 'coolify' && urlInput) {
          payload.instanceUrl = urlInput;
      }

      const res = await apiClient.post(`/connections/hosting/${config.key}`, payload);

      if (res.data.message.includes('successfully')) {
        setTokenInput('');
        setUrlInput('');
        await fetchData();
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
      await apiClient.delete(`/api/hosting/disconnect?provider=${config.key}`);
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
