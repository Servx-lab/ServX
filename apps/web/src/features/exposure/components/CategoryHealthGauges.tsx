import React from 'react';
import { Network, Cloud, Globe, Key, FileCode2 } from 'lucide-react';
import { ExposureScore } from '../api';

interface CategoryHealthGaugesProps {
  breakdown?: ExposureScore['breakdown'];
}

export const CategoryHealthGauges: React.FC<CategoryHealthGaugesProps> = ({ breakdown }) => {
  const defaultBreakdown = { network: 100, cloud_storage: 100, dns: 100, iam: 100, web_headers: 100 };
  const data = breakdown ?? defaultBreakdown;

  const categories = [
    { key: 'network', label: 'Network', icon: Network, value: data.network, color: 'bg-emerald-500' },
    { key: 'cloud_storage', label: 'Cloud Storage', icon: Cloud, value: data.cloud_storage, color: 'bg-blue-500' },
    { key: 'dns', label: 'DNS Health', icon: Globe, value: data.dns, color: 'bg-indigo-500' },
    { key: 'iam', label: 'IAM Policies', icon: Key, value: data.iam, color: 'bg-purple-500' },
    { key: 'web_headers', label: 'Web Headers', icon: FileCode2, value: data.web_headers, color: 'bg-cyan-500' },
  ];

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Category Health</h3>
        <span className="rounded-full bg-gray-50 px-3 py-1 text-[10px] font-bold text-gray-400">0-100</span>
      </div>

      <div className="space-y-5">
        {categories.map((cat) => {
          // Adjust color based on value
          let finalColor = cat.color;
          if (cat.value < 60) finalColor = 'bg-rose-500';
          else if (cat.value < 80) finalColor = 'bg-yellow-500';

          return (
            <div key={cat.key} className="space-y-2 group">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <cat.icon size={14} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
                  <span className="tracking-wide group-hover:text-gray-900 transition-colors">{cat.label}</span>
                </div>
                <span className={cat.value < 60 ? 'text-rose-500 font-bold' : 'text-gray-500 font-bold'}>
                  {cat.value}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100/80 shadow-inner">
                <div
                  className={`h-full ${finalColor} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
                  style={{ width: `${cat.value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
