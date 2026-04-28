import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { ServiceItem, DeploymentItem } from '../types';

interface HostingChartsProps {
  deploymentTimeline: { date: string, count: number }[];
  serviceStatusData: { name: string, value: number }[];
  readyCount: number;
  errorCount: number;
  totalResources: number;
}

export const HostingCharts: React.FC<HostingChartsProps> = ({
  deploymentTimeline,
  serviceStatusData,
  readyCount,
  errorCount,
  totalResources
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Chart 1: Deployments Over Time */}
      <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-semibold text-black">Deployments Over Time</h4>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Total: {deploymentTimeline.reduce((acc, curr) => acc + curr.count, 0)}</span>
        </div>
        <div className="h-[140px] w-full">
          {deploymentTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deploymentTimeline} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Resource Distribution</span>
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
                    <Cell key={`cell-${index}`} fill={['READY', 'ACTIVE', 'RUNNING'].includes(entry.name.toUpperCase()) ? '#10B981' : '#F59E0B'} />
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
                  { name: 'Other', value: totalResources - readyCount - errorCount }
                ].filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {[
                  { name: 'Healthy', value: readyCount },
                  { name: 'Errors', value: errorCount },
                  { name: 'Other', value: totalResources - readyCount - errorCount }
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
  );
};
