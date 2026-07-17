import React, { useState, useEffect, useRef } from 'react';
import { Box, ArrowRight, ExternalLink, Globe, Terminal, ChevronDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ServiceItem } from '../types';
import { HostingEnvDialog } from '../HostingEnvDialog';
import apiClient from '@/lib/apiClient';

interface ServicesTableProps {
  services: ServiceItem[];
  providerKey: string;
  connectionId: string;
  supportsEnvManager: boolean;
  timeAgo: (ts: number) => string;
  getStateColor: (state: string) => string;
}

const getProjectConsoleUrl = (provider: string, serviceName: string, serviceId: string) => {
  const p = provider.toLowerCase();
  if (p === 'vercel') {
    return `https://vercel.com/dashboard/projects/${serviceName}`;
  }
  if (p === 'render') {
    // If it's render, let's link to the render dashboard
    return `https://dashboard.render.com`;
  }
  if (p === 'railway') {
    return `https://railway.app/project/${serviceId}`;
  }
  if (p === 'fly') {
    return `https://fly.io/apps/${serviceName}`;
  }
  if (p === 'digitalocean') {
    return `https://cloud.digitalocean.com/apps/${serviceId}`;
  }
  return null;
};

export const ServicesTable: React.FC<ServicesTableProps> = ({
  services,
  providerKey,
  connectionId,
  supportsEnvManager,
  timeAgo,
  getStateColor
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'logs'>(() => {
    return (localStorage.getItem('servx_preferred_dashboard_view') as 'services' | 'logs') || 'services';
  });

  const handleTabChange = (tab: 'services' | 'logs') => {
    setActiveTab(tab);
    localStorage.setItem('servx_preferred_dashboard_view', tab);
  };

  // Filter out suspended projects from logs UI
  const activeLogServices = services.filter(s => s.status.toLowerCase() !== 'suspended');

  const [selectedLogService, setSelectedLogService] = useState<string>(activeLogServices[0]?.id || '');
  const [logs, setLogs] = useState<string[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Update selected log service if services change
  useEffect(() => {
    if (activeLogServices.length > 0 && (!selectedLogService || !activeLogServices.find(s => s.id === selectedLogService))) {
      setSelectedLogService(activeLogServices[0].id);
    }
  }, [activeLogServices, selectedLogService]);

  // Polling engine for logs
  useEffect(() => {
    if (activeTab !== 'logs' || !selectedLogService) return;
    
    setLogs([]); // Clear logs when switching services
    setIsFetchingLogs(true);

    const fetchLogs = async () => {
      try {
        const url = `/connections/hosting/${providerKey}/logs/${selectedLogService}?connectionId=${encodeURIComponent(connectionId)}`;
      const res = await apiClient.get(url);
        if (res.data && res.data.logs) {
          setLogs(res.data.logs);
        }
      } catch (err) {
        console.error('Failed to fetch logs', err);
      } finally {
        setIsFetchingLogs(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    
    return () => clearInterval(interval);
  }, [activeTab, selectedLogService, providerKey]);

  // Auto-scroll to bottom without jumping the main page
  useEffect(() => {
    if (logsEndRef.current) {
      const container = logsEndRef.current.parentElement;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [logs]);

  const currentServiceName = activeLogServices.find(s => s.id === selectedLogService)?.name || 'Unknown Service';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-300">
      
      {/* Header Tabs */}
      <div className="px-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center space-x-1 -mb-[1px]">
          <button
            onClick={() => handleTabChange('services')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'services' 
                ? 'border-blue-500 text-blue-700 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <Box size={14} className={activeTab === 'services' ? 'text-blue-500' : 'text-gray-400'} />
            Services / Projects
          </button>
          
          <button
            onClick={() => handleTabChange('logs')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'logs' 
                ? 'border-green-500 text-green-700 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            <Terminal size={14} className={activeTab === 'logs' ? 'text-green-500' : 'text-gray-400'} />
            Live Logs
          </button>
        </div>

        {activeTab === 'services' && (
          <button className="text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1">
            Show all <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full relative">
        {activeTab === 'services' ? (
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
            ) : services.map(svc => {
              const consoleLink = getProjectConsoleUrl(providerKey, svc.name, svc.id);
              return (
                <tr key={svc.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-black truncate max-w-[150px]">{svc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs capitalize">{svc.type || 'Unknown'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{timeAgo(svc.updatedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {supportsEnvManager ? (
                        <HostingEnvDialog
                          providerKey={providerKey}
                          serviceId={svc.id}
                          serviceName={svc.name}
                        />
                      ) : null}
                      <Badge variant="outline" className={`text-[10px] ${getStateColor(svc.status)}`}>{svc.status}</Badge>
                      
                      {svc.url && (
                        <a 
                          href={svc.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-gray-400 hover:text-blue-500 transition-colors p-1 hover:bg-blue-50 rounded"
                          title="View Live App"
                        >
                          <Globe size={13} />
                        </a>
                      )}

                      {consoleLink && (
                        <a 
                          href={consoleLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-gray-400 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded"
                          title={`Open project in ${providerKey} dashboard`}
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        ) : activeLogServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <Terminal size={32} className="mb-4 text-gray-300" />
            <p>No active services available for logging.</p>
            <p className="text-xs mt-1">Suspended projects do not emit logs.</p>
          </div>
        ) : (
          /* Live Terminal Light Mode */
          <div className="bg-white border-t border-gray-100 text-gray-800 font-mono text-xs flex flex-col min-h-[300px]">
            {/* Terminal Header with Service Selector */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
              </div>
              
              {activeLogServices.length > 1 ? (
                <div className="relative group cursor-pointer flex items-center">
                  {isFetchingLogs && <Loader2 size={12} className="animate-spin text-gray-400 absolute -left-5 top-1.5" />}
                  <select 
                    className="appearance-none bg-transparent text-gray-600 hover:text-gray-900 font-semibold text-xs pr-6 pl-2 py-1 outline-none cursor-pointer border border-transparent hover:border-gray-300 rounded transition-colors"
                    value={selectedLogService}
                    onChange={(e) => setSelectedLogService(e.target.value)}
                  >
                    {activeLogServices.map(s => (
                      <option key={s.id} value={s.id} className="bg-white text-gray-800">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1.5 text-gray-400 pointer-events-none group-hover:text-gray-700" />
                </div>
              ) : (
                <div className="text-gray-600 text-[11px] font-semibold flex items-center gap-2">
                  {isFetchingLogs && <Loader2 size={12} className="animate-spin text-gray-400" />}
                  {currentServiceName} • Logs
                </div>
              )}
            </div>

            {/* Terminal Body */}
            <div className="p-4 space-y-1.5 overflow-y-auto max-h-[400px]">
              <div className="text-blue-600 font-semibold">$ Connecting to live stream for {currentServiceName}...</div>
              
              {logs.length === 0 && !isFetchingLogs ? (
                <div className="text-gray-500 animate-pulse mt-2">Waiting for new logs...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="break-all whitespace-pre-wrap leading-relaxed">
                    {log.startsWith('[system]') ? (
                      <span className="text-blue-500">{log}</span>
                    ) : log.startsWith('[error]') ? (
                      <span className="text-red-500">{log}</span>
                    ) : (
                      <span className="text-gray-700">{log}</span>
                    )}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
