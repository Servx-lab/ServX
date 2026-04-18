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

  const anomalyLogs = [
    { time: '05:15 AM', module: 'auth', event: 'login successful (Lakshya) - IP: Local', style: 'normal' },
    { time: '05:30 AM', module: 'git', event: 'push to QuizWhiz/main (Lakshya)', style: 'normal' },
    { time: '06:10 AM', module: 'git', event: 'commit to QuizWhiz UI components (Eeshitha Gone)', style: 'normal' },
    { time: '11:45 AM', module: 'vercel', event: 'deployment triggered for Lakshya GitConnect', style: 'normal' },
    { time: '03:15 AM', module: 'ANOMALY WARN', event: 'git force-push to QuizWhiz/main (Prem Sai Kota) - Out of standard working hours.', style: 'anomaly' },
    { time: '02:30 PM', module: 'CRITICAL', event: 'Massive document drop initiated on MongoDB Cluster 0 (QuizWhiz).', style: 'critical' },
  ];
  
  return (
    <div className="flex-1 bg-[#f8fafc] text-[#0F172A] flex flex-row h-full overflow-hidden font-sans">
      {/* Main Command Canvas - 75% Width */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 text-slate-900">Exposure Analysis</h1>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00C2CB] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Intelligence Active</span>
               </div>
               <span className="text-[10px] items-center gap-1 font-black uppercase tracking-widest text-slate-400 flex italic underline">SLA: SOC-2 COMPLIANT</span>
            </div>
          </div>

          <button className="flex items-center gap-4 bg-white border border-slate-200 px-6 py-3 rounded-2xl hover:border-[#00C2CB]/50 transition-all shadow-lg">
             <Github className="h-4 w-4 text-slate-400" />
             <span className="font-bold text-sm text-slate-700">{selectedRepo}</span>
             <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
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
              className="bg-white p-6 rounded-3xl border border-slate-100 relative overflow-hidden group shadow-md"
            >
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <Clock className="h-3 w-3" style={{ color: timer.color }} />
                  {timer.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-black tabular-nums" style={{ color: timer.color }}>{timer.value}</h2>
                </div>
                <p className="text-[10px] font-bold text-slate-300 mt-2 uppercase italic">{timer.subtitle}</p>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-[0.05]" style={{ backgroundColor: timer.color }} />
            </motion.div>
          ))}
        </div>

        {/* Threat Matrix Section */}
        <div className="mb-12">
           <div className="bg-white border border-slate-100 rounded-[40px] p-8 h-[400px] relative shadow-xl">
              <ResponsiveContainer width="100%" height="100%">
                 <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
                    <XAxis type="number" dataKey="severity" domain={[0, 10]} stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="days" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Vulnerabilities" data={data}>
                       {data.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.severity > 8 ? '#EF4444' : entry.severity > 6 ? '#6C63FF' : '#00C2CB'} />
                       ))}
                    </Scatter>
                 </ScatterChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Remediation Table Section */}
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl mb-12">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Package Instance</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Version Path</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Target Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {data.slice(0, 4).map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                       <td className="px-6 py-4">
                          <div>
                             <p className="text-sm font-bold text-slate-900">{item.package}</p>
                             <p className="text-[10px] text-slate-400 font-mono">{item.name}</p>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#00C2CB]">
                             <span className="text-slate-400 font-normal">v1.2.4</span>
                             <ArrowRight className="h-3 w-3" />
                             <span>v1.2.6-stable</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right tabular-nums text-sm font-black text-slate-900">
                          <button className="px-5 py-2 bg-[#00C2CB] text-white text-[10px] font-black uppercase rounded-xl shadow-sm hover:shadow-lg transition-all">
                             Auto-Fix
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      {/* Anomaly Sidebar - 25% Width (Approx 380px) */}
      <aside className="w-[380px] bg-white border-l border-slate-200 flex flex-col shadow-2xl relative z-20">
         <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
               <Activity className="h-4 w-4 text-[#6C63FF]" />
               Live Anomaly Detection
            </h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Rogue Behavior Feed</p>
         </div>

         <div className="flex-1 overflow-y-auto p-6 font-mono custom-scrollbar">
            <div className="flex flex-col gap-6">
               {anomalyLogs.map((log, i) => (
                  <motion.div 
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.1 }}
                     key={i} 
                     className="flex flex-col gap-1 text-[11px] leading-relaxed"
                  >
                     <span className="text-slate-400 text-[10px] font-bold">[{log.time}]</span>
                     <p className={`
                        ${log.style === 'normal' ? 'text-[#A4ADB3]' : ''}
                        ${log.style === 'anomaly' ? 'text-[#6C63FF] font-bold animate-pulse' : ''}
                        ${log.style === 'critical' ? 'text-[#EF4444] font-extrabold uppercase' : ''}
                     `}>
                        <span className="opacity-50 mr-1">{log.module}:</span> {log.event}
                     </p>
                     <div className="h-px w-8 bg-slate-100 mt-2" />
                  </motion.div>
               ))}
               
               {/* Terminal Cursor Animation */}
               <motion.div 
                  animate={{ opacity: [1, 0, 1] }} 
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="h-3 w-1.5 bg-[#00C2CB]/40 mt-2 shadow-[0_0_8px_#00C2CB44]"
               />
            </div>
         </div>

         {/* Sidebar Status Footer */}
         <div className="p-4 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Engine Status: Stable</span>
               <div className="flex items-center gap-1">
                  {[...Array(3)].map((_, i) => (
                     <div key={i} className="h-1 w-1 rounded-full bg-[#00C2CB]" />
                  ))}
               </div>
            </div>
         </div>
      </aside>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
};

export default ExposureAnalysis;
