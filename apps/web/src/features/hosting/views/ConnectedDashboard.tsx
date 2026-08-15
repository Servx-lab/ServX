import { RefreshCw, Trash2, ExternalLink, Activity, Globe, Shield, Clock, Box, Zap, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProviderConfig, ProviderUser, ServiceItem, DeploymentItem } from '../types';
import { HostingCharts } from '../components/HostingCharts';
import { ServicesTable } from '../components/ServicesTable';
import { DeploymentsTable } from '../components/DeploymentsTable';
import { CriticalFailuresSection } from '../components/CriticalFailuresSection';

interface ConnectedDashboardProps {
  config: ProviderConfig;
  providerUser: ProviderUser | null;
  services: ServiceItem[];
  deployments: DeploymentItem[];
  refreshing: boolean;
  disconnecting: boolean;
  onRefresh: () => void;
  onDisconnect: () => void;
  timeAgo: (ts: number) => string;
  getStateColor: (state: string) => string;
  accounts?: any[];
  selectedAccountId?: string;
  activeAccountError?: string | null;
}

export const ConnectedDashboard: React.FC<ConnectedDashboardProps> = ({
  config,
  providerUser,
  services,
  deployments,
  refreshing,
  disconnecting,
  onRefresh,
  onDisconnect,
  timeAgo,
  getStateColor,
  accounts,
  selectedAccountId,
  activeAccountError,
}) => {
  const readyCount = [...services, ...deployments].filter(i => {
    const s = (('state' in i ? (i as DeploymentItem).state : (i as ServiceItem).status) || '').toUpperCase();
    return ['READY', 'ACTIVE', 'RUNNING', 'LIVE', 'DEPLOYED'].includes(s) || s.includes('SUCC');
  }).length;
  
  const errorCount = [...services, ...deployments].filter(i => {
    const s = (('state' in i ? (i as DeploymentItem).state : (i as ServiceItem).status) || '').toUpperCase();
    return ['ERROR', 'FAILED', 'CRASHED'].includes(s) || s.includes('FAIL') || s.includes('ERR');
  }).length;

  // Process timeline data for charts
  const timelineMap: Record<string, number> = {};
  deployments.forEach(d => {
    const dStr = new Date(d.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    timelineMap[dStr] = (timelineMap[dStr] || 0) + 1;
  });
  const deploymentTimeline = Object.entries(timelineMap).map(([date, count]) => ({ date, count })).slice(-7);

  const statusMap: Record<string, number> = {};
  services.forEach(s => {
    const stat = (s.status || 'unknown').toUpperCase();
    statusMap[stat] = (statusMap[stat] || 0) + 1;
  });
  const serviceStatusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const activeAccount = accounts?.find(a => a.connectionId === selectedAccountId || a._id === selectedAccountId);
  const customAvatar = activeAccount?.avatarUrl;
  let resolvedAvatarUrl = customAvatar || providerUser?.avatar;
  if (resolvedAvatarUrl && !resolvedAvatarUrl.startsWith('http')) {
      resolvedAvatarUrl = `https://vercel.com/api/www/avatar/${resolvedAvatarUrl}?s=120`;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">{config.logo}</div>

      <div className="flex flex-col h-full">
        {/* Header Bar */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 shrink-0">
              <div className="w-full h-full rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
                {resolvedAvatarUrl ? (
                  <img src={resolvedAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : config.logoSmall}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-black">
                   {accounts && accounts.find(a => a.connectionId === selectedAccountId)?.alias !== 'Default' 
                     ? accounts.find(a => a.connectionId === selectedAccountId)?.alias 
                     : (providerUser?.name || config.label)}
                </h3>
                {activeAccountError ? (
                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 font-medium animate-pulse">API Error</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200 font-medium">Connected</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">{providerUser?.email || `Monitoring ${config.label} resources`}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing || disconnecting}
              className="h-9 px-3 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-gray-400" : "text-gray-400"} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Force Refresh'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="h-9 px-3 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <Trash2 size={14} className="mr-2" />
              Disconnect
            </Button>

            {config.consoleUrl && (
              <a href={config.consoleUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black transition-all flex items-center gap-1.5"
                >
                  <ExternalLink size={14} className="text-gray-400" />
                  <span>{config.label} Console</span>
                </Button>
              </a>
            )}


          </div>
        </div>

        {/* Status Dashboard Area */}
        <div className="p-8 flex-1 flex flex-col">
          {activeAccountError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Connection Failed</h4>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                We couldn't fetch data from {config.label}. The provider returned the following error:
              </p>
              <div className="px-4 py-3 bg-red-50/50 border border-red-100 rounded-lg text-red-600 text-sm font-mono text-left w-full max-w-lg mb-8 shadow-sm">
                {activeAccountError}
              </div>
              <p className="text-xs text-gray-400 max-w-sm">
                Try forcing a refresh or check your API key permissions. If the API key is expired, please disconnect and reconnect.
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-700">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Active Services', value: services.length, icon: Box, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Total Deploys', value: deployments.length, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                  { label: 'Healthy Nodes', value: readyCount, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
              { label: 'Uptime Score', value: '100%', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50' },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl bg-white flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">{stat.label}</p>
                  <p className="text-xl font-bold text-black leading-tight">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <HostingCharts 
            deploymentTimeline={deploymentTimeline}
            serviceStatusData={serviceStatusData}
            readyCount={readyCount}
            errorCount={errorCount}
            totalResources={services.length + deployments.length}
          />

          {/* Core Infrastructure & Failures Layout */}
          <div className="space-y-8">
            {/* Top Row: Services (Full Width) */}
            <div className="w-full min-w-0">
              <ServicesTable 
                  services={services}
                  providerKey={config.key}
                  connectionId={selectedAccountId || ''}
                  supportsEnvManager={['vercel', 'render'].includes(config.key)}
                  timeAgo={timeAgo}
                  getStateColor={getStateColor}
              />
            </div>

            {/* Middle Row: Recent Deployments (Full Width) */}
            <div className="w-full min-w-0">
              <DeploymentsTable 
                  deployments={deployments}
                  timeAgo={timeAgo}
                  getStateColor={getStateColor}
              />
            </div>

            {/* Bottom Row: Incident Records */}
            <div className="w-full min-w-0">
              <CriticalFailuresSection 
                  timeAgo={timeAgo}
                  getStateColor={getStateColor}
              />
            </div>
          </div>
          </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Clock size={12} /> Last synced: Just now
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Globe size={12} /> Real-time monitoring active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
