import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldAlert, 
  Power, 
  Image as ImageIcon, 
  Sparkles, 
  UserPlus, 
  Fingerprint, 
  Database, 
  Trash2, 
  RefreshCw, 
  DollarSign, 
  AlertTriangle, 
  Globe, 
  Ban, 
  CheckCircle2,
  Lock,
  Zap,
  Activity,
  ChevronDown,
  Loader2,
  Search,
  Check,
  FolderKanban,
  Triangle,
  Server,
  Terminal,
  Pause,
  Play,
  Copy,
  Send,
  ShieldX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/apiClient';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectProvider, useProject } from "./ProjectContext";
import { useAuditStream } from './hooks';
import { logClientEvent } from './api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Default fallbacks
const DEFAULT_KILL_SWITCHES = { maintenance: false, flags: { imageUploads: true, aiFeatures: true, newSignups: true } };
const DEFAULT_FINOPS = { currentCost: 0.84, projected: 1.28, threshold: 1.00 };
const DEFAULT_API_IPS = [
  { ip: '185.220.101.5', location: 'Frankfurt, DE', reqs: 14023, status: 'active' as const },
  { ip: '45.138.89.201', location: 'Moscow, RU', reqs: 9231, status: 'active' as const },
  { ip: '8.8.8.8', location: 'California, US', reqs: 3102, status: 'active' as const },
  { ip: '192.168.1.105', location: 'Local Subnet', reqs: 412, status: 'active' as const },
];

// --- 1. DEFCON Threat Matrix ---
interface DefconMatrixProps {
  currentState: number;
  onStateChange: (state: number) => Promise<void>;
}

const DefconMatrix = ({ currentState, onStateChange }: DefconMatrixProps) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleZoneClick = async (targetState: number) => {
    if (targetState === currentState) return;

    if (targetState === 1) {
      // Engages Lockdown - prompt for written authentication
      setConfirmText("");
      setShowConfirmModal(true);
    } else {
      // Normal or Elevated toggle directly
      setLoading(true);
      try {
        await onStateChange(targetState);
        toast.success(`DEFCON level updated successfully to DEFCON ${targetState}`);
      } catch (err: any) {
        toast.error("Failed to transition threat matrix level.");
      } finally {
        setLoading(false);
      }
    }
  };

  const executeLockdown = async () => {
    if (confirmText !== "LOCKDOWN") return;
    setLoading(true);
    try {
      await onStateChange(1);
      setShowConfirmModal(false);
      toast.error("CRITICAL LOCKDOWN ENGAGED - ALL TRAFFIC SUSPENDED");
    } catch (err: any) {
      toast.error("Failed to engage lockdown.");
    } finally {
      setLoading(false);
    }
  };

  const isLockdown = currentState === 1;

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border bg-white p-8 shadow-lg transition-colors transition-shadow duration-500
      ${isLockdown 
        ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.2)] animate-[pulse_2s_infinite]' 
        : 'border-gray-200'}
    `}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-black font-mono uppercase tracking-widest text-xs font-bold mb-1">
            <ShieldAlert className={`w-4 h-4 ${isLockdown ? 'text-red-500 animate-bounce' : 'text-gray-500'}`} />
            System Control Panel
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">DEFCON Threat Matrix</h2>
        </div>
        <div className="flex items-center gap-2">
          {isLockdown ? (
            <Badge variant="destructive" className="bg-red-500 text-white font-mono text-xs px-3 py-1 animate-pulse border-none">
              🚨 LOCKDOWN ENGAGED
            </Badge>
          ) : currentState === 3 ? (
            <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 font-mono text-xs px-3 py-1">
              ⚠️ ELEVATED THREAT LEVEL
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 font-mono text-xs px-3 py-1">
              🟢 baseline operations
            </Badge>
          )}
        </div>
      </div>

      {/* Segmented Dial Zones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        
        {/* Zone 1: Normal */}
        <button
          type="button"
          onClick={() => handleZoneClick(5)}
          disabled={loading}
          className={`
            relative p-6 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-40
            ${currentState === 5
              ? 'bg-emerald-50 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-400'
              : 'bg-slate-50 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/20'}
          `}
        >
          <div className="flex justify-between items-start w-full">
            <div className={`p-2.5 rounded-lg ${currentState === 5 ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-emerald-500'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs text-gray-400 font-bold">DEFCON 5 / 4</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-lg mb-1">Normal Baseline</h4>
            <p className="text-xs text-gray-500">All standard traffic allowed. Standard verification pipelines active.</p>
          </div>
        </button>

        {/* Zone 2: Elevated */}
        <button
          type="button"
          onClick={() => handleZoneClick(3)}
          disabled={loading}
          className={`
            relative p-6 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-40
            ${currentState === 3
              ? 'bg-amber-50 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400'
              : 'bg-slate-50 border-gray-100 hover:border-amber-300 hover:bg-amber-50/20'}
          `}
        >
          <div className="flex justify-between items-start w-full">
            <div className={`p-2.5 rounded-lg ${currentState === 3 ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-amber-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs text-gray-400 font-bold">DEFCON 3 / 2</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-lg mb-1">Elevated Threat</h4>
            <p className="text-xs text-gray-500">Dashboard warning indicators active. Security filters highly sensitive.</p>
          </div>
        </button>

        {/* Zone 3: Lockdown */}
        <button
          type="button"
          onClick={() => handleZoneClick(1)}
          disabled={loading}
          className={`
            relative p-6 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-40
            ${currentState === 1
              ? 'bg-red-50 border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.2)] ring-1 ring-red-400 animate-pulse'
              : 'bg-slate-50 border-gray-100 hover:border-red-300 hover:bg-red-50/20'}
          `}
        >
          <div className="flex justify-between items-start w-full">
            <div className={`p-2.5 rounded-lg ${currentState === 1 ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-red-500'}`}>
              <Lock className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs text-gray-400 font-bold">DEFCON 1</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-lg mb-1">System Lockdown</h4>
            <p className="text-xs text-gray-500">POST/PUT/DELETE rejected. All sessions invalidated. Maximum firewall active.</p>
          </div>
        </button>

      </div>

      {/* Confirmation Modal overlay (Custom Glassmorphic Overlay) */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-5 text-black"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-3 bg-red-50 rounded-full">
                  <ShieldX className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Engage Global Lockdown?</h3>
                  <p className="text-xs text-gray-500">Critical Administrative Action</p>
                </div>
              </div>

              <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl text-xs text-red-950 font-medium leading-relaxed">
                ⚠️ **WARNING:** Engaging lockdown will immediately reject all REST write requests, invalidate active tokens, and log everyone out. System will run in read-only mode until restored.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Type <span className="font-mono font-extrabold text-red-600 bg-red-50 px-1 py-0.5 rounded">LOCKDOWN</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type LOCKDOWN"
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono text-black focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="border-gray-200 hover:bg-gray-50 text-slate-700"
                >
                  Abort Action
                </Button>
                <Button
                  disabled={confirmText !== "LOCKDOWN" || loading}
                  onClick={executeLockdown}
                  className={`
                    px-4 py-2 text-white font-semibold transition-all
                    ${confirmText === "LOCKDOWN" 
                      ? 'bg-red-600 hover:bg-red-700 shadow-lg' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                  `}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Lockdown"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


// --- 2. Active Circuit Breakers ---
const CircuitBreakers = () => {
  const [circuits, setCircuits] = useState<Record<string, 'OPEN' | 'CLOSED'>>({
    openai: 'CLOSED',
    resend: 'CLOSED',
    vercel: 'CLOSED',
  });
  const [tripping, setTripping] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchCircuits = async () => {
    try {
      const { data } = await apiClient.get('/operations/circuits');
      if (data?.states) {
        setCircuits(data.states);
      }
    } catch {
      toast.error("Failed to read active circuit breaker states.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCircuits();
  }, []);

  const handleToggle = (service: string) => {
    const currentState = circuits[service] || 'CLOSED';
    const nextState = currentState === 'CLOSED' ? 'OPEN' : 'CLOSED';

    // Micro-interaction: localized skeleton loader
    setTripping(prev => ({ ...prev, [service]: true }));

    setTimeout(async () => {
      try {
        const { data } = await apiClient.post('/operations/circuits/toggle', { service, state: nextState });
        if (data?.success) {
          setCircuits(prev => ({ ...prev, [service]: nextState }));
          if (nextState === 'OPEN') {
            toast.error(`Circuit for ${service.toUpperCase()} tripped (OPEN)`);
          } else {
            toast.success(`Circuit for ${service.toUpperCase()} reset (CLOSED/Healthy)`);
          }
        }
      } catch (err: any) {
        toast.error(`Failed to update ${service} breaker state.`);
      } finally {
        setTripping(prev => ({ ...prev, [service]: false }));
      }
    }, 1000);
  };

  const services = [
    { key: 'openai', name: 'OpenAI Diagnosis Engine', desc: 'Auto-Medic log debugging intelligence', icon: Sparkles },
    { key: 'resend', name: 'Resend Transactional Mail', desc: 'Outbound user alert/verification notifications', icon: Send },
    { key: 'vercel', name: 'Vercel Deployment Router', desc: 'Hosting proxies and Edge Config updates', icon: Triangle },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-800 mb-1">
        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
        <h3 className="text-xl font-bold tracking-tight">Active Circuit Breakers</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((srv) => {
          const state = circuits[srv.key] || 'CLOSED';
          const isTripping = !!tripping[srv.key];
          const isOpen = state === 'OPEN';

          if (loading || isTripping) {
            // Localized custom skeleton loader block
            return (
              <div 
                key={srv.key} 
                className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 h-44 flex flex-col justify-between animate-pulse"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </div>
                  </div>
                </div>
                <div className="text-xs font-mono italic text-slate-400 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-200">
                  <Activity className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                  Calculating impact...
                </div>
                <div className="h-9 w-full bg-slate-200 rounded-lg" />
              </div>
            );
          }

          return (
            <div
              key={srv.key}
              className={`
                bg-white shadow-sm border rounded-2xl p-5 h-44 flex flex-col justify-between transition-all duration-300
                hover:-translate-y-1 hover:shadow-md
                ${isOpen ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}
              `}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border ${isOpen ? 'bg-red-100 text-red-600 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    <srv.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{srv.name}</h4>
                    <p className="text-[10px] text-gray-400 leading-normal mt-0.5">{srv.desc}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">Status:</span>
                {isOpen ? (
                  <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] uppercase font-mono px-2 py-0.5 rounded">
                    🔴 Circuit Open (Tripped)
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] uppercase font-mono px-2 py-0.5 rounded">
                    🟢 Circuit Closed (Healthy)
                  </Badge>
                )}
              </div>

              <Button
                size="sm"
                onClick={() => handleToggle(srv.key)}
                className={`
                  w-full h-9 text-xs font-semibold rounded-lg transition-all
                  ${isOpen 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                    : 'bg-red-50 border border-red-200 hover:bg-red-100 text-red-600'}
                `}
              >
                {isOpen ? "Reset Circuit (Restore)" : "Trip Circuit (Override)"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// --- 3. Kill Switch & Feature Flags ---
const FeatureFlags = () => {
    const { selectedProjectId, selectedProject, killSwitchOverrides, setKillSwitchOverride } = useProject();
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);
    const override = selectedProjectId ? killSwitchOverrides[selectedProjectId] : undefined;
    const maintenance = override?.maintenance ?? DEFAULT_KILL_SWITCHES.maintenance;
    const flags = override?.flags ?? DEFAULT_KILL_SWITCHES.flags;

    const toggleMaintenance = async () => {
        if (!selectedProjectId || !selectedProject) return;
        const next = !maintenance;
        setMaintenanceLoading(true);
        try {
            const { data } = await apiClient.post('/operations/toggle-maintenance', {
                projectId: selectedProjectId,
                provider: selectedProject.provider,
                isEnabled: next,
            });
            if (data?.success) {
                setKillSwitchOverride(selectedProjectId, { maintenance: next, flags });
                if (next) toast.error("MAINTENANCE MODE ACTIVATED - TRAFFIC BLOCKED");
                else toast.success("Maintenance Mode Deactivated - Traffic Restored");
            } else {
                toast.error(data?.message || "Failed to toggle maintenance mode");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Failed to toggle maintenance mode";
            toast.error(msg);
        } finally {
            setMaintenanceLoading(false);
        }
    };

    return (
        <div className="glass-card relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6 text-black">
                <Power className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold tracking-tight">Kill Switches & Features</h3>
            </div>

            <div className="space-y-6">
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Project</p>
                    <ProjectSelectDropdown />
                </div>

                <div className={`
                    relative p-5 rounded-lg border transition-all duration-300
                    ${maintenance 
                        ? 'bg-red-50 border-red-200 shadow-[0_0_30px_-5px_rgba(239,68,68,0.1)]' 
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'}
                `}>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className={`font-bold transition-colors ${maintenance ? 'text-red-500' : 'text-black'}`}>
                                Global Maintenance Mode
                            </h4>
                            <p className="text-xs text-gray-500">
                                Immediately blocks all non-admin traffic.
                            </p>
                        </div>
                        {maintenanceLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                        ) : (
                            <Switch
                                checked={maintenance}
                                onCheckedChange={toggleMaintenance}
                                disabled={maintenanceLoading || !selectedProject}
                                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200"
                            />
                        )}
                    </div>
                    {maintenance && (
                        <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-lg pointer-events-none" />
                    )}
                </div>

                <div className="space-y-4">
                  <FlagItem icon={ImageIcon} label="Image Uploads" active={flags.imageUploads} color="text-blue-500" />
                  <FlagItem icon={Sparkles} label="Beta AI Features" active={flags.aiFeatures} color="text-purple-500" />
                  <FlagItem icon={UserPlus} label="New User Signups" active={flags.newSignups} color="text-green-500" />
                </div>
            </div>
        </div>
    );
};

const FlagItem = ({ icon: Icon, label, active, color }: any) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 transition-colors">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md bg-white border border-gray-200 ${active ? color : 'text-gray-400'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`text-sm font-medium ${active ? 'text-black' : 'text-gray-400 line-through'}`}>
                {label}
            </span>
        </div>
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
    </div>
);


// --- 4. Ghost Mode / User CRM ---
const UserCRM = () => {
    const users = [
        { name: 'Prem Sai', role: 'Admin', email: 'prem@syntro.com', status: 'Active' },
        { name: 'Eeshitha', role: 'Editor', email: 'eeshitha@syntro.com', status: 'Away' },
        { name: 'Chitkul', role: 'Viewer', email: 'chitkul@syntro.com', status: 'Active' },
    ];

    const handleImpersonate = async (user: string) => {
        toast.message(`Generating Session Token...`, {
            description: `Signing in as ${user}`,
        });
        setTimeout(async () => {
            toast.success(`Logged in as ${user}`, {
                description: 'Restricted Session Active (Audit Logged)',
                icon: <Fingerprint className="w-4 h-4 text-purple-400" />,
            });
            try {
                await logClientEvent('auth', `Admin simulated restricted session impersonation for user '${user}'`);
            } catch (err) {
                console.warn('Failed to submit client event logging:', err);
            }
        }, 1500);
    };

    return (
        <div className="glass-card relative overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-sm h-full flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-black">
                    <Fingerprint className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold tracking-tight">Ghost Mode</h3>
                </div>
                <Badge variant="outline" className="border-purple-500/30 text-purple-600 bg-purple-50">
                    ADMIN ONLY
                </Badge>
            </div>
            
            <div className="p-4">
                <div className="space-y-3">
                    {users.map((u, i) => (
                        <div key={i} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-gray-200">
                                    <AvatarFallback className="bg-gray-100 text-black text-xs">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium text-black group-hover:text-purple-600 transition-colors">{u.name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{u.email}</span>
                                        <span className="text-[10px] text-gray-400">• {u.role}</span>
                                    </div>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleImpersonate(u.name)}
                                className="h-8 border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                            >
                                Impersonate
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- Target Selector Dropdown ---
const HOSTING_PROVIDERS = ['vercel', 'render', 'railway', 'digitalocean', 'fly', 'aws'];
const PROVIDER_TO_KEY: Record<string, string> = {
    Vercel: 'vercel', Render: 'render', Railway: 'railway',
    DigitalOcean: 'digitalocean', 'Fly.io': 'fly', AWS: 'aws',
};

const TargetSelect = ({
    value,
    onChange,
    placeholder,
    options,
    disabled,
    open,
    onOpenChange,
}: {
    value: string;
    onChange: (id: string) => void;
    placeholder: string;
    options: { id: string; label: string }[];
    disabled?: boolean;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 280 });

    const selectedLabel = options.find(o => o.id === value)?.label;
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    useEffect(() => {
        if (open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 280),
            });
        }
    }, [open]);

    const dropdownContent = open ? (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={() => { onOpenChange(false); setSearchQuery(''); }} />
            <div
                className="fixed z-[9999] rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
                style={{ top: position.top, left: position.left, width: position.width, minWidth: 280 }}
            >
                <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="w-full pl-9 pr-3 py-2.5 text-sm text-black bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="max-h-52 overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500 text-center">
                            {options.length === 0 ? 'No options available' : 'No matches found'}
                        </div>
                    ) : (
                        filteredOptions.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => { onChange(opt.id); onOpenChange(false); setSearchQuery(''); }}
                                className={`w-full px-4 py-3 text-left text-base hover:bg-gray-50 transition-colors flex items-center gap-3 ${value === opt.id ? 'bg-blue-50 text-blue-600' : 'text-black'}`}
                            >
                                <span className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${value === opt.id ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                    {value === opt.id && <Check className="w-3 h-3 text-white" />}
                                </span>
                                <span className="truncate">{opt.label}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </>
    ) : null;

    return (
        <div className="relative w-full">
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => { onOpenChange(!open); if (!open) setSearchQuery(''); }}
                className={`
                    w-full min-w-0 px-4 py-3 text-left text-base rounded-lg
                    bg-white border transition-all duration-200
                    flex items-center justify-between gap-2
                    ${open ? 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]' : 'border-gray-200'}
                    ${selectedLabel ? 'text-black' : 'text-gray-500'}
                    hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.5)]
                `}
            >
                <span className="truncate text-sm">{selectedLabel || placeholder}</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}" />
            </button>
            {typeof document !== 'undefined' && document.body && createPortal(dropdownContent, document.body)}
        </div>
    );
};


// --- 5. Remote Task Executor ---
const TaskExecutor = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([
        { id: 1, taskKey: 'backup-db', name: 'Force DB Backup', desc: 'Trigger full backup of selected database', icon: Database, running: false, done: false },
        { id: 2, taskKey: 'clear-redis', name: 'Clear Redis Cache', desc: 'Flush cache for selected environment', icon: Trash2, running: false, done: false },
        { id: 3, taskKey: 'sync-github', name: 'Sync GitHub Stats', desc: 'Refresh analytics for selected repo', icon: RefreshCw, running: false, done: false },
    ]);

    const [selections, setSelections] = useState<Record<number, string>>({ 1: '', 2: '', 3: '' });
    const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });

    const [preflightStates, setPreflightStates] = useState<Record<number, 'idle' | 'assessing' | 'preflight' | 'executing' | 'done'>>({ 1: 'idle', 2: 'idle', 3: 'idle' });
    const [preflightData, setPreflightData] = useState<Record<number, { affectedComponents: number; impactLevel: 'low' | 'medium' | 'high'; description: string } | null>>({ 1: null, 2: null, 3: null });

    const [dbOptions, setDbOptions] = useState<{ id: string; label: string }[]>([]);
    const [envOptions, setEnvOptions] = useState<{ id: string; label: string }[]>([]);
    const [repoOptions, setRepoOptions] = useState<{ id: string; label: string }[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);

    const fetchOptions = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const [connRes, githubRes] = await Promise.all([
                apiClient.get('/connections').catch(() => ({ data: [] })),
                apiClient.get('/github/repos', { skipAuthErrorLog: true }).catch(() => ({ data: [] })),
            ]);

            const connections = connRes?.data || [];
            const dbConns = connections.filter((c: any) => {
                const p = (c.provider || '').trim().toLowerCase();
                const key = PROVIDER_TO_KEY[c?.provider] ?? p.replace(/\.io$/, '');
                return !HOSTING_PROVIDERS.includes(key);
            });
            setDbOptions(dbConns.map((c: any) => ({ id: c._id, label: `${c.provider || 'DB'} - ${c.name}` })));

            const hostingConns = connections.filter((c: any) => {
                const key = PROVIDER_TO_KEY[c?.provider] || (c?.provider || '').trim().toLowerCase().replace(/\.io$/, '');
                return key && HOSTING_PROVIDERS.includes(key);
            });
            const envList: { id: string; label: string }[] = [];
            await Promise.all(hostingConns.map(async (conn: any) => {
                const key = PROVIDER_TO_KEY[conn.provider] || (conn.provider || '').trim().toLowerCase().replace(/\.io$/, '');
                if (!key || !['vercel', 'render', 'railway', 'digitalocean', 'fly'].includes(key)) return;
                try {
                    const res = await apiClient.get(`/connections/hosting/${key}/status`);
                    const services = res.data?.services || [];
                    services.forEach((s: any) => envList.push({ id: `${conn._id}::${s.id}`, label: `${s.name} - ${conn.name}` }));
                } catch { /* ignore */ }
            }));
            setEnvOptions(envList);

            const repos = githubRes?.data || [];
            setRepoOptions(repos.map((r: any) => ({ id: String(r.id), label: r.full_name || r.name })));
        } catch (err: any) {
            if (err?.response?.status === 401) {
                toast.error("GitHub connection expired", {
                    description: "Please reconnect your GitHub account in settings.",
                    action: {
                        label: "Reconnect",
                        onClick: () => navigate('/github')
                    }
                });
            }
            setDbOptions([]);
            setEnvOptions([]);
            setRepoOptions([]);
        } finally {
            setLoadingOptions(false);
        }
    }, [navigate]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    const getOptionsForTask = (taskId: number) => {
        if (taskId === 1) return dbOptions;
        if (taskId === 2) return envOptions;
        return repoOptions;
    };

    const getPlaceholderForTask = (taskId: number) => {
        if (taskId === 1) return 'Select Database...';
        if (taskId === 2) return 'Select Environment...';
        return 'Select Repository...';
    };

    const handlePreflightCheck = async (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        const targetId = selections[taskId];
        if (!task || !targetId) return;

        setPreflightStates(prev => ({ ...prev, [taskId]: 'assessing' }));

        try {
            const res = await apiClient.post('/operations/tasks/assess', { task: task.taskKey, targetId });
            setPreflightData(prev => ({ ...prev, [taskId]: res.data }));
            setPreflightStates(prev => ({ ...prev, [taskId]: 'preflight' }));
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Pre-flight calculation failed.');
            setPreflightStates(prev => ({ ...prev, [taskId]: 'idle' }));
        }
    };

    const executeTask = async (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        const targetId = selections[taskId];
        if (!task || !targetId) return;

        setPreflightStates(prev => ({ ...prev, [taskId]: 'executing' }));
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: true, done: false } : t));

        try {
            await apiClient.post('/tasks/execute', { task: task.taskKey, targetId });
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: false, done: true } : t));
            setPreflightStates(prev => ({ ...prev, [taskId]: 'done' }));
            toast.success('Task completed successfully');
        } catch {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: false } : t));
            setPreflightStates(prev => ({ ...prev, [taskId]: 'preflight' }));
            toast.error('Task failed. Please try again.');
        }
    };

    const handleAbort = (taskId: number) => {
        setPreflightStates(prev => ({ ...prev, [taskId]: 'idle' }));
        setPreflightData(prev => ({ ...prev, [taskId]: null }));
    };

    return (
        <div className="glass-card relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 text-black mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold tracking-tight">Remote Tasks</h3>
            </div>

            <div className="space-y-4">
                {tasks.map(task => {
                    const selected = selections[task.id];
                    const hasSelection = !!selected;
                    const options = getOptionsForTask(task.id);
                    const placeholder = getPlaceholderForTask(task.id);

                    return (
                        <div key={task.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 relative overflow-visible flex flex-col gap-4">
                            <div className="flex items-center justify-between w-full relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded bg-white border border-gray-200">
                                        <task.icon className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <span className="text-sm font-semibold text-black">{task.name}</span>
                                </div>
                                
                                {task.done ? (
                                    <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                                    </Badge>
                                ) : preflightStates[task.id] !== 'idle' ? (
                                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 bg-yellow-50 animate-pulse capitalize text-[10px]">
                                        {preflightStates[task.id]}
                                    </Badge>
                                ) : null}
                            </div>

                            <p className="text-xs text-gray-500 leading-relaxed -mt-2">
                                {task.desc}
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full mt-1 relative z-10">
                                <div className="flex-1 w-full min-w-0">
                                    {loadingOptions ? (
                                        <div className="w-full h-[46px] rounded-lg border border-gray-200 bg-white flex items-center justify-center gap-2 text-gray-400 text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                                        </div>
                                    ) : (
                                        <TargetSelect
                                            value={selected}
                                            onChange={(id) => setSelections(prev => ({ ...prev, [task.id]: id }))}
                                            placeholder={placeholder}
                                            options={options}
                                            disabled={task.running || task.done || preflightStates[task.id] !== 'idle'}
                                            open={!!dropdownOpen[task.id]}
                                            onOpenChange={(v) => setDropdownOpen(prev => ({ ...prev, [task.id]: v }))}
                                        />
                                    )}
                                </div>

                                {!task.done && preflightStates[task.id] === 'idle' && (
                                    <Button
                                        size="default"
                                        className={`h-[46px] text-xs font-semibold px-4 transition-all w-full sm:w-auto ${
                                            hasSelection
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'opacity-50 bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                                        }`}
                                        onClick={() => handlePreflightCheck(task.id)}
                                        disabled={!hasSelection}
                                    >
                                        Run Task
                                    </Button>
                                )}
                            </div>

                            <AnimatePresence>
                                {preflightStates[task.id] !== 'idle' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden w-full border-t border-gray-200 pt-3 mt-1"
                                    >
                                        {preflightStates[task.id] === 'assessing' && (
                                            <div className="flex flex-col gap-2 p-3 rounded-lg border border-blue-100 bg-blue-50/50 animate-pulse">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Calculating Blast Radius Pre-Flight...</span>
                                                </div>
                                                <div className="h-2 w-full bg-blue-100 rounded overflow-hidden relative">
                                                    <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 animate-[loading-bar_1.5s_infinite_ease-in-out]" />
                                                </div>
                                            </div>
                                        )}

                                        {preflightStates[task.id] === 'preflight' && preflightData[task.id] && (
                                            <div className={`p-4 rounded-lg border flex flex-col gap-3 transition-colors ${
                                                preflightData[task.id]?.impactLevel === 'high' 
                                                    ? 'border-red-200 bg-red-50/50 text-red-900' 
                                                    : preflightData[task.id]?.impactLevel === 'medium'
                                                    ? 'border-orange-200 bg-orange-50/50 text-orange-900'
                                                    : 'border-blue-200 bg-blue-50/50 text-blue-900'
                                            }`}>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2 font-bold text-xs">
                                                        <AlertTriangle className={`w-4 h-4 ${
                                                            preflightData[task.id]?.impactLevel === 'high' ? 'text-red-500 animate-bounce' : 'text-orange-500'
                                                        }`} />
                                                        <span>IMPACT RATING: {preflightData[task.id]?.impactLevel?.toUpperCase()}</span>
                                                    </div>
                                                    <Badge variant="outline" className={`text-[10px] ${
                                                        preflightData[task.id]?.impactLevel === 'high' 
                                                            ? 'border-red-300 text-red-700 bg-white' 
                                                            : 'border-orange-300 text-orange-700 bg-white'
                                                    }`}>
                                                        {preflightData[task.id]?.affectedComponents} components affected
                                                    </Badge>
                                                </div>

                                                <p className="text-xs leading-relaxed font-mono bg-white/70 p-2.5 rounded border border-gray-200 text-gray-700">
                                                    {preflightData[task.id]?.description}
                                                </p>

                                                <div className="flex items-center justify-end gap-2 mt-1">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => handleAbort(task.id)}
                                                        className="h-8 text-xs border border-transparent hover:border-gray-200 text-gray-500"
                                                    >
                                                        Abort Action
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => executeTask(task.id)}
                                                        className={`h-8 text-xs font-semibold text-white ${
                                                            preflightData[task.id]?.impactLevel === 'high'
                                                                ? 'bg-red-500 hover:bg-red-600 border border-red-600'
                                                                : 'bg-blue-600 hover:bg-blue-700 border border-blue-700'
                                                        }`}
                                                    >
                                                        Confirm & Run Task
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {preflightStates[task.id] === 'executing' && (
                                            <div className="flex flex-col gap-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50/50">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Firing Task Action...</span>
                                                </div>
                                                <div className="h-1 bg-yellow-400 w-full animate-pulse rounded" />
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {task.running && (
                                <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-[width-grow_2s_ease-in-out_forwards] w-full origin-left" />
                            )}
                        </div>
                    );
                })}
            </div>
            <style>{`
                @keyframes width-grow {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                @keyframes loading-bar {
                    0% { left: -33%; }
                    100% { left: 100%; }
                }
            `}</style>
        </div>
    );
};


// --- 6. Unified FinOps ---
const FinOps = () => {
    const { currentCost, projected, threshold } = DEFAULT_FINOPS;
    const isWarning = projected > threshold;

    return (
         <div className="glass-card relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-black">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-semibold tracking-tight">FinOps</h3>
                </div>
                {isWarning && (
                     <div className="animate-pulse flex items-center gap-1 text-xs font-bold text-yellow-500">
                        <AlertTriangle className="w-3 h-3" />
                        OVER LIMIT
                     </div>
                )}
            </div>

            <div className="text-center py-4">
                <span className="text-4xl font-bold tracking-tighter text-green-500 drop-shadow-sm">
                    ${currentCost.toFixed(2)}
                </span>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Current Month to Date</p>
            </div>

            <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Projected: ${projected.toFixed(2)}</span>
                    <span>Limit: ${threshold.toFixed(2)}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden relative">
                     <div className={`absolute top-0 left-0 h-full rounded-full ${isWarning ? 'bg-yellow-500 shadow-sm' : 'bg-green-500'}`} style={{ width: '80%' }}></div>
                     <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 z-10" style={{ left: '70%' }}></div>
                </div>
            </div>
         </div>
    );
};


// --- 7. API Bouncer ---
const ApiBouncer = () => {
    const { selectedProjectId, bannedIps, banIp } = useProject();
    const baseIps = DEFAULT_API_IPS;
    const projectBanned = selectedProjectId ? (bannedIps[selectedProjectId] ?? new Set<string>()) : new Set<string>();
    const ips = baseIps.map((item) => ({
        ...item,
        status: (projectBanned.has(item.ip) ? 'banned' : item.status) as 'active' | 'banned',
    }));

    const handleBan = async (ip: string) => {
        if (selectedProjectId) banIp(selectedProjectId, ip);
        toast("IP Address Blacklisted", {
            description: `${ip} has been added to the firewall rejection list.`,
            icon: <Ban className="w-4 h-4 text-red-500" />
        });
        try {
            await logClientEvent('security', `Gatekeeper blacklisted IP address '${ip}' at production firewall`);
        } catch (err) {
            console.warn('Failed to submit client event logging:', err);
        }
    };

    return (
        <div className="glass-card relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-full flex flex-col">
             <div className="flex items-center gap-2 text-black mb-6">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold tracking-tight">API Security Radar</h3>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
                 <div className="space-y-3">
                    {ips.sort((a,b) => b.reqs - a.reqs).map((item, i) => (
                         <div key={item.ip} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 group hover:border-gray-200 transition-all">
                             <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${item.status === 'banned' ? 'bg-gray-300' : i === 0 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} />
                                <div>
                                    <p className={`text-sm font-mono ${item.status === 'banned' ? 'text-gray-400 line-through decoration-gray-400' : 'text-black'}`}>
                                        {item.ip}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                        <Globe className="w-3 h-3" />
                                        {item.location}
                                        <span className="text-gray-300">|</span>
                                        {item.reqs.toLocaleString()} reqs
                                    </div>
                                </div>
                             </div>

                             {item.status === 'banned' ? (
                                  <Badge variant="destructive" className="bg-red-50 text-red-500 border-red-200 text-[10px]">BANNED</Badge>
                             ) : (
                                  <Button 
                                     size="sm" 
                                     variant="ghost" 
                                     onClick={() => handleBan(item.ip)}
                                     className="h-7 w-7 p-0 rounded-full hover:bg-red-50 hover:text-red-500 text-gray-400"
                                 >
                                     <Ban className="w-4 h-4" />
                                  </Button>
                             )}
                        </div>
                    ))}
                 </div>
            </ScrollArea>
        </div>
    );
};


// --- 8. Live Audit Stream ---
const LiveAuditStream = () => {
    const [paused, setPaused] = useState(false);
    const { logs, status, clearLogs } = useAuditStream(!paused);
    const [activeFilter, setActiveFilter] = useState<'all' | 'security' | 'task' | 'maintenance'>('all');
    const terminalEndRef = useRef<HTMLDivElement>(null);

    const filteredLogs = logs.filter(log => {
        if (activeFilter === 'all') return true;
        return log.type === activeFilter;
    });

    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [filteredLogs]);

    const handleCopy = () => {
        const text = filteredLogs
            .map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.type.toUpperCase()}] [${log.user}]: ${log.message}`)
            .join('\n');
        navigator.clipboard.writeText(text);
        toast.success("Logs copied to clipboard");
    };

    return (
        <div className="glass-card relative overflow-hidden rounded-xl border border-gray-200 bg-slate-50 p-6 shadow-sm flex flex-col min-h-[350px]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-slate-700 animate-pulse" />
                    <div>
                        <h3 className="text-sm font-semibold font-mono text-slate-800">Live Audit Stream</h3>
                        <p className="text-[10px] text-gray-500 font-mono">Real-time administrator activity stream</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            {status === 'connected' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                            }`} />
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 font-semibold">
                            {status === 'connected' ? 'Streaming' : status === 'connecting' ? 'Connecting' : 'Disconnected'}
                        </span>
                    </div>

                    <div className="flex items-center bg-white p-1 rounded-md border border-gray-200 text-[10px] font-mono">
                        {(['all', 'security', 'task', 'maintenance'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-2.5 py-1 rounded transition-colors uppercase ${
                                    activeFilter === f ? 'bg-slate-200 text-slate-800 font-bold border border-slate-300' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPaused(!paused)}
                            className="h-7 px-2 bg-white border border-gray-200 text-gray-600 text-[10px] font-mono hover:bg-gray-50 hover:text-black"
                        >
                            {paused ? <Play className="w-3 h-3 mr-1 text-green-600" /> : <Pause className="w-3 h-3 mr-1 text-yellow-600" />}
                            {paused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCopy}
                            disabled={filteredLogs.length === 0}
                            className="h-7 px-2 bg-white border border-gray-200 text-gray-600 text-[10px] font-mono hover:bg-gray-50 hover:text-black"
                        >
                            <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={clearLogs}
                            disabled={filteredLogs.length === 0}
                            className="h-7 px-2 bg-white border border-gray-200 text-red-500 text-[10px] font-mono hover:bg-red-50 hover:text-red-600"
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[200px] overflow-y-auto font-mono text-xs leading-relaxed max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-200 bg-white border border-gray-200 rounded-lg p-4 shadow-inner">
                <div className="space-y-1.5">
                    {filteredLogs.length === 0 ? (
                        <div className="text-gray-400 text-center py-12 italic">
                            {paused ? 'Live connection paused. Resume streaming to record audits.' : 'Waiting for incoming logs...'}
                        </div>
                    ) : (
                        filteredLogs.map(log => {
                            return (
                                <div key={log.id} className="flex gap-2 items-start py-0.5 hover:bg-slate-50 px-1 rounded transition-colors group text-slate-800">
                                    <span className="text-gray-400 select-none flex-shrink-0">
                                        [{new Date(log.timestamp).toLocaleTimeString()}]
                                    </span>
                                    <span className={`font-semibold uppercase text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 tracking-wider leading-none text-center ${
                                        log.type === 'security' 
                                            ? 'bg-red-50 border-red-200 text-red-600' 
                                            : log.type === 'maintenance'
                                            ? 'bg-purple-50 border-purple-200 text-purple-600'
                                            : log.type === 'task'
                                            ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
                                            : 'bg-blue-50 border-blue-200 text-blue-600'
                                    }`}>
                                        {log.type}
                                    </span>
                                    <span className="text-slate-600 truncate max-w-[150px] font-semibold flex-shrink-0" title={log.user}>
                                        {log.user}:
                                    </span>
                                    <span className="text-slate-700 select-text font-medium">
                                        {log.message}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={terminalEndRef} />
                </div>
            </div>

            <div className="mt-4 pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500 font-mono">
                <span>BUFFER: {filteredLogs.length}/150 ACTIONS HELD</span>
                <span className="flex items-center gap-1 select-none font-bold text-slate-600">
                    TERMINAL ACTIVE <span className="animate-[pulse_1s_infinite] bg-slate-800 w-1 h-2 inline-block">_</span>
                </span>
            </div>
        </div>
    );
};


// --- Project Selection Dropdown ---
const ProviderBadge = ({ provider }: { provider: 'vercel' | 'render' }) => (
    provider === 'vercel' ? (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-black text-white w-fit">
            <Triangle className="w-1 h-1" /> Vercel
        </span>
    ) : (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-emerald-600 text-white w-fit">
            <Server className="w-1 h-1" /> Render
        </span>
    )
);

const ProjectSelectDropdown = () => {
    const { projects, isLoadingProjects, selectedProject, setSelectedProject } = useProject();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    disabled={isLoadingProjects}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-black hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500/50 w-full justify-between disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoadingProjects ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                            <span className="text-sm text-gray-500">Loading projects...</span>
                        </>
                    ) : selectedProject ? (
                        <>
                            <span className="flex items-center gap-2">
                                <FolderKanban className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium">{selectedProject.name}</span>
                                <ProviderBadge provider={selectedProject.provider} />
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        </>
                    ) : (
                        <>
                            <span className="text-sm text-gray-500">No projects</span>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        </>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="min-w-[480px] max-w-[520px] bg-white border border-gray-200 text-black shadow-lg p-2"
            >
                {isLoadingProjects ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading projects...</span>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500">No projects found</div>
                ) : (
                    <DropdownMenuRadioGroup value={selectedProject?.id ?? ''} onValueChange={(v) => setSelectedProject(v)}>
                        <ScrollArea className="max-h-[280px]">
                            <div className="grid grid-cols-4 gap-1.5 p-1 pr-3">
                                {projects.map((p) => (
                                    <DropdownMenuRadioItem
                                        key={p.id}
                                        value={p.id}
                                        className="cursor-pointer focus:bg-gray-50 focus:text-black data-[state=checked]:bg-green-50 data-[state=checked]:text-green-600 rounded-md px-2 py-1.5 text-xs col-span-1 pl-2 [&>span:first-child]:hidden"
                                    >
                                        <span className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
                                            <span className="truncate font-medium">{p.name}</span>
                                            <ProviderBadge provider={p.provider} />
                                        </span>
                                    </DropdownMenuRadioItem>
                                ))}
                            </div>
                        </ScrollArea>
                    </DropdownMenuRadioGroup>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


// --- PAGE LAYOUT & MAIN ENTRY ---
const OperationsContent = () => {
    const [defconState, setDefconState] = useState<number>(5);
    const [loadingDefcon, setLoadingDefcon] = useState(true);

    const fetchDefcon = async () => {
      try {
        const { data } = await apiClient.get('/operations/defcon');
        if (data && typeof data.state === 'number') {
          setDefconState(data.state);
        }
      } catch {
        console.warn("Failed to fetch initial DEFCON level.");
      } finally {
        setLoadingDefcon(false);
      }
    };

    const handleDefconChange = async (nextState: number) => {
      try {
        const { data } = await apiClient.post('/operations/defcon', { state: nextState });
        if (data?.success) {
          setDefconState(nextState);
        }
      } catch (err: any) {
        toast.error("Failed to commit threat matrix changes.");
        throw err;
      }
    };

    useEffect(() => {
      fetchDefcon();
    }, []);

    const isLockdown = defconState === 1;

    return (
        <main className={`
          flex-1 flex flex-col h-full overflow-hidden relative z-0 text-black font-sans rounded-t-[2rem] transition-colors duration-500
          ${isLockdown ? 'bg-red-50/20' : 'bg-slate-50/30'}
        `}>
          {/* Page Header */}
          <div className="p-8 pb-4 border-b border-gray-200 bg-white/80 backdrop-blur-md z-1 rounded-t-[2rem]">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-mono mb-2 uppercase tracking-widest">
              <Activity className="w-3 h-3 text-slate-400" />
              System Operations Center
            </div>
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-extrabold tracking-tight text-black">
                  Global Operations & Security
                </h1>
              </div>
              <div className="flex gap-2">
                {isLockdown ? (
                  <Badge variant="destructive" className="bg-red-500 text-white animate-pulse border-none">
                    🚨 LOCKDOWN ACTIVE
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-green-500/30 bg-green-50 text-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> ALL SYSTEMS NORMAL
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="flex-1 p-8 overflow-y-auto w-full max-w-[1600px] mx-auto flex flex-col gap-6">
            
            {/* DEFCON Threat Matrix Hero Row (Top Level) */}
            {loadingDefcon ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 h-56 flex flex-col justify-between animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-7 w-48 bg-slate-200 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="h-24 bg-slate-100 rounded-xl" />
                  <div className="h-24 bg-slate-100 rounded-xl" />
                  <div className="h-24 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ) : (
              <DefconMatrix currentState={defconState} onStateChange={handleDefconChange} />
            )}

            {/* Granular Breakers Grid (Row 2) */}
            <CircuitBreakers />

            {/* Standard Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)] mt-2">
                
                {/* Column 1 */}
                <div className="space-y-6 flex flex-col lg:col-span-1">
                    <div className="flex-[2]"> 
                        <FeatureFlags />
                    </div>
                    <div className="flex-1">
                        <FinOps />
                    </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-6 flex flex-col lg:col-span-1">
                     <div className="flex-[1.5]">
                        <UserCRM />
                     </div>
                     <div className="flex-1">
                         <ApiBouncer />
                     </div>
                </div>

                {/* Column 3 */}
                <div className="space-y-6 flex flex-col lg:col-span-1 h-full">
                    <div className="h-full">
                        <TaskExecutor />
                    </div>
                </div>

            </div>

            {/* Live Audit Stream Terminal Widget (Full-Width Row) */}
            <div className="w-full mt-2">
                <LiveAuditStream />
            </div>
          </div>
        </main>
    );
};

const Operations = () => (
    <ProjectProvider>
        <OperationsContent />
    </ProjectProvider>
);

export default Operations;
