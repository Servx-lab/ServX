import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown,
  Github,
  Terminal,
  Activity
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const data = [
  { name: 'CVE-2024-1234', severity: 9.8, days: 14, package: 'lodash' },
  { name: 'CVE-2023-4455', severity: 7.5, days: 45, package: 'express' },
  { name: 'CVE-2024-8892', severity: 8.2, days: 5, package: 'react-dom' },
  { name: 'CVE-2024-0012', severity: 4.5, days: 120, package: 'moment' },
  { name: 'CVE-2023-9912', severity: 6.8, days: 30, package: 'axios' },
  { name: 'CVE-2024-5511', severity: 9.2, days: 48, package: 'undici' },
  { name: 'CVE-2024-6677', severity: 3.1, days: 12, package: 'clsx' },
  { name: 'CVE-2024-3322', severity: 8.9, days: 62, package: 'next' },
  { name: 'CVE-2024-1100', severity: 5.4, days: 18, package: 'zod' },
];

const ExposureAnalysis = () => {
  const [selectedRepo, setSelectedRepo] = useState('ServX Main Core');
  
  return (
    <div className="flex-1 bg-[#0B0E14] text-[#FFFFFF] flex flex-col h-full overflow-hidden font-sans">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Exposure Analysis</h1>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 px-3 py-1 bg-[#181C25] border border-white/5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00C2CB] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#A4ADB3]">Vulnerability Intelligence Live</span>
               </div>
               <span className="text-[10px] items-center gap-1 font-black uppercase tracking-widest text-white/20 flex italic underline">SLA: SOC-2 Compliant</span>
            </div>
          </div>

          <div className="relative group">
            <button className="flex items-center gap-4 bg-[#181C25] border border-white/10 px-6 py-3 rounded-2xl hover:border-[#00C2CB]/50 transition-all shadow-2xl glass-effect">
               <Github className="h-4 w-4 text-[#A4ADB3]" />
               <span className="font-bold text-sm">{selectedRepo}</span>
               <ChevronDown className="h-4 w-4 text-[#A4ADB3]" />
            </button>
          </div>
        </div>

        {/* SLA Timers HUD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Critical Patch Window', value: '18:24:55', color: '#EF4444', subtitle: 'Target: < 24h remediation' },
            { label: 'High Risk Window', value: '42:12:05', color: '#6C63FF', subtitle: 'Target: < 72h remediation' },
            { label: 'Avg Remediation Time', value: '14.5 Days', color: '#00C2CB', subtitle: 'Global Portfolio Benchmark' },
          ].map((timer, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={timer.label}
              className="bg-[#181C25] p-6 rounded-3xl border border-white/5 relative overflow-hidden group shadow-lg"
            >
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A4ADB3] mb-4 flex items-center gap-2">
                  <Clock className="h-3 w-3" style={{ color: timer.color }} />
                  {timer.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-black tabular-nums" style={{ color: timer.color }}>{timer.value}</h2>
                </div>
                <p className="text-[10px] font-bold text-white/30 mt-2 uppercase italic">{timer.subtitle}</p>
              </div>
              {/* Background Glow */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: timer.color }} />
            </motion.div>
          ))}
        </div>

        {/* Threat Matrix Section */}
        <div className="mb-12">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                 <h2 className="text-xl font-black uppercase tracking-tight">Threat Matrix</h2>
                 <div className="h-[2px] w-12 bg-[#6C63FF]" />
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-[#A4ADB3]">
                    <div className="h-2 w-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444]" /> Critical Risk
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-[#A4ADB3]">
                    <div className="h-2 w-2 rounded-full bg-[#6C63FF]" /> High Risk
                 </div>
              </div>
           </div>

           <div className="bg-[#181C25]/50 border border-white/5 rounded-[40px] p-8 h-[450px] relative backdrop-blur-3xl shadow-2xl">
              <ResponsiveContainer width="100%" height="100%">
                 <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      type="number" 
                      dataKey="severity" 
                      name="Severity" 
                      domain={[0, 10]} 
                      stroke="#A4ADB3" 
                      fontSize={10}
                      tickFormatter={(v) => `${v} CVSS`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="days" 
                      name="Days Unpatched" 
                      stroke="#A4ADB3" 
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v} d`}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-[#0B0E14] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                              <p className="text-[10px] font-black text-[#00C2CB] uppercase tracking-widest mb-1">{item.name}</p>
                              <p className="text-sm font-bold text-white mb-2">{item.package}</p>
                              <div className="flex gap-4">
                                 <div><p className="text-[10px] text-[#A4ADB3] uppercase">Severity</p><p className="font-bold text-red-400">{item.severity}</p></div>
                                 <div><p className="text-[10px] text-[#A4ADB3] uppercase">Age</p><p className="font-bold text-white">{item.days} Days</p></div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="Vulnerabilities" data={data}>
                       {data.map((entry, index) => {
                          const isHighRisk = entry.severity > 7 && entry.days > 30;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.severity > 8 ? '#EF4444' : entry.severity > 6 ? '#6C63FF' : '#00C2CB'} 
                              className={isHighRisk ? 'glow-red' : ''}
                            />
                          );
                       })}
                    </Scatter>
                 </ScatterChart>
              </ResponsiveContainer>
              
              {/* Custom CSS for glowing dots */}
              <style dangerouslySetInnerHTML={{ __html: `
                .glow-red {
                  filter: drop-shadow(0 0 8px #EF4444);
                  animation: pulse-red 2s infinite;
                }
                @keyframes pulse-red {
                  0% { opacity: 1; }
                  50% { opacity: 0.6; }
                  100% { opacity: 1; }
                }
                .glass-effect {
                  background: linear-gradient(135deg, rgba(24, 28, 37, 0.8) 0%, rgba(24, 28, 37, 0.4) 100%);
                }
              `}} />
           </div>
        </div>

        {/* Remediation Table Section */}
        <div className="pb-12">
           <div className="flex items-center gap-4 mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Remediation Command</h2>
              <div className="h-[2px] w-12 bg-[#00C2CB]" />
           </div>

           <div className="bg-[#181C25] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-white/5">
                       <th className="px-6 py-4 text-[11px] font-black text-[#A4ADB3] uppercase tracking-widest">Package Instance</th>
                       <th className="px-6 py-4 text-[11px] font-black text-[#A4ADB3] uppercase tracking-widest">Version Path</th>
                       <th className="px-6 py-4 text-[11px] font-black text-[#A4ADB3] uppercase tracking-widest">Environment</th>
                       <th className="px-6 py-4 text-[11px] font-black text-[#A4ADB3] uppercase tracking-widest">CVSS Severity</th>
                       <th className="px-6 py-4 text-[11px] font-black text-[#A4ADB3] uppercase tracking-widest text-right">Target Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {data.slice(0, 6).map((item, i) => (
                       <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-6">
                             <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center">
                                   <Terminal className="h-4 w-4 text-[#A4ADB3]" />
                                </div>
                                <div>
                                   <p className="text-sm font-bold text-white">{item.package}</p>
                                   <p className="text-[10px] text-[#A4ADB3] font-mono">{item.name}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex items-center gap-2 text-xs font-bold">
                                <span className="text-slate-500">v1.2.4</span>
                                <ArrowRight className="h-3 w-3 text-[#00C2CB]" />
                                <span className="text-[#00C2CB]">v1.2.6-stable</span>
                             </div>
                          </td>
                          <td className="px-6 py-6">
                             <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${i % 2 === 0 ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20' : 'bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20'}`}>
                                {i % 2 === 0 ? 'Production' : 'Development'}
                             </span>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex items-center gap-4">
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[80px]">
                                   <div 
                                     className="h-full rounded-full" 
                                     style={{ width: `${item.severity * 10}%`, backgroundColor: item.severity > 8 ? '#EF4444' : '#6C63FF' }} 
                                   />
                                </div>
                                <span className="text-sm font-black tabular-nums">{item.severity}</span>
                             </div>
                          </td>
                          <td className="px-6 py-6 text-right">
                             <button className="px-6 py-2.5 bg-[#00C2CB] hover:bg-[#00AFB8] text-[#0B0E14] text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#00C2CB]/20 flex items-center gap-2 ml-auto">
                                <Activity className="h-3 w-3" />
                                Auto-Fix (Draft PR)
                             </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ExposureAnalysis;
