import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Handle, 
  Position, 
  MarkerType,
  Edge,
  Node,
  BaseEdge,
  getBezierPath,
  EdgeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Shield, 
  Terminal, 
  Database, 
  Zap, 
  Activity, 
  Tag, 
  Lock, 
  Cpu, 
  Globe,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- Styles & Constants ---
const COLORS = {
  teal: '#00C2CB',
  red: '#EF4444',
  green: '#10B981',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
};

// --- Custom Components ---

// 1. Lineage Graph Custom Node
interface CustomNodeData {
  label: string;
  type: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  isOMD?: boolean;
}

const CustomNode = ({ data }: { data: CustomNodeData }) => {
  const Icon = data.icon || Zap;
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl border bg-white shadow-xl flex items-center gap-3 min-w-[200px] border-slate-200 transition-all hover:border-[#00C2CB]/50 group`}
    >
      <div className={`p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:text-[#00C2CB] transition-colors`}>
        <Icon size={20} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#64748B] mb-0.5">{data.type}</span>
        <span className="text-sm font-bold text-[#0F172A]">{data.label}</span>
      </div>
      {data.isOMD && (
        <div className="absolute -top-2 -right-2 bg-[#10B981] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
          <Shield size={8} /> OMD
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-300" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-300" />
    </motion.div>
  );
};

// 2. Custom Edge with Threat Glow
const BlastRadiusEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ stroke: '#EF444433', strokeWidth: 4 }} />
      <motion.path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#EF4444"
        strokeWidth={2}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        className="opacity-80"
        style={{
          filter: 'drop-shadow(0 0 4px #EF4444)',
        }}
      />
      <motion.path
        d={edgePath}
        fill="none"
        stroke="#EF4444"
        strokeWidth={1}
        strokeDasharray="4, 12"
        className="animate-blast-edge-dash"
      />
    </>
  );
};

const nodeTypes = { custom: CustomNode };
const edgeTypes = { blast: BlastRadiusEdge };

// --- Main Page Component ---
const DataGovernance = () => {
  // Graph Definitions
  const initialNodes: Node[] = [
    { 
      id: '1', 
      type: 'custom', 
      position: { x: 50, y: 100 }, 
      data: { label: 'Vercel Frontend', type: 'Platform', icon: Globe } 
    },
    { 
      id: '2', 
      type: 'custom', 
      position: { x: 350, y: 100 }, 
      data: { label: 'Node.js Backend', type: 'Runtime', icon: Cpu } 
    },
    { 
      id: '3', 
      type: 'custom', 
      position: { x: 650, y: 100 }, 
      data: { label: 'MongoDB User Table', type: 'Database', icon: Database, isOMD: true } 
    },
  ];

  const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#00C2CB', strokeWidth: 2 } },
    { id: 'e2-3', source: '2', target: '3', type: 'blast' },
  ];

  // Table Data
  const taggingLogs = [
    { trigger: 'Unauthenticated API Route', target: 'production_users_db', tag: 'PII_EXPOSED', status: 'Synced' },
    { trigger: 'Exposed JWT Key', target: 'auth_service', tag: 'SECRET_RISK', status: 'Pending' },
    { trigger: 'Public S3 Bucket', target: 'static_assets', tag: 'DATA_EXPOSURE', status: 'Synced' },
  ];

  // Log Data
  const logs = [
    { time: '14:22:01', msg: 'Init OpenMetadata handshake...', status: 'OK' },
    { time: '14:22:03', msg: 'Security scan detected: Unauthenticated API', status: 'ALERT' },
    { time: '14:22:05', msg: 'Tracing blast radius to: production_users_db', status: 'INFO' },
    { time: '14:22:08', msg: '[POST /api/v1/events] Sending incident to OMD...', status: 'WAIT' },
    { time: '14:22:10', msg: 'Incident response confirmed. ID #8849 logged.', status: 'SUCCESS' },
    { time: '14:22:12', msg: 'OpenMetadata Observability timeline updated.', status: 'OK' },
  ];

  return (
    <div className="flex-1 bg-[#F8FAFC] flex flex-col h-full overflow-hidden font-sans">
      {/* Top Header / Badge Area */}
      <header className="p-6 flex justify-between items-center bg-white border-b border-slate-100 shadow-sm relative z-50">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-[#0F172A] flex items-center gap-2">
            Data Governance & Incident Center
            <span className="text-[10px] bg-[#00C2CB]/10 text-[#00C2CB] px-2 py-0.5 rounded-full uppercase tracking-widest font-black border border-[#00C2CB]/20">Hackathon Build</span>
          </h1>
          <p className="text-xs text-[#64748B] uppercase font-bold tracking-widest mt-1">Cross-platform observability & governance</p>
        </div>
        
        {/* Glowing Badge */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-[#34D399] blur-lg opacity-40 animate-pulse" />
            <div className="relative px-4 py-2 bg-[#10B981] text-white text-[10px] font-black rounded-lg flex items-center gap-2 shadow-xl">
              <Zap size={14} className="fill-current" />
              CONNECTED TO OPENMETADATA
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
        
        {/* Left Panel: Lineage Graph */}
        <section className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden relative shadow-md">
            <div className="absolute top-6 left-6 z-10">
              <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2">
                <Zap size={16} className="text-[#00C2CB]" />
                Data-Aware Blast Radius
              </h2>
              <span className="text-[10px] font-bold text-[#64748B] uppercase">OpenMetadata Lineage View</span>
            </div>
            
            <div className="w-full h-full">
              <ReactFlow 
                nodes={initialNodes} 
                edges={initialEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                className="bg-slate-50/30"
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#CBD5E1" variant="dots" gap={20} />
                <Controls showInteractive={false} className="!bg-white !border-slate-200" />
              </ReactFlow>
            </div>
          </div>
        </section>

        {/* Right Panel: HUD */}
        <aside className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Component 2: Tagging Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md">
            <h2 className="text-xs font-black text-[#0F172A] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Tag size={14} className="text-[#00C2CB]" />
              Automated Governance Tagging
            </h2>
            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-black text-[#64748B] uppercase tracking-tighter">Trigger</th>
                    <th className="px-4 py-3 font-black text-[#64748B] uppercase tracking-tighter">OMD Tag</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {taggingLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F172A]">{log.trigger}</div>
                        <div className="text-[9px] text-[#A4ADB3] font-mono">{log.target}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-black text-[9px] tracking-widest border border-[#EF4444]/20 uppercase">
                          {log.tag}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`h-1.5 w-1.5 rounded-full ${log.status === 'Synced' ? 'bg-[#10B981]' : 'bg-amber-400'} animate-pulse`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-[#A4ADB3] uppercase tracking-widest">
              <span>Sync Health: 98.2%</span>
              <a href="#" className="text-[#00C2CB] hover:underline">View in OMD →</a>
            </div>
          </div>

          {/* Component 3: Incident Log Terminal */}
          <div className="bg-[#0B0E14] rounded-3xl p-6 shadow-xl flex-1 flex flex-col min-h-[300px]">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                   <Terminal size={12} className="text-[#00C2CB]" />
                   OpenMetadata Incident Logs
                </h2>
                <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500/30" />
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500/30" />
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500/30" />
                </div>
             </div>
             
             <div className="flex-1 font-mono text-[11px] space-y-3 overflow-y-auto leading-relaxed scrollbar-hide">
                {logs.map((log, i) => (
                   <motion.div 
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.1 }}
                     key={i} 
                     className="flex gap-3"
                   >
                      <span className="text-[#475569] shrink-0 font-bold">[{log.time}]</span>
                      <span className={`
                         ${log.status === 'ALERT' ? 'text-red-400 font-bold' : ''}
                         ${log.status === 'INFO' ? 'text-blue-300 italic' : ''}
                         ${log.status === 'SUCCESS' ? 'text-green-400 font-black' : ''}
                         ${log.status === 'WAIT' ? 'text-amber-300 animate-pulse' : ''}
                         ${log.status === 'OK' ? 'text-[#A4ADB3]' : ''}
                      `}>
                         <span className="opacity-50 text-white mr-1">&gt;</span> {log.msg}
                      </span>
                   </motion.div>
                ))}
                
                {/* Typing Cursor */}
                <motion.div 
                   animate={{ opacity: [1, 0, 1] }} 
                   transition={{ repeat: Infinity, duration: 0.8 }}
                   className="h-3 w-1.5 bg-[#00C2CB] shadow-[0_0_8px_#00C2CB]"
                />
             </div>
             
             <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[9px] font-black text-[#475569] uppercase tracking-widest">
                <Activity size={10} className="text-[#10B981]" />
                Connection: Secure Channel (AES-256)
             </div>
          </div>

        </aside>
      </main>

      {/* Global CSS for Lineage Dash */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes blast-edge-dash {
          to { stroke-dashoffset: -32; }
        }
        .animate-blast-edge-dash {
          animation: blast-edge-dash 0.85s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default DataGovernance;
