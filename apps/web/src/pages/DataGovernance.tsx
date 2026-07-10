import React, { useMemo, useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Handle, 
  Position, 
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
  Cpu, 
  Globe,
  AlertCircle,
  Laptop,
  Check,
  X,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDeviceList, useRevokeDevice, useApproveDevice } from '@/features/admin/hooks';
import { supabase } from '@/lib/supabase';
import { buildApiBaseUrl } from '@/lib/apiClient';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

function statusBadgeClass(status: string): string {
  if (status === "APPROVED") {
    return "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20";
  }
  if (status === "PENDING") {
    return "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse";
  }
  return "bg-red-500/10 text-red-500 border border-red-500/20";
}

// --- Main Page Component ---
const DataGovernance = () => {
  // Real-time pending requests state
  const [activeRequest, setActiveRequest] = useState<{
    device_fingerprint: string;
    device_name: string;
    last_ip: string;
  } | null>(null);
  const [customDeviceName, setCustomDeviceName] = useState<string>("");

  // Device List Queries and Mutations
  const { data: devices = [], isLoading: isLoadingDevices, refetch: refetchDevices } = useDeviceList();
  const revokeDeviceMutation = useRevokeDevice();
  const approveDeviceMutation = useApproveDevice();

  // ─── Real-Time SSE Listener for Approved Main Devices ───
  useEffect(() => {
    let sse: EventSource | null = null;

    const connectSSE = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
      const apiBase = buildApiBaseUrl(rawUrl);
      const isRelative = apiBase.startsWith("/") || !apiBase.startsWith("http");
      const absoluteBase = isRelative
        ? `${window.location.protocol}//${window.location.host}${apiBase.replace(/\/$/, "")}`
        : apiBase.replace(/\/$/, "");

      // Pass session JWT as a query param for EventSource compatibility
      const sseUrl = `${absoluteBase}/devices/listen-requests?token=${session.access_token}`;

      sse = new EventSource(sseUrl);

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "login_request") {
            toast.info(`🔑 Unrecognized Device Approval Request: ${data.device_name}`, {
              duration: 8000
            });
            setActiveRequest({
              device_fingerprint: data.device_fingerprint,
              device_name: data.device_name,
              last_ip: data.last_ip
            });
            setCustomDeviceName(`${data.device_name} - Home`);
            refetchDevices();
          } else if (data.event === "device_resolved") {
            refetchDevices();
          }
        } catch (err) {
          // Heartbeats
        }
      };

      sse.onerror = () => {
        sse?.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (sse) sse.close();
    };
  }, [refetchDevices]);

  const handleApproveDevice = (status: "APPROVED" | "DENIED") => {
    if (!activeRequest) return;
    approveDeviceMutation.mutate({
      device_fingerprint: activeRequest.device_fingerprint,
      status,
      device_name: status === "APPROVED" ? customDeviceName.trim() : undefined
    }, {
      onSuccess: () => {
        setActiveRequest(null);
        refetchDevices();
      }
    });
  };

  const handleRevokeDevice = (deviceId: string) => {
    revokeDeviceMutation.mutate(deviceId);
  };

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
    <PageLayout 
      title="Data Governance & Incident Center" 
      subtitle="Cross-platform observability & governance"
      fullWidth={true}
      noPadding={true}
      headerContent={
        <div className="flex items-center gap-3 w-full justify-between lg:justify-end">
          <div className="relative">
            <div className="absolute inset-0 bg-[#34D399] blur-lg opacity-40 animate-pulse" />
            <div className="relative px-4 py-2 bg-[#10B981] text-white text-[10px] font-black rounded-lg flex items-center gap-2 shadow-xl">
              <Zap size={14} className="fill-current" />
              CONNECTED TO OPENMETADATA
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full font-sans">
        {/* Real-time Glassmorphic Device Approval Modal Overlay */}
        {activeRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#00C2CB]/20 bg-[#0B0E14]/90 p-6 text-white shadow-2xl shadow-[#00C2CB]/10">
              {/* Decorative HSL Gradient glow */}
              <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-[#00C2CB]/10 blur-3xl" />
              <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-[#00C2CB]/10 blur-3xl" />

              <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                <div className="rounded-2xl bg-[#00C2CB]/10 p-3 text-[#00C2CB]">
                  <Laptop className="h-6 w-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5">
                    Device Login Attempt
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">Zero-Trust Alert</Badge>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">A new device is requesting dashboard authorization.</p>
                </div>
              </div>

              <div className="my-5 space-y-3.5 text-sm">
                <div className="flex items-center justify-between text-xs border-b border-gray-800/50 pb-2">
                  <span className="text-gray-400">Device Description</span>
                  <span className="font-semibold text-[#00C2CB]">{activeRequest.device_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-gray-800/50 pb-2">
                  <span className="text-gray-400">IP Location</span>
                  <span className="font-mono text-gray-300">{activeRequest.last_ip}</span>
                </div>
                <div className="flex flex-col gap-1.5 pt-2">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Device Nickname (Optional)</span>
                  <Input
                    type="text"
                    value={customDeviceName}
                    onChange={(e) => setCustomDeviceName(e.target.value)}
                    placeholder="e.g. MacBook Pro - Home"
                    className="bg-[#121620] border-gray-800 text-white placeholder-gray-600 focus-visible:ring-[#00C2CB]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleApproveDevice("DENIED")}
                  className="rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  disabled={approveDeviceMutation.isPending}
                >
                  <X className="w-4 h-4 mr-2" /> Deny Access
                </Button>
                <Button
                  type="button"
                  onClick={() => handleApproveDevice("APPROVED")}
                  className="rounded-xl bg-[#00C2CB] text-white hover:bg-[#00C2CB]/80 shadow-lg shadow-[#00C2CB]/20 transition-all font-semibold"
                  disabled={approveDeviceMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-2" /> Authorize Device
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Dashboard - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 min-h-[500px]">
          {/* Left Panel: Lineage Graph */}
          <section className="lg:col-span-2 flex flex-col gap-4 min-h-0">
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden relative shadow-md min-h-[400px]">
              <div className="absolute top-6 left-6 z-10">
                <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2">
                  <Zap size={16} className="text-[#00C2CB]" />
                  Data-Aware Blast Radius
                </h2>
                <p className="text-xs text-[#64748B] mt-1 font-bold">Simulated OpenMetadata flow</p>
              </div>
              <div className="absolute top-6 right-6 z-10 flex gap-2">
                 <Badge className="bg-red-500/10 text-red-500 font-bold border border-red-500/20 shadow-sm"><AlertCircle size={12} className="mr-1"/> High Risk Area</Badge>
              </div>
              
              <ReactFlow
                nodes={initialNodes}
                edges={initialEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                className="bg-slate-50/50"
              >
                <Background color="#E2E8F0" gap={20} size={2} />
                <Controls showInteractive={false} className="bg-white border-slate-200 shadow-md" />
              </ReactFlow>
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
                  
                  {/* Blinking cursor */}
                  <motion.div 
                    animate={{ opacity: [1, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-2 h-4 bg-[#00C2CB] mt-2 inline-block"
                  />
               </div>
            </div>
          </aside>
        </div>

        {/* Bottom Row: Device Matrix */}
        <div className="p-6 pt-0">
          <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <Laptop className="h-5 w-5 text-[#00C2CB]" />
                <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-widest">
                  Zero-Trust Device Governance
                </h2>
              </div>
              <Badge variant="outline" className="border-[#00C2CB]/20 bg-[#00C2CB]/5 text-[#00C2CB] font-bold text-xs">
                {devices.length} registered device{devices.length === 1 ? "" : "s"}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[#64748B] font-bold uppercase tracking-tighter text-[10px]">
                    <th className="px-6 py-3.5">Hardware ID / Device Nickname</th>
                    <th className="px-6 py-3.5">Authorization Status</th>
                    <th className="px-6 py-3.5">IP Location</th>
                    <th className="px-6 py-3.5">Last Synced</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingDevices ? (
                    <tr key="loading-devices">
                      <td colSpan={5} className="h-32 text-center text-[#64748B] animate-pulse">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#00C2CB]" />
                          Loading registered device matrices…
                        </div>
                      </td>
                    </tr>
                  ) : devices.length === 0 ? (
                    <tr key="empty-devices">
                      <td colSpan={5} className="h-32 text-center italic text-[#64748B]">
                        No device fingerprints verified yet. Log in to register a device.
                      </td>
                    </tr>
                  ) : (
                    devices.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${dev.is_main_device ? 'bg-[#00C2CB]/5 border-[#00C2CB]/20 text-[#00C2CB]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                              <Laptop className="h-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                                {dev.device_name}
                                {dev.is_main_device && (
                                  <Badge className="bg-[#00C2CB]/10 text-[#00C2CB] hover:bg-[#00C2CB]/10 text-[8px] font-black uppercase tracking-wider px-1.5 py-0">Main Device</Badge>
                                )}
                              </div>
                              <code className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                                DEV-{dev.device_fingerprint.slice(0, 12)}...
                              </code>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`capitalize font-bold text-[10px] tracking-wider px-2.5 py-0.5 ${statusBadgeClass(dev.status)}`}>
                            {dev.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-[#64748B] text-xs">
                          {dev.last_ip || "Unknown IP"}
                        </td>
                        <td className="px-6 py-4 text-[#64748B]">
                          {new Date(dev.last_login).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {dev.status === "PENDING" && (
                              <Button
                                type="button"
                                onClick={() => {
                                  setActiveRequest({
                                    device_fingerprint: dev.device_fingerprint,
                                    device_name: dev.device_name,
                                    last_ip: dev.last_ip || "Unknown IP"
                                  });
                                  setCustomDeviceName(`${dev.device_name} - Home`);
                                }}
                                variant="outline"
                                className="rounded-xl border-[#00C2CB] text-[#00C2CB] hover:bg-[#00C2CB]/5 font-bold text-xs px-3 h-8 shadow-sm"
                              >
                                Approve / Deny
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg"
                              title="Revoke and wipe device profile"
                              onClick={() => handleRevokeDevice(dev.id)}
                              disabled={revokeDeviceMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

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
    </PageLayout>
  );
};

export default DataGovernance;
