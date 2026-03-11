import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ExternalLink, ArrowRight, Shield, Zap, Globe, Trash2, RefreshCw, Box, GitBranch, Clock, Server, Activity } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import apiClient from '@/lib/apiClient';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// --- Types ---
interface ServiceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  url: string | null;
  updatedAt: number;
}

interface DeploymentItem {
  id: string;
  name: string;
  url: string | null;
  state: string;
  created: number;
  commit: string | null;
  branch: string | null;
}

interface ProviderUser {
  username: string;
  name: string;
  email: string;
  avatar?: string;
}

interface HostingIntegrationCardProps {
  provider?: 'Render' | 'Vercel' | 'AWS' | 'Railway' | 'DigitalOcean' | 'Fly.io';
  onConnect?: (apiKey: string) => Promise<void>;
}

// --- Provider Config ---
interface ProviderConfig {
  key: string;
  label: string;
  tokenLabel: string;
  placeholder: string;
  tokenPageUrl: string;
  tokenPageLabel: string;
  description: string;
  guideTitle: string;
  guideSubtitle: string;
  steps: { title: string; detail: string }[];
  features: string[];
  logo: React.ReactNode;
  logoSmall: React.ReactNode;
}

const VercelLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} fill-black`}>
    <path d="M577.344 0L1154.69 1000H0L577.344 0Z" />
  </svg>
);

const RenderLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M19.3333 13.3333H4.66667V20H19.3333V13.3333Z" fill="black" fillOpacity="0.9"/>
    <path d="M19.3333 4H4.66667V10.6667H19.3333V4Z" fill="black" fillOpacity="0.5"/>
  </svg>
);

const RailwayLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} text-black`}>
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const DOLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} text-[#0080FF]`}>
    <path d="M12 12H16V16H12V12Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14Z" fill="currentColor"/>
  </svg>
);

const FlyLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} text-purple-600`}>
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.5"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  Vercel: {
    key: 'vercel', label: 'Vercel',
    tokenLabel: 'Vercel Personal Access Token', placeholder: 'vk1_xxxxxxxxxxxxxxxx',
    tokenPageUrl: 'https://vercel.com/account/tokens', tokenPageLabel: 'Open Vercel Tokens Page',
    description: 'Enter your Vercel Personal Access Token to enable deployment monitoring and project analytics.',
    guideTitle: 'How to generate your Vercel token',
    guideSubtitle: 'Follow these steps to create a Personal Access Token from your Vercel dashboard. This token gives Orizon read-only access to your deployments and projects.',
    steps: [
      { title: 'Open Account Settings', detail: 'Click your profile picture in the top-right corner of Vercel, then select Account Settings.' },
      { title: 'Navigate to Tokens', detail: 'In the left sidebar, click Tokens to open the token management page.' },
      { title: 'Create a new token', detail: 'Click Create, name it "Orizon Dashboard", and copy the generated token (e.g., vk1_...).' },
    ],
    features: ['AES-256 encrypted', 'Real-time deployment sync', 'Multi-project support'],
    logo: <VercelLogoSVG className="w-12 h-12" />,
    logoSmall: <VercelLogoSVG />,
  },
  Render: {
    key: 'render', label: 'Render',
    tokenLabel: 'Render API Key', placeholder: 'rnd_xxxxxxxxxxxxxxxx',
    tokenPageUrl: 'https://dashboard.render.com/u/settings#api-keys', tokenPageLabel: 'Open Render API Keys Page',
    description: 'Enter your Render API Key to enable service monitoring, deployment tracking, and resource analytics.',
    guideTitle: 'How to generate your Render API Key',
    guideSubtitle: 'Follow these steps to create an API Key from your Render dashboard. This key gives Orizon access to your services and deployments.',
    steps: [
      { title: 'Open Account Settings', detail: 'Click your profile in the top right of the Render Dashboard and select Account Settings.' },
      { title: 'Navigate to API Keys', detail: 'Click API Keys in the left sidebar menu.' },
      { title: 'Create API Key', detail: 'Click Create API Key, name it "Orizon", and paste the rnd_... token here.' },
    ],
    features: ['AES-256 encrypted', 'Service health monitoring', 'Deploy history tracking'],
    logo: <RenderLogoSVG className="w-12 h-12" />,
    logoSmall: <RenderLogoSVG />,
  },
  Railway: {
    key: 'railway', label: 'Railway',
    tokenLabel: 'Railway API Token', placeholder: 'railway_xxxxxxxxxxxxxxxx',
    tokenPageUrl: 'https://railway.app/account/tokens', tokenPageLabel: 'Open Railway Tokens Page',
    description: 'Enter your Railway API Token to enable project monitoring and deployment analytics.',
    guideTitle: 'How to generate your Railway token',
    guideSubtitle: 'Follow these steps to create an API Token from your Railway account. This token gives Orizon read access to your projects and services.',
    steps: [
      { title: 'Open Account Settings', detail: 'Click your avatar in the bottom-left of Railway, then select Account Settings.' },
      { title: 'Navigate to Tokens', detail: 'Click the Tokens tab to open the API token management page.' },
      { title: 'Create a new token', detail: 'Click Create Token, name it "Orizon Dashboard", copy the generated token.' },
    ],
    features: ['AES-256 encrypted', 'Project monitoring', 'GraphQL-powered sync'],
    logo: <RailwayLogoSVG className="w-12 h-12" />,
    logoSmall: <RailwayLogoSVG />,
  },
  DigitalOcean: {
    key: 'digitalocean', label: 'DigitalOcean',
    tokenLabel: 'DigitalOcean Personal Access Token', placeholder: 'dop_v1_xxxxxxxxxxxxxxxx',
    tokenPageUrl: 'https://cloud.digitalocean.com/account/api/tokens', tokenPageLabel: 'Open DigitalOcean API Tokens',
    description: 'Enter your DigitalOcean Personal Access Token to monitor Apps, Droplets, and Kubernetes clusters.',
    guideTitle: 'How to generate your DigitalOcean token',
    guideSubtitle: 'Follow these steps to create a Personal Access Token from the DigitalOcean cloud console.',
    steps: [
      { title: 'Open API Settings', detail: 'In the DigitalOcean dashboard, click API in the left sidebar (under Account).' },
      { title: 'Generate Token', detail: 'Under Personal access tokens, click Generate New Token.' },
      { title: 'Configure & Copy', detail: 'Name it "Orizon Dashboard", select Read scope, click Generate Token, then copy the dop_v1_... value.' },
    ],
    features: ['AES-256 encrypted', 'App Platform monitoring', 'Droplet analytics'],
    logo: <DOLogoSVG className="w-12 h-12" />,
    logoSmall: <DOLogoSVG />,
  },
  'Fly.io': {
    key: 'fly', label: 'Fly.io',
    tokenLabel: 'Fly.io Auth Token', placeholder: 'FlyV1_xxxxxxxxxxxxxxxx',
    tokenPageUrl: 'https://fly.io/user/personal_access_tokens', tokenPageLabel: 'Open Fly.io Tokens Page',
    description: 'Enter your Fly.io Auth Token to monitor your applications and machines.',
    guideTitle: 'How to generate your Fly.io token',
    guideSubtitle: 'Follow these steps to create a Personal Access Token from your Fly.io dashboard.',
    steps: [
      { title: 'Open Account Settings', detail: 'Go to fly.io, click your avatar in the top right, and select Account.' },
      { title: 'Navigate to Access Tokens', detail: 'In the sidebar, click Access Tokens under Personal.' },
      { title: 'Create Token', detail: 'Click Create Access Token, name it "Orizon Dashboard", and copy the generated value.' },
    ],
    features: ['AES-256 encrypted', 'Machine monitoring', 'Multi-region support'],
    logo: <FlyLogoSVG className="w-12 h-12" />,
    logoSmall: <FlyLogoSVG />,
  },
  AWS: {
    key: 'aws', label: 'AWS',
    tokenLabel: 'AWS Access Key ID : Secret', placeholder: 'AKIA...:wJalrX...',
    tokenPageUrl: 'https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials', tokenPageLabel: 'Open AWS Security Credentials',
    description: 'Enter your AWS Access Key to monitor EC2 instances, Lambda functions, and ECS services.',
    guideTitle: 'How to generate your AWS credentials',
    guideSubtitle: 'Follow these steps to create Access Keys from the AWS IAM console. We recommend a read-only IAM user.',
    steps: [
      { title: 'Open IAM Console', detail: 'Sign in to AWS, search for IAM, and navigate to Users or Security Credentials.' },
      { title: 'Create Access Key', detail: 'Under Access keys, click Create access key. Select "Third-party service" use case.' },
      { title: 'Copy Credentials', detail: 'Copy both the Access Key ID and Secret Access Key. Paste them here as AKIAXXXX:SecretKeyHere.' },
    ],
    features: ['AES-256 encrypted', 'EC2 & Lambda monitoring', 'Multi-service support'],
    logo: <Server className="w-12 h-12 text-[#FF9900]" />,
    logoSmall: <Server className="w-7 h-7 text-[#FF9900]" />,
  },
};

// --- Component ---
const HostingIntegrationCard: React.FC<HostingIntegrationCardProps> = ({
  provider = 'Render',
}) => {
  const config = PROVIDER_CONFIGS[provider];
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'loading'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [providerUser, setProviderUser] = useState<ProviderUser | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [deployments, setDeployments] = useState<DeploymentItem[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async (showLoading = true) => {
    if (!config) { setStatus('idle'); return; }
    if (showLoading) setStatus('loading');
    try {
      const res = await apiClient.get(`/connections/hosting/${config.key}/status`);
      if (res.data.connected) {
        setConnectionId(res.data.connectionId);
        setProviderUser(res.data.user || null);
        setServices(res.data.services || []);
        setDeployments(res.data.deployments || []);
        setStatus('connected');
      } else {
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
    }
  }, [config]);

  // When provider changes: reset state, then fetch
  useEffect(() => {
    setTokenInput('');
    setShowToken(false);
    setErrorMsg('');
    setConnectionId(null);
    setProviderUser(null);
    setServices([]);
    setDeployments([]);
    setDisconnecting(false);
    setRefreshing(false);
    setStatus('loading');

    let cancelled = false;
    (async () => {
      if (!config) { setStatus('idle'); return; }
      try {
        const res = await apiClient.get(`/connections/hosting/${config.key}/status`);
        if (cancelled) return;
        if (res.data.connected) {
          setConnectionId(res.data.connectionId);
          setProviderUser(res.data.user || null);
          setServices(res.data.services || []);
          setDeployments(res.data.deployments || []);
          setStatus('connected');
        } else {
          setStatus('idle');
        }
      } catch {
        if (!cancelled) setStatus('idle');
      }
    })();
    return () => { cancelled = true; };
  }, [provider, config]);

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      setStatus('error');
      setErrorMsg(`Please enter your ${config.tokenLabel}.`);
      return;
    }
    setStatus('connecting');
    setErrorMsg('');
    try {
      await apiClient.post(`/connections/hosting/${config.key}`, {
        name: `${config.label} Hosting`,
        token: tokenInput.trim(),
      });
      setTokenInput('');
      await fetchStatus(false);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.message || 'Failed to save. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    if (!connectionId) return;
    setDisconnecting(true);
    try {
      await apiClient.delete(`/connections/${connectionId}`);
      setStatus('idle');
      setConnectionId(null);
      setProviderUser(null);
      setServices([]);
      setDeployments([]);
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus(false);
    setRefreshing(false);
  };

  const getStateColor = (state: string) => {
    const s = state?.toUpperCase();
    if (['READY', 'ACTIVE', 'RUNNING', 'LIVE', 'DEPLOYED'].includes(s)) return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (['ERROR', 'CANCELED', 'FAILED', 'CRASHED'].includes(s)) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (['BUILDING', 'INITIALIZING', 'QUEUED', 'PENDING', 'DEPLOYING'].includes(s)) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (['SUSPENDED', 'STOPPED'].includes(s)) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-white/50 bg-white/5 border-white/10';
  };

  const timeAgo = (ts: number) => {
    if (!ts) return '';
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const deploymentTimeline = useMemo(() => {
    const counts: Record<string, number> = {};
    deployments.forEach(d => {
      const date = new Date(d.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count })).reverse();
  }, [deployments]);

  const serviceStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach(s => {
      const status = s.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [services]);

  if (!config) return null;

  // --- Loading ---
  if (status === 'loading') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white min-h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm">Loading {config.label} status...</p>
        </div>
      </div>
    );
  }

  // --- Connected Dashboard ---
  if (status === 'connected') {
    const readyCount = [...services, ...deployments].filter(i => ['READY','ACTIVE','RUNNING','LIVE','DEPLOYED'].includes((('state' in i ? (i as DeploymentItem).state : (i as ServiceItem).status) || '').toUpperCase())).length;
    const errorCount = [...services, ...deployments].filter(i => ['ERROR','FAILED','CRASHED'].includes((('state' in i ? (i as DeploymentItem).state : (i as ServiceItem).status) || '').toUpperCase())).length;

    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white min-h-[calc(100vh-12rem)]">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-green-500/5 blur-[100px]" />
        <div className="relative z-10 p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">{config.logoSmall}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-black">{config.label}</h3>
                  <Badge variant="outline" className="border-green-500/30 bg-green-50 text-green-600 text-[10px]">
                    <span className="relative flex h-1.5 w-1.5 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>
                    Connected
                  </Badge>
                </div>
                {providerUser && (
                  <p className="text-xs text-gray-500">{providerUser.name || providerUser.username}{providerUser.email ? ` · ${providerUser.email}` : ''}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-gray-500 hover:text-black hover:bg-gray-100">
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={disconnecting} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span className="ml-1.5 text-xs">Disconnect</span>
              </Button>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Chart 1: Deployments Over Time */}
             <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="text-sm font-semibold text-black">Deployments Over Time</h4>
                   <span className="text-[10px] text-gray-500 uppercase tracking-widest">Total: {deployments.length}</span>
                </div>
                <div className="h-[140px] w-full">
                   {deploymentTimeline.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={deploymentTimeline} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                               <defs>
                                   <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                   </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                               <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                               <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} itemStyle={{ color: '#000' }} />
                               <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorBlue)" />
                           </AreaChart>
                       </ResponsiveContainer>
                   ) : (
                       <div className="flex h-full items-center justify-center text-gray-400 text-xs">No data</div>
                   )}
                </div>
             </div>

             {/* Chart 2: Service Status */}
             <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="text-sm font-semibold text-black">Service Status</h4>
                   <span className="text-[10px] text-gray-500 uppercase tracking-widest">Total: {services.length}</span>
                </div>
                <div className="h-[140px] w-full">
                   {serviceStatusData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={serviceStatusData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                               <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                               <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} itemStyle={{ color: '#000' }} />
                               <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                   {serviceStatusData.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={['READY','ACTIVE','RUNNING'].includes(entry.name.toUpperCase()) ? '#10B981' : '#F59E0B'} />
                                   ))}
                               </Bar>
                           </BarChart>
                       </ResponsiveContainer>
                   ) : (
                       <div className="flex h-full items-center justify-center text-gray-400 text-xs">No data</div>
                   )}
                </div>
             </div>

             {/* Chart 3: Health Overview */}
             <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="text-sm font-semibold text-black">Health Overview</h4>
                   <span className="text-[10px] text-gray-500 uppercase tracking-widest">Healthy vs Errors</span>
                </div>
                <div className="h-[140px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Healthy', value: readyCount },
                                    { name: 'Errors', value: errorCount },
                                    { name: 'Other', value: services.length + deployments.length - readyCount - errorCount }
                                ].filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                { [
                                    { name: 'Healthy', value: readyCount },
                                    { name: 'Errors', value: errorCount },
                                    { name: 'Other', value: services.length + deployments.length - readyCount - errorCount }
                                ].filter(d => d.value > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Healthy' ? '#10B981' : entry.name === 'Errors' ? '#EF4444' : '#F59E0B'} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} itemStyle={{ color: '#000' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-bold text-black">{readyCount}</span>
                        <span className="text-[9px] text-gray-500">Healthy</span>
                    </div>
                </div>
             </div>
          </div>

          {/* Services + Deployments Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Services Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-black flex items-center gap-2">
                  <Box size={14} className="text-blue-500" /> Services / Projects
                </h4>
                <button className="text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1">
                  Show all <ArrowRight size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-gray-400 bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 font-medium">Service Name</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Last Updated</th>
                      <th className="px-5 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-xs text-gray-400">No services found</td>
                      </tr>
                    ) : services.map(svc => (
                      <tr key={svc.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-black truncate max-w-[150px]">{svc.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs capitalize">{svc.type || 'Unknown'}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{timeAgo(svc.updatedAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Badge variant="outline" className={`text-[10px] ${getStateColor(svc.status)}`}>{svc.status}</Badge>
                            {svc.url ? (
                              <a href={svc.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors">
                                <ArrowRight size={14} />
                              </a>
                            ) : (
                              <span className="w-3.5" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deployments Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-black flex items-center gap-2">
                  <Zap size={14} className="text-yellow-500" /> Recent Deployments
                </h4>
                <button className="text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1">
                  Show all <ArrowRight size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-gray-400 bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 font-medium">Deployment</th>
                      <th className="px-5 py-3 font-medium">Commit</th>
                      <th className="px-5 py-3 font-medium">Created</th>
                      <th className="px-5 py-3 font-medium text-right">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deployments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-xs text-gray-400">No deployments found</td>
                      </tr>
                    ) : deployments.map(dep => (
                      <tr key={dep.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-black truncate max-w-[120px]">{dep.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {dep.commit ? (
                            <div className="flex items-center gap-1 truncate max-w-[100px]">
                              <GitBranch size={10} className="text-gray-400 flex-shrink-0" /> <span className="truncate">{dep.commit}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{timeAgo(dep.created)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {['ERROR', 'FAILED', 'CRASHED'].includes((dep.state || '').toUpperCase()) && (
                              <motion.button
                                onClick={() => navigate(`/auto-medic?deploymentId=${dep.id}`)}
                                title="Run Auto-Medic"
                                animate={{
                                  boxShadow: [
                                    "0 0 0 0 rgba(239, 68, 68, 0)",
                                    "0 0 0 4px rgba(239, 68, 68, 0.3)",
                                    "0 0 0 8px rgba(239, 68, 68, 0)"
                                  ]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                                className="w-7 h-7 rounded-full bg-white border border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Activity size={12} />
                              </motion.button>
                            )}
                            <Badge variant="outline" className={`text-[10px] ${getStateColor(dep.state)}`}>{dep.state}</Badge>
                            {dep.url ? (
                              <a href={dep.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors">
                                <ArrowRight size={14} />
                              </a>
                            ) : (
                              <span className="w-3.5" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Not Connected: 1/3 + 2/3 Setup Form ---
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white min-h-[calc(100vh-12rem)]">
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
      <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-blue-500/5 blur-[100px]" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 h-full min-h-[calc(100vh-12rem)]">
        {/* LEFT: 1/3 — Token input */}
        <div className="lg:col-span-1 flex flex-col justify-center p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-gray-200">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">{config.logoSmall}</div>
              <div>
                <h3 className="text-lg font-semibold text-black">Connect {config.label}</h3>
                <p className="text-xs text-gray-500">{config.tokenLabel}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{config.tokenLabel}</label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder={config.placeholder}
                  value={tokenInput}
                  onChange={(e) => { setTokenInput(e.target.value); if (status === 'error') setStatus('idle'); }}
                  className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 pr-10 h-11"
                />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={status === 'connecting'}
              className="w-full h-11 relative overflow-hidden transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-sm"
            >
              {status === 'connecting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect {config.label}
            </Button>

            {errorMsg && status === 'error' && <p className="text-xs text-red-500">{errorMsg}</p>}

            <div className="flex items-center justify-center pt-1">
              {status === 'idle' && (
                <Badge variant="outline" className="border-red-500/20 bg-red-50 text-red-500 hover:bg-red-100">
                  <AlertCircle className="mr-1 h-3 w-3" /> Not Connected
                </Badge>
              )}
              {status === 'error' && (
                <Badge variant="outline" className="border-red-500/30 bg-red-50 text-red-500 hover:bg-red-100">
                  <AlertCircle className="mr-1 h-3 w-3" /> Connection Failed
                </Badge>
              )}
              {status === 'connecting' && (
                <Badge variant="outline" className="border-blue-500/30 bg-blue-50 text-blue-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving Token...
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 text-gray-400">
              <Shield size={12} />
              <p className="text-[10px]">Token is encrypted before storage. Only you can access it.</p>
            </div>
          </div>
        </div>

        {/* RIGHT: 2/3 — Instructions */}
        <div className="lg:col-span-2 flex flex-col justify-center p-8 lg:p-12">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2">Setup Guide</p>
              <h2 className="text-2xl font-bold text-black tracking-tight">{config.guideTitle}</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-lg">{config.guideSubtitle}</p>
            </div>

            <div className="space-y-4">
              {config.steps.map((step, i) => (
                <div key={i} className="group flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-500/20 transition-all">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 text-sm font-bold">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium text-black">{step.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a href={config.tokenPageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 hover:text-black hover:border-blue-500/30 hover:bg-blue-50 transition-all">
                <ExternalLink size={14} /> {config.tokenPageLabel} <ArrowRight size={12} className="text-gray-400" />
              </a>
            </div>

            <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-200">
              {config.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-500">
                  {i === 0 ? <Shield size={14} className="text-blue-500/50" /> : i === 1 ? <Zap size={14} className="text-blue-500/50" /> : <Globe size={14} className="text-blue-500/50" />}
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostingIntegrationCard;
