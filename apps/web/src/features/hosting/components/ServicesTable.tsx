import React from 'react';
import { Box, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ServiceItem } from '../types';
import { HostingEnvDialog } from '../HostingEnvDialog';

interface ServicesTableProps {
  services: ServiceItem[];
  providerKey: string;
  supportsEnvManager: boolean;
  timeAgo: (ts: number) => string;
  getStateColor: (state: string) => string;
}

export const ServicesTable: React.FC<ServicesTableProps> = ({
  services,
  providerKey,
  supportsEnvManager,
  timeAgo,
  getStateColor
}) => {
  return (
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
                  <div className="flex items-center justify-end gap-2">
                    {supportsEnvManager ? (
                      <HostingEnvDialog
                        providerKey={providerKey}
                        serviceId={svc.id}
                        serviceName={svc.name}
                      />
                    ) : null}
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
  );
};
