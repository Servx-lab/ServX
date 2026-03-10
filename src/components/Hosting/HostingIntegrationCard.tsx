import React, { useState, useEffect, useCallback } from 'react';
import { Server, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ExternalLink, ArrowRight, Shield, Zap, Globe, Trash2, RefreshCw, Box, GitBranch, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import apiClient from '@/lib/apiClient';

interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  updatedAt: number;
  latestDeploymentStatus: string;
  url: string | null;
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string | null;
  state: string;
  created: number;
  source: string;
  meta: { githubCommitMessage?: string; githubCommitRef?: string } | null;
}

interface VercelUser {
  username: string;
  name: string;
  email: string;
  avatar: string;
}

interface HostingIntegrationCardProps {
  provider?: 'Render' | 'Vercel' | 'AWS' | 'Railway' | 'DigitalOcean' | 'Fly.io';
  onConnect?: (apiKey: string) => Promise<void>;
}

// --- Logo Components ---
const RenderLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-4">
    <path d="M19.3333 13.3333H4.66667V20H19.3333V13.3333Z" fill="white" fillOpacity="0.9"/>
    <path d="M19.3333 4H4.66667V10.6667H19.3333V4Z" fill="white" fillOpacity="0.5"/>
  </svg>
);

const VercelLogo = () => (
  <svg viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-4 fill-white flex-shrink-0">
    <path d="M577.344 0L1154.69 1000H0L577.344 0Z" />
  </svg>
);

const DigitalOceanLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-4 text-blue-500 flex-shrink-0">
    <path d="M12 12H16V16H12V12Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14Z" fill="currentColor"/>
  </svg>
);

const RailwayLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-4 text-purple-400 flex-shrink-0">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const FlyLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-4 text-indigo-400 flex-shrink-0">
       <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.5"/>
       <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
       <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

const HostingIntegrationCard: React.FC<HostingIntegrationCardProps> = ({ 
  provider = 'Render',
  onConnect 
}) => {
  const [apiKey, setApiKey] = useState('');
  const [vercelToken, setVercelToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'loading'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [vercelUser, setVercelUser] = useState<VercelUser | null>(null);
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [deployments, setDeployments] = useState<VercelDeployment[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isOAuthProvider = ['DigitalOcean', 'Railway'].includes(provider);

  const fetchVercelStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/connections/vercel/status');
      if (res.data.connected) {
        setStatus('connected');
        setConnectionId(res.data.connectionId);
        setVercelUser(res.data.user || null);
        setProjects(res.data.projects || []);
        setDeployments(res.data.deployments || []);
      } else {
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (provider === 'Vercel') {
      fetchVercelStatus();
    } else {
      setStatus('idle');
    }
  }, [provider, fetchVercelStatus]);

  const handleDisconnect = async () => {
    if (!connectionId) return;
    setDisconnecting(true);
    try {
      await apiClient.delete(`/connections/${connectionId}`);
      setStatus('idle');
      setConnectionId(null);
      setVercelUser(null);
      setProjects([]);
      setDeployments([]);
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVercelStatus();
    setRefreshing(false);
  };

  const getLogo = () => {
    switch (provider) {
        case 'Render': return <RenderLogo />;
        case 'Vercel': return <VercelLogo />;
        case 'DigitalOcean': return <DigitalOceanLogo />;
        case 'Railway': return <RailwayLogo />;
        case 'Fly.io': return <FlyLogo />;
        default: return <Server className="w-12 h-12 mb-4 text-white/50" />;
    }
  };

  const getDescription = () => {
    if (provider === 'Vercel') {
        return "Enter your Vercel Personal Access Token to enable deployment monitoring and project analytics.";
    }
    if (isOAuthProvider) {
        return `Connect securely via OAuth 2.0 to sync ${provider} services and deployments.`;
    }
    return `To fetch live CPU and Memory metrics, generate a Personal API Key in your ${provider} Account Settings.`;
  };

  const handleVercelConnect = async () => {
    if (!vercelToken.trim()) {
      setStatus('error');
      setErrorMsg('Please enter your Personal Access Token.');
      return;
    }

    setStatus('connecting');
    setErrorMsg('');
    try {
      await apiClient.post('/connections/vercel', {
        name: 'Vercel Hosting',
        token: vercelToken.trim(),
      });
      setVercelToken('');
      await fetchVercelStatus();
    } catch (err: any) {
      console.error('Vercel Connect Error:', err);
      setStatus('error');
      setErrorMsg(err.response?.data?.message || 'Failed to save token. Please try again.');
    }
  };

  const handleOAuthLogin = async () => {
    setStatus('connecting');
    setTimeout(() => {
        window.location.href = `/api/oauth/${provider.toLowerCase()}`;
    }, 800);
  };

  const handleManualConnect = async () => {
    if (!apiKey) return;
    setStatus('connecting');
    
    // Simulate API call delay
    setTimeout(() => {
        // In a real app, you'd validate the key here
        if (apiKey.length > 5) {
            setStatus('connected');
        } else {
            setStatus('error');
        }
    }, 1500);
    
    if (onConnect) {
        await onConnect(apiKey);
    }
  };

  const getButtonClassName = () => {
      if (status === 'connected') {
          return 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50';
      }
      
      switch (provider) {
          case 'Vercel':
              return 'bg-black hover:bg-zinc-900 text-white border border-zinc-800 shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)]';
          case 'Railway':
              return 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_-3px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_-5px_rgba(147,51,234,0.5)] border border-purple-500/50';
          case 'DigitalOcean':
              return 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_-3px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.5)] border border-blue-500/50';
          case 'Fly.io':
              return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_-3px_rgba(79,70,229,0.3)] border border-indigo-500/50';
          default:
              // Default / Render
              return 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]';
      }
  };

  const getDeploymentStateColor = (state: string) => {
    switch (state?.toUpperCase()) {
      case 'READY': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'ERROR': case 'CANCELED': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'BUILDING': case 'INITIALIZING': case 'QUEUED': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  const timeAgo = (ts: number) => {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (provider === 'Vercel') {
    if (status === 'loading') {
      return (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#181C25] min-h-[calc(100vh-12rem)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white/40">
            <Loader2 className="h-8 w-8 animate-spin text-[#00C2CB]" />
            <p className="text-sm">Loading Vercel status...</p>
          </div>
        </div>
      );
    }

    if (status === 'connected') {
      return (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#181C25] min-h-[calc(100vh-12rem)]">
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-green-500/5 blur-[100px]" />

          <div className="relative z-10 p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <svg viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 fill-white">
                    <path d="M577.344 0L1154.69 1000H0L577.344 0Z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">Vercel</h3>
                    <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400 text-[10px]">
                      <span className="relative flex h-1.5 w-1.5 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>
                      Connected
                    </Badge>
                  </div>
                  {vercelUser && (
                    <p className="text-xs text-white/40">{vercelUser.name || vercelUser.username} &middot; {vercelUser.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-white/40 hover:text-white hover:bg-white/5"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                >
                  {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span className="ml-1.5 text-xs">Disconnect</span>
                </Button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Projects</p>
                <p className="text-2xl font-bold text-white">{projects.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Deployments</p>
                <p className="text-2xl font-bold text-white">{deployments.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Ready</p>
                <p className="text-2xl font-bold text-green-400">{deployments.filter(d => d.state?.toUpperCase() === 'READY').length}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Errors</p>
                <p className="text-2xl font-bold text-red-400">{deployments.filter(d => d.state?.toUpperCase() === 'ERROR').length}</p>
              </div>
            </div>

            {/* Projects + Deployments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Projects */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Box size={14} className="text-[#00C2CB]" />
                  <h4 className="text-sm font-semibold text-white">Projects</h4>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {projects.length === 0 ? (
                    <p className="text-xs text-white/30 py-4 text-center">No projects found</p>
                  ) : projects.map(proj => (
                    <div key={proj.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-[#00C2CB]/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-white truncate">{proj.name}</span>
                          {proj.framework && (
                            <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 flex-shrink-0">{proj.framework}</Badge>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${getDeploymentStateColor(proj.latestDeploymentStatus)}`}>
                          {proj.latestDeploymentStatus}
                        </Badge>
                      </div>
                      {proj.url && (
                        <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#00C2CB]/60 hover:text-[#00C2CB] mt-1 flex items-center gap-1 truncate">
                          <Globe size={10} /> {proj.url.replace('https://', '')}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Deployments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-[#00C2CB]" />
                  <h4 className="text-sm font-semibold text-white">Recent Deployments</h4>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {deployments.length === 0 ? (
                    <p className="text-xs text-white/30 py-4 text-center">No deployments found</p>
                  ) : deployments.map(dep => (
                    <div key={dep.uid} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-[#00C2CB]/20 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-white truncate">{dep.name}</span>
                          <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${getDeploymentStateColor(dep.state)}`}>
                            {dep.state}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-white/30 flex-shrink-0 flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(dep.created)}
                        </span>
                      </div>
                      {dep.meta?.githubCommitMessage && (
                        <p className="text-[11px] text-white/40 truncate flex items-center gap-1">
                          <GitBranch size={10} className="flex-shrink-0 text-white/20" />
                          {dep.meta.githubCommitMessage}
                        </p>
                      )}
                      {dep.url && (
                        <a href={dep.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#00C2CB]/60 hover:text-[#00C2CB] mt-0.5 flex items-center gap-1 truncate">
                          <ExternalLink size={10} /> {dep.url.replace('https://', '')}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Not connected — show setup form
    return (
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#181C25] min-h-[calc(100vh-12rem)]">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-cyan-500/5 blur-[100px]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 h-full min-h-[calc(100vh-12rem)]">

          {/* LEFT: 1/3 — Token input + Connect */}
          <div className="lg:col-span-1 flex flex-col justify-center p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <svg viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 fill-white">
                    <path d="M577.344 0L1154.69 1000H0L577.344 0Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Connect Vercel</h3>
                  <p className="text-xs text-white/40">Personal Access Token</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Vercel Personal Access Token
                </label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="vk1_xxxxxxxxxxxxxxxx"
                    value={vercelToken}
                    onChange={(e) => { setVercelToken(e.target.value); if (status === 'error') setStatus('idle'); }}
                    className="bg-[#0B0E14] border-white/10 text-white placeholder:text-white/20 focus:border-[#00C2CB]/50 focus:ring-[#00C2CB]/20 pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleVercelConnect}
                disabled={status === 'connecting'}
                className="w-full h-11 relative overflow-hidden transition-all duration-300 bg-[#00C2CB] hover:bg-[#00C2CB]/90 text-black font-semibold shadow-[0_0_20px_-3px_rgba(0,194,203,0.3)] hover:shadow-[0_0_30px_-3px_rgba(0,194,203,0.5)]"
              >
                {status === 'connecting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect Vercel
              </Button>

              {errorMsg && status === 'error' && (
                <p className="text-xs text-red-400">{errorMsg}</p>
              )}

              <div className="flex items-center justify-center pt-1">
                {status === 'idle' && (
                  <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    <AlertCircle className="mr-1 h-3 w-3" /> Not Connected
                  </Badge>
                )}
                {status === 'error' && (
                  <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20">
                    <AlertCircle className="mr-1 h-3 w-3" /> Connection Failed
                  </Badge>
                )}
                {status === 'connecting' && (
                  <Badge variant="outline" className="border-[#00C2CB]/30 bg-[#00C2CB]/10 text-[#00C2CB]">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving Token...
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 text-white/20">
                <Shield size={12} />
                <p className="text-[10px]">Token is encrypted before storage. Only you can access it.</p>
              </div>
            </div>
          </div>

          {/* RIGHT: 2/3 — Instructions */}
          <div className="lg:col-span-2 flex flex-col justify-center p-8 lg:p-12">
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold text-[#00C2CB] uppercase tracking-widest mb-2">Setup Guide</p>
                <h2 className="text-2xl font-bold text-white tracking-tight">How to generate your Vercel token</h2>
                <p className="text-sm text-white/40 mt-2 max-w-lg">
                  Follow these steps to create a Personal Access Token from your Vercel dashboard. This token gives Orizon read-only access to your deployments and projects.
                </p>
              </div>

              <div className="space-y-4">
                <div className="group flex items-start gap-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#00C2CB]/20 transition-all">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#00C2CB]/10 border border-[#00C2CB]/20 flex items-center justify-center text-[#00C2CB] text-sm font-bold">1</div>
                  <div>
                    <p className="text-sm font-medium text-white">Open Account Settings</p>
                    <p className="text-xs text-[#A4ADB3] mt-1">Click your profile picture in the top-right corner of Vercel, then select <span className="text-white/70 font-medium">Account Settings</span>.</p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#00C2CB]/20 transition-all">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#00C2CB]/10 border border-[#00C2CB]/20 flex items-center justify-center text-[#00C2CB] text-sm font-bold">2</div>
                  <div>
                    <p className="text-sm font-medium text-white">Navigate to Tokens</p>
                    <p className="text-xs text-[#A4ADB3] mt-1">In the left sidebar, click <span className="text-white/70 font-medium">Tokens</span> to open the token management page.</p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#00C2CB]/20 transition-all">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#00C2CB]/10 border border-[#00C2CB]/20 flex items-center justify-center text-[#00C2CB] text-sm font-bold">3</div>
                  <div>
                    <p className="text-sm font-medium text-white">Create a new token</p>
                    <p className="text-xs text-[#A4ADB3] mt-1">Click <span className="text-white/70 font-medium">Create</span>, name it <span className="font-mono text-[#00C2CB]/80 text-[11px]">"Orizon Dashboard"</span>, and copy the generated token (e.g., <span className="font-mono text-white/50 text-[11px]">vk1_...</span>).</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:border-[#00C2CB]/30 hover:bg-[#00C2CB]/5 transition-all"
                >
                  <ExternalLink size={14} /> Open Vercel Tokens Page <ArrowRight size={12} className="text-white/30" />
                </a>
              </div>

              <div className="flex flex-wrap gap-6 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-2 text-white/30">
                  <Shield size={14} className="text-[#00C2CB]/50" />
                  <span className="text-xs">AES-256 encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-white/30">
                  <Zap size={14} className="text-[#00C2CB]/50" />
                  <span className="text-xs">Real-time deployment sync</span>
                </div>
                <div className="flex items-center gap-2 text-white/30">
                  <Globe size={14} className="text-[#00C2CB]/50" />
                  <span className="text-xs">Multi-project support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Non-Vercel providers: keep original compact card layout
  return (
    <div className="glass-card relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        {getLogo()}
        
        <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">
          Connect {provider} Account
        </h3>
        
        <p className="mb-6 max-w-sm text-sm text-white/60">
          {getDescription()}
        </p>

        <div className="w-full max-w-sm space-y-4">
          {!isOAuthProvider && (
              <div className="relative">
                <Input 
                  type="password" 
                  placeholder={`${provider} API Key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
                />
              </div>
          )}

          <Button 
            onClick={isOAuthProvider ? handleOAuthLogin : handleManualConnect}
            disabled={status === 'connecting' || status === 'connected'}
            className={`w-full relative overflow-hidden transition-all duration-300 ${getButtonClassName()}`}
          >
            {status === 'connecting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'connected' 
                ? 'Connected Successfully' 
                : isOAuthProvider 
                    ? `Sign in with ${provider}` 
                    : 'Connect API Key'
            }
          </Button>

          <div className="flex justify-center pt-2">
            {status === 'idle' && (
              <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20">
                <AlertCircle className="mr-1 h-3 w-3" /> Not Connected
              </Badge>
            )}
            {status === 'connected' && (
              <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 animate-pulse">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Connected - Polling Live Metrics
              </Badge>
            )}
            {status === 'error' && (
               <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20">
                <AlertCircle className="mr-1 h-3 w-3" /> Connection Failed
              </Badge>
            )}
             {status === 'connecting' && (
               <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Verifying Key...
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostingIntegrationCard;
