import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Finding } from '../api';

interface SeverityDistributionChartProps {
  findings?: Finding[];
}

const COLORS = {
  CRITICAL: '#f43f5e', // rose-500
  HIGH: '#f97316',     // orange-500
  MEDIUM: '#eab308',   // yellow-500
  LOW: '#3b82f6',      // blue-500
  INFO: '#94a3b8',     // slate-400
};

export const SeverityDistributionChart: React.FC<SeverityDistributionChartProps> = ({ findings }) => {
  const data = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    findings?.forEach((f) => {
      if (counts[f.severity] !== undefined) {
        counts[f.severity]++;
      }
    });

    return [
      { name: 'CRITICAL', count: counts.CRITICAL, color: COLORS.CRITICAL },
      { name: 'HIGH', count: counts.HIGH, color: COLORS.HIGH },
      { name: 'MEDIUM', count: counts.MEDIUM, color: COLORS.MEDIUM },
      { name: 'LOW', count: counts.LOW, color: COLORS.LOW },
    ];
  }, [findings]);

  const maxCount = Math.max(...data.map(d => d.count), 5); // Minimum scale of 5

  const totalFindings = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col relative overflow-hidden group">
      <div className="mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Vulnerability Spread</h3>
        <p className="text-xs text-gray-400 mt-1">Open findings by severity</p>
      </div>

      <div className="flex-1 min-h-[160px] w-full relative z-10">
        {totalFindings === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] z-20">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3 border border-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <p className="text-sm font-bold text-gray-900">Zero Threats</p>
            <p className="text-xs text-gray-400">Your infrastructure is secure</p>
          </div>
        ) : null}

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
              dy={10}
            />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
            <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} className="transition-all duration-300 hover:opacity-80" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
