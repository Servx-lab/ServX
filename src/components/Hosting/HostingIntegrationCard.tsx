import React, { useState } from 'react';
import { Server, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  // Determine if the provider uses OAuth flow
  const isOAuthProvider = ['Vercel', 'DigitalOcean', 'Railway'].includes(provider);

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
    if (isOAuthProvider) {
        return `Connect securely via OAuth 2.0 to sync ${provider} services and deployments.`;
    }
    return `To fetch live CPU and Memory metrics, generate a Personal API Key in your ${provider} Account Settings.`;
  };

  const handleOAuthLogin = () => {
    setStatus('connecting');
    // Simulate redirect for demo
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

  return (
    <div className="glass-card relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
      {/* Background Glow */}
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
          
          {/* Render Input Field Only for Non-OAuth Providers */}
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
            className={`w-full relative overflow-hidden transition-all duration-300 ${
                status === 'connected' 
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]'
            }`}
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
