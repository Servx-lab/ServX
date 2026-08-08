import React from 'react';
import { Globe, HardDrive, Database, Server } from 'lucide-react';
import { ExposureSummary } from '../api';

interface AssetFootprintGridProps {
  assets?: ExposureSummary['assets'];
}

export const AssetFootprintGrid: React.FC<AssetFootprintGridProps> = ({ assets }) => {
  const stats = [
    { label: 'Domains', value: assets?.domains ?? 0, icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Cloud IPs', value: assets?.ips ?? 0, icon: Server, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Subdomains', value: (assets?.total ?? 0) - (assets?.domains ?? 0) - (assets?.ips ?? 0) - (assets?.buckets ?? 0), icon: HardDrive, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Buckets', value: assets?.buckets ?? 0, icon: Database, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-200 group relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} opacity-20 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150`} />
          <div className="flex items-center gap-3 relative z-10">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110 shadow-sm border border-white/50`}>
              <stat.icon size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">{stat.label}</span>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-4xl font-black tracking-tighter text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 transition-colors">{stat.value}</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${stat.value > 0 ? stat.color : 'text-gray-300'}`}>
              {stat.value > 0 ? 'Active' : 'None'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
