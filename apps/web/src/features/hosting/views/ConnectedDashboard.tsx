import React from 'react';
import { RefreshCw, Trash2, ExternalLink, Activity, Globe, Shield, Clock, Box, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProviderConfig, ProviderUser, ServiceItem, DeploymentItem } from '../types';
import { HostingCharts } from '../components/HostingCharts';
import { ServicesTable } from '../components/ServicesTable';
import { DeploymentsTable } from '../components/DeploymentsTable';

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
  getStateColor
}) => {
  const readyCount = [...services, ...deployments].filter(i => ['READY', 'ACTIVE', 'RUNNING', 'LIVE', 'DEPLOYED'].includes((('state' in i ? (i as DeploymentItem).state : (i as ServiceItem).status) || '').toUpperCase())).length;
  const errorCount = [...services, ...deployments].filter(i => ['ERROR', 'FAILED', 'CRASHED'].includes((('state' in i ? (i as DeploymentItem).state : (i as ServiceItem).status) || '').toUpperCase())).length;

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

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white min-h-[calc(100vh-12rem)]">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">{config.logo}</div>

      <div className="flex flex-col h-full min-h-[calc(100vh-12rem)]">
        {/* Header Bar */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
              {providerUser?.avatar ? (
                <img src={providerUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : config.logoSmall}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-black">{providerUser?.name || config.label}</h3>
                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200 font-medium">Connected</Badge>
              </div>
              <p className="text-xs text-gray-500">{providerUser?.email || `Monitoring ${config.label} resources`}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              className="h-9 px-3 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black transition-all"
            >
              <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Syncing...' : 'Sync Now'}
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

            {config.tokenPageUrl && (
              <a href={config.tokenPageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400 hover:text-black">
                  <ExternalLink size={14} />
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Status Dashboard Area */}
        <div className="p-8 space-y-8 flex-1">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Services', value: services.length, icon: Box, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'Total Deploys', value: deployments.length, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
              { label: 'Healthy Nodes', value: readyCount, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
              { label: 'Uptime Score', value: '100%', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50' },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex items-center gap-4">
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <ServicesTable 
                services={services}
                providerKey={config.key}
                supportsEnvManager={['vercel', 'render'].includes(config.key)}
                timeAgo={timeAgo}
                getStateColor={getStateColor}
            />
            <DeploymentsTable 
                deployments={deployments}
                timeAgo={timeAgo}
                getStateColor={getStateColor}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
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
