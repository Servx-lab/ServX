import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Globe, 
  Key, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  CloudLightning,
  Train,
  Box,
  Server,
  Eye,
  EyeOff,
  HelpCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import apiClient from '@/lib/apiClient';

// --- Mock Connect State ---
const MOCK_CONNECTIONS = {
  vercel: true,
  digitalocean: false,
  railway: true,
  render: false,
  fly: false,
};

// --- Logos (SVGs) ---
const VercelLogo = () => (
  <svg viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-black">
    <path d="M577.344 0L1154.69 1000H0L577.344 0Z" />
  </svg>
);

const DigitalOceanLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#0080FF]">
    <path d="M12 12H16V16H12V12Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14Z" fill="currentColor"/>
  </svg>
);

const RenderLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-black">
     <path d="M19.3333 13.3333H4.66667V20H19.3333V13.3333Z" fill="black" fillOpacity="0.9"/>
     <path d="M19.3333 4H4.66667V10.6667H19.3333V4Z" fill="black" fillOpacity="0.5"/>
  </svg>
);

const RailwayLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-black">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const FlyLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600">
     <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.5"/>
     <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
     <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const InfraSettings = () => {
  const [connections, setConnections] = useState(MOCK_CONNECTIONS);
  const [savedConnections, setSavedConnections] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState({ render: '', fly: '' });
  const [vercelToken, setVercelToken] = useState('');
  const [showVercelToken, setShowVercelToken] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fetchConnections = async () => {
        try {
            const response = await apiClient.get('/connections');
            setSavedConnections(response.data);
            
            // Map saved connections to the simple boolean state for UI
            const newConnState = { ...MOCK_CONNECTIONS };
            response.data.forEach((c: any) => {
                const provider = c.provider.toLowerCase();
                if (provider in newConnState) {
                    (newConnState as any)[provider] = true;
                }
            });
            setConnections(newConnState);
        } catch (err) {
            console.error('Failed to fetch connections:', err);
        }
    };

    fetchConnections();

    // Check for query params indicating success from OAuth callback
    const vercelConnected = searchParams.get('vercel_connected');
    const doConnected = searchParams.get('digitalocean_connected');
    const railwayConnected = searchParams.get('railway_connected');
    
    if (vercelConnected === 'true') {
        setConnections(prev => ({ ...prev, vercel: true }));
        // Clean up URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('vercel_connected');
        setSearchParams(newParams);
    }
    if (doConnected === 'true') {
        setConnections(prev => ({ ...prev, digitalocean: true }));
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('digitalocean_connected');
        setSearchParams(newParams);
    }
    if (railwayConnected === 'true') {
        setConnections(prev => ({ ...prev, railway: true }));
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('railway_connected');
        setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  const handleOAuthLogin = (provider: 'digitalocean' | 'railway') => {
    window.location.href = `/api/oauth/${provider}`;
  };

  const handleSaveVercelToken = async () => {
    if (!vercelToken.trim()) return;
    setLoading('vercel');
    try {
      await apiClient.post('/connections/vercel', {
        name: 'Vercel Hosting',
        token: vercelToken.trim(),
      });
      setConnections(prev => ({ ...prev, vercel: true }));
      setVercelToken('');
    } catch (err) {
      console.error('Failed to save Vercel token:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveApiKey = async (provider: 'render' | 'fly') => {
    const token = apiKeys[provider];
    if (!token) return;

    setLoading(provider);
    
    try {
        await apiClient.post('/connections', {
            name: `${provider} Connection`,
            provider: provider.charAt(0).toUpperCase() + provider.slice(1),
            config: { apiKey: token }
        });
        
        setConnections(prev => ({ ...prev, [provider]: true }));
        setApiKeys(prev => ({ ...prev, [provider]: '' }));
    } catch (err) {
        console.error(`Failed to save ${provider} connection:`, err);
    } finally {
        setLoading(null);
    }
  };

  const handleInputChange = (provider: 'render' | 'fly', value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const ConnectionStatusBadge = ({ isConnected }: { isConnected: boolean }) => (
    <Badge 
        variant={isConnected ? "default" : "secondary"}
        className={`bg-opacity-20 backdrop-blur-md border ${
            isConnected 
            ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30' 
            : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'
        }`}
    >
        {isConnected ? (
            <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Connected
            </div>
        ) : (
            <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                Disconnected
            </div>
        )}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-black">
                Infrastructure Connections
            </h1>
            <p className="text-gray-500 max-w-2xl">
                Manage your cloud provider integrations. Connect your infrastructure to enable automated deployments, monitoring, and scaling.
            </p>
        </div>

        {/* 1-Click OAuth Section */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-500">
                <CloudLightning className="w-5 h-5" />
                <h2 className="text-xl font-semibold tracking-tight text-black">OAuth Integrations (1-Click)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* DigitalOcean Card */}
                <Card className="bg-white border-gray-200 shadow-sm hover:border-blue-500/30 hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <DigitalOceanLogo />
                        <ConnectionStatusBadge isConnected={connections.digitalocean} />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <CardTitle className="text-lg text-black">DigitalOcean</CardTitle>
                            <CardDescription className="mt-1.5 text-gray-500">
                                Manage droplets and Kubernetes clusters via OAuth integration.
                            </CardDescription>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                             className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all border border-blue-500/50"
                             onClick={() => handleOAuthLogin('digitalocean')}
                             disabled={loading === 'digitalocean'}
                        >
                            {loading === 'digitalocean' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {connections.digitalocean ? 'Reconnect DigitalOcean' : 'Sign in with DigitalOcean'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Railway Card (Moved to OAuth) */}
                <Card className="bg-white border-gray-200 shadow-sm hover:border-purple-500/30 hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <RailwayLogo />
                        <ConnectionStatusBadge isConnected={connections.railway} />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <CardTitle className="text-lg text-black">Railway</CardTitle>
                            <CardDescription className="mt-1.5 text-gray-500">
                                Connect securely via OAuth 2.0 to sync infrastructure services.
                            </CardDescription>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all border border-purple-500/50"
                            onClick={() => handleOAuthLogin('railway')}
                            disabled={loading === 'railway'}
                        >
                            {loading === 'railway' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {connections.railway ? 'Reconnect Railway' : 'Sign in with Railway'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </section>

        {/* Manual API Key Section */}
        <section className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-indigo-500">
                <Key className="w-5 h-5" />
                <h2 className="text-xl font-semibold tracking-tight text-black">Manual API Connections</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Vercel Card (Personal Access Token) */}
                <Card className="bg-white border-gray-200 shadow-sm hover:border-blue-500/30 hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <VercelLogo />
                        <ConnectionStatusBadge isConnected={connections.vercel} />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg text-black">Vercel</CardTitle>
                                <a 
                                    href="https://vercel.com/account/tokens"
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                                >
                                    Generate token <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <CardDescription className="mt-1.5 text-gray-500">
                                Enter your Personal Access Token to sync deployments and domains.
                            </CardDescription>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="relative">
                                <Input 
                                    type={showVercelToken ? 'text' : 'password'}
                                    placeholder="vk1_xxxxxxxxxxxxxxxx" 
                                    className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 pr-10"
                                    value={vercelToken}
                                    onChange={(e) => setVercelToken(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowVercelToken(!showVercelToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                                >
                                    {showVercelToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-1">
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                    <HelpCircle size={10} className="text-blue-500" /> How to get your token
                                </p>
                                <div className="text-[11px] text-gray-500 leading-relaxed space-y-0.5">
                                    <p>1. Click your profile picture → <span className="text-black">Account Settings</span></p>
                                    <p>2. Click <span className="text-black">Tokens</span> in the left sidebar</p>
                                    <p>3. Click <span className="text-black">Create</span>, name it "ServX Dashboard"</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-all shadow-sm"
                            onClick={handleSaveVercelToken}
                            disabled={loading === 'vercel' || !vercelToken.trim()}
                        >
                            {loading === 'vercel' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {connections.vercel ? 'Reconnect Vercel' : 'Connect Vercel'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Render Card */}
                <Card className="bg-white border-gray-200 shadow-sm hover:border-indigo-500/30 hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <RenderLogo />
                        <ConnectionStatusBadge isConnected={connections.render} />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg text-black">Render</CardTitle>
                                <a 
                                    href="https://dashboard.render.com/user/settings#api-keys" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
                                >
                                    Generate token <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <CardDescription className="mt-1.5 text-gray-500">
                                Enter your API key.
                            </CardDescription>
                        </div>
                        
                        <div className="space-y-2">
                             <Input 
                                type="password" 
                                placeholder="rnd_QK9..." 
                                className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                                value={apiKeys.render}
                                onChange={(e) => handleInputChange('render', e.target.value)}
                             />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all border border-indigo-500/50"
                            onClick={() => handleSaveApiKey('render')}
                            disabled={loading === 'render' || !apiKeys.render}
                        >
                            {loading === 'render' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Connect Key
                        </Button>
                    </CardFooter>
                </Card>

                 {/* Fly.io Card (New) */}
                 <Card className="bg-white border-gray-200 shadow-sm hover:border-indigo-400/30 hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <FlyLogo />
                        <ConnectionStatusBadge isConnected={connections.fly} />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg text-black">Fly.io</CardTitle>
                                <a 
                                    href="https://fly.io/user/personal_access_tokens"
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
                                >
                                    Generate token <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                             <CardDescription className="mt-1.5 text-gray-500">
                                Enter your Personal Access Token.
                            </CardDescription>
                        </div>
                        
                        <div className="space-y-2">
                             <Input 
                                type="password" 
                                placeholder="fly_token..." 
                                className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-indigo-400/50 focus:ring-indigo-400/20"
                                value={apiKeys.fly}
                                onChange={(e) => handleInputChange('fly', e.target.value)}
                             />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white shadow-sm transition-all border border-indigo-400/50"
                            onClick={() => handleSaveApiKey('fly')}
                            disabled={loading === 'fly' || !apiKeys.fly}
                        >
                            {loading === 'fly' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Connect Key
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </section>

    </div>
  );
};

export default InfraSettings;
