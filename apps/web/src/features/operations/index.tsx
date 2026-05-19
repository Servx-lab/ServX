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
import { useAdminList } from '../admin/hooks';
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
      relative overflow-hidden rounded-2xl border bg-white p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-500 flex-shrink-0
      ${isLockdown 
        ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.15)] animate-[pulse_2s_infinite]' 
        : 'border-slate-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]'}
    `}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 font-mono uppercase tracking-widest text-[10px] font-extrabold mb-1">
            <ShieldAlert className={`w-4 h-4 ${isLockdown ? 'text-red-500 animate-bounce' : 'text-slate-400'}`} />
            System Control Panel
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">DEFCON Threat Matrix</h2>
        </div>
        <div className="flex items-center gap-2">
          {isLockdown ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-red-500 text-white animate-pulse border-none font-mono uppercase tracking-wider">
              🚨 LOCKDOWN ENGAGED
            </span>
          ) : currentState === 3 ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-600 border border-amber-200 font-mono uppercase tracking-wider">
              ⚠️ ELEVATED THREAT LEVEL
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 font-mono uppercase tracking-wider">
              🟢 baseline operations
            </span>
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
            relative p-6 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-40 group
            ${currentState === 5
              ? 'bg-emerald-50/30 border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.06)] ring-1 ring-emerald-400 text-emerald-950'
              : 'bg-slate-50/50 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10'}
          `}
        >
          <div className="flex justify-between items-start w-full">
            <div className={`p-2.5 rounded-lg transition-all duration-300 ${currentState === 5 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-white border border-slate-100 text-emerald-500 group-hover:scale-105'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs text-slate-400 font-bold">DEFCON 5 / 4</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base mb-1">Normal Baseline</h4>
            <p className="text-xs text-slate-500 font-medium">All standard traffic allowed. Standard verification pipelines active.</p>
          </div>
        </button>

        {/* Zone 2: Elevated */}
        <button
          type="button"
          onClick={() => handleZoneClick(3)}
          disabled={loading}
          className={`
            relative p-6 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-40 group
            ${currentState === 3
              ? 'bg-amber-50/30 border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.06)] ring-1 ring-amber-400 text-amber-950'
              : 'bg-slate-50/50 border-slate-100 hover:border-amber-200 hover:bg-amber-50/10'}
          `}
        >
          <div className="flex justify-between items-start w-full">
            <div className={`p-2.5 rounded-lg transition-all duration-300 ${currentState === 3 ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10' : 'bg-white border border-slate-100 text-amber-500 group-hover:scale-105'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs text-slate-400 font-bold">DEFCON 3 / 2</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base mb-1">Elevated Threat</h4>
            <p className="text-xs text-slate-500 font-medium">Dashboard warning indicators active. Security filters highly sensitive.</p>
          </div>
        </button>

        {/* Zone 3: Lockdown */}
        <button
          type="button"
          onClick={() => handleZoneClick(1)}
          disabled={loading}
          className={`
            relative p-6 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-40 group
            ${currentState === 1
              ? 'bg-red-50/30 border-red-500/30 shadow-[0_4px_20px_rgba(239,68,68,0.08)] ring-1 ring-red-400 text-red-950 animate-pulse'
              : 'bg-slate-50/50 border-slate-100 hover:border-red-200 hover:bg-red-50/10'}
          `}
        >
          <div className="flex justify-between items-start w-full">
            <div className={`p-2.5 rounded-lg transition-all duration-300 ${currentState === 1 ? 'bg-red-500 text-white shadow-md shadow-red-500/10' : 'bg-white border border-slate-100 text-red-500 group-hover:scale-105'}`}>
              <Lock className="w-5 h-5" />
            </div>
            <span className="font-mono text-xs text-slate-400 font-bold">DEFCON 1</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base mb-1">System Lockdown</h4>
            <p className="text-xs text-slate-500 font-medium">POST/PUT/DELETE rejected. All sessions invalidated. Maximum firewall active.</p>
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
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-5 text-black"
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
    <div className="flex flex-col gap-4 flex-shrink-0">
      <div className="flex items-center gap-2.5 text-slate-800 mb-1">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-500">
          <Zap className="w-5 h-5 fill-amber-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-800">Active Circuit Breakers</h3>
          <p className="text-xs text-slate-400 mt-0.5">Manually override automated routing fail-safes</p>
        </div>
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
                className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5 h-44 flex flex-col justify-between animate-pulse flex-shrink-0"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </div>
                  </div>
                </div>
                <div className="text-xs font-mono italic text-slate-400 flex items-center gap-1.5 bg-slate-50/50 p-2.5 rounded-lg border border-dashed border-slate-200">
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
                bg-white border rounded-2xl p-6 h-44 flex flex-col justify-between transition-all duration-300 flex-shrink-0
                hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]
                ${isOpen 
                  ? 'border-red-200 bg-red-50/10 shadow-[0_4px_20px_rgba(239,68,68,0.02)]' 
                  : 'border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'}
              `}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border transition-all duration-300 ${isOpen ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-100/50'}`}>
                    <srv.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{srv.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold leading-normal mt-0.5">{srv.desc}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400 font-medium">Breaker Status</span>
                {isOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    🔴 Open (Tripped)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    🟢 Closed (Healthy)
                  </span>
                )}
              </div>

              <Button
                size="sm"
                onClick={() => handleToggle(srv.key)}
                className={`
                  w-full h-10 text-xs font-bold rounded-xl transition-all duration-200 border
                  ${isOpen 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-sm shadow-emerald-500/10' 
                    : 'bg-white border-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100 text-slate-600'}
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
        <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden rounded-2xl p-6 h-fit flex flex-col flex-shrink-0">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-red-50 text-red-500 border border-red-100/50">
                    <Power className="w-5 h-5 fill-red-50" />
                </div>
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-800">Kill Switches & Features</h3>
                    <p className="text-xs text-slate-400">Control real-time application overrides</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-extrabold">Active Project</p>
                    <ProjectSelectDropdown />
                </div>

                <div className={`
                    relative p-4 rounded-xl border transition-all duration-300
                    ${maintenance 
                        ? 'bg-red-50/30 border-red-200 shadow-[0_4px_20px_-5px_rgba(239,68,68,0.1)]' 
                        : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'}
                `}>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className={`font-bold transition-colors text-sm ${maintenance ? 'text-red-500' : 'text-slate-800'}`}>
                                Global Maintenance Mode
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium">
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

                <div className="space-y-3">
                  <FlagItem icon={ImageIcon} label="Image Uploads" active={flags.imageUploads} color="text-blue-500 animate-[pulse_3s_infinite]" />
                  <FlagItem icon={Sparkles} label="Beta AI Features" active={flags.aiFeatures} color="text-purple-500 animate-[pulse_3s_infinite]" />
                  <FlagItem icon={UserPlus} label="New User Signups" active={flags.newSignups} color="text-green-500 animate-[pulse_3s_infinite]" />
                </div>
            </div>
        </div>
    );
};

const FlagItem = ({ icon: Icon, label, active, color }: any) => (
    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100/80 transition-all hover:bg-slate-50 hover:border-slate-200">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white border border-slate-100 shadow-sm ${active ? color : 'text-slate-400'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`text-sm font-semibold transition-colors ${active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                {label}
            </span>
        </div>
        <span className="relative flex h-2.5 w-2.5">
            {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? 'bg-green-500' : 'bg-slate-300'}`} />
        </span>
    </div>
);


// --- 4. Ghost Mode / User CRM ---
const UserCRM = () => {
    const { data: admins = [], isLoading } = useAdminList();

    const formatNameFromEmail = (email: string) => {
        const part = email.split('@')[0] || '';
        return part
            .split(/[\._\-]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleImpersonate = async (name: string) => {
        toast.message(`Generating Impersonation Session...`, {
            description: `Generating token to sign in as ${name}`,
        });
        setTimeout(async () => {
            toast.success(`Logged in as ${name}`, {
                description: 'Restricted Ghost Session Active (Audit Logged)',
                icon: <Fingerprint className="w-4 h-4 text-purple-400" />,
            });
            try {
                await logClientEvent('auth', `Admin simulated restricted session impersonation for team member '${name}'`);
            } catch (err) {
                console.warn('Failed to submit client event logging:', err);
            }
        }, 1500);
    };

    return (
        <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden rounded-2xl p-0 h-fit flex flex-col flex-shrink-0">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-800">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-500 border border-purple-100/50">
                        <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight">Ghost Mode</h3>
                        <p className="text-xs text-slate-400">Simulate administrative accounts</p>
                    </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-widest font-mono">
                    ADMIN ONLY
                </span>
            </div>
            
            <div className="p-4 flex-1">
                {isLoading ? (
                    <div className="space-y-3 py-6 text-center animate-pulse">
                        <div className="h-4 bg-slate-100 rounded-full w-2/3 mx-auto"></div>
                        <div className="h-4 bg-slate-100 rounded-full w-1/2 mx-auto"></div>
                        <p className="text-xs text-slate-400 font-semibold">Fetching active team list...</p>
                    </div>
                ) : admins.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-2.5">
                        <div className="p-2.5 rounded-full bg-slate-50 border border-slate-100 text-slate-400">
                            <ShieldX className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-700">No Simulation Target</h4>
                            <p className="text-[11px] text-slate-400 max-w-[200px] leading-normal font-medium mx-auto">
                                Invite teammates under Team &amp; Access Management first.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {admins.map((u) => {
                            const name = formatNameFromEmail(u.email);
                            const roleDisplay = u.role.charAt(0).toUpperCase() + u.role.slice(1);
                            return (
                                <div key={u.id} className="group flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50/50 border border-transparent hover:border-slate-100 transition-all duration-200">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="h-10 w-10 border border-slate-100 shadow-sm flex-shrink-0">
                                            <AvatarFallback className="bg-purple-50 text-purple-600 text-xs font-bold font-mono">
                                                {name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors truncate">{name}</p>
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="text-xs text-slate-400 font-medium truncate">{u.email}</span>
                                                <span className="text-[10px] text-slate-300 font-bold">•</span>
                                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                    u.role === 'owner' ? 'bg-red-50 text-red-600' : u.role === 'editor' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {roleDisplay}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleImpersonate(name)}
                                        className="h-8 rounded-lg border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-all duration-200 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 font-semibold text-xs"
                                    >
                                        Impersonate
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
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
        { id: 1, taskKey: 'backup-db', name: 'Database Backup', desc: 'Trigger full backup of selected database to S3 storage', icon: Database, running: false, done: false },
        { id: 2, taskKey: 'clear-redis', name: 'Clear Redis Cache', desc: 'Flush cache for selected hosting server environment', icon: Trash2, running: false, done: false },
        { id: 3, taskKey: 'sync-github', name: 'Sync GitHub Stats', desc: 'Refresh local environment variables and GitHub repository tokens', icon: RefreshCw, running: false, done: false },
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
        if (taskId === 1) return 'Select Database target';
        if (taskId === 2) return 'Select Hosting environment';
        return 'Select GitHub repository';
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

    const handleAbort = (taskId: number) => {
        setPreflightStates(prev => ({ ...prev, [taskId]: 'idle' }));
        setPreflightData(prev => ({ ...prev, [taskId]: null }));
        toast.success("Task execution aborted safely.");
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

            try {
                await logClientEvent('task', `Admin triggered production task execution for '${task.taskKey}' against target connection`);
            } catch (err) {
                console.warn('Failed to submit client event logging:', err);
            }
        } catch {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: false } : t));
            setPreflightStates(prev => ({ ...prev, [taskId]: 'preflight' }));
            toast.error('Task failed. Please try again.');
        }
    };

    return (
        <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden rounded-2xl p-6 flex flex-col gap-4 flex-shrink-0 h-fit">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-500 border border-amber-100/50">
                    <Zap className="w-5 h-5 fill-amber-50" />
                </div>
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-800">Remote Tasks</h3>
                    <p className="text-xs text-slate-400">Execute verified system automation pipelines</p>
                </div>
            </div>

            <div className="space-y-4 flex-1">
                {tasks.map(task => {
                    const selected = selections[task.id];
                    const hasSelection = !!selected;
                    const options = getOptionsForTask(task.id);
                    const placeholder = getPlaceholderForTask(task.id);
                    const preflightState = preflightStates[task.id];
                    const taskPreflight = preflightData[task.id];

                    return (
                        <div key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 relative overflow-visible flex flex-col gap-3 transition-all hover:bg-slate-55 hover:border-slate-200">
                            <div className="flex items-center justify-between w-full relative z-10">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-sm text-slate-500">
                                        <task.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-800">{task.name}</span>
                                </div>
                                
                                {task.done ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-green-50 text-green-600 border border-green-100 uppercase tracking-widest font-mono">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                                    </span>
                                ) : preflightState !== 'idle' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-widest font-mono animate-pulse">
                                        {preflightState}
                                    </span>
                                ) : null}
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                {task.desc}
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-1 relative z-10">
                                <div className="flex-1 w-full min-w-0">
                                    {loadingOptions ? (
                                        <div className="w-full h-11 rounded-xl border border-slate-100 bg-white flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold">
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> Loading targets...
                                        </div>
                                    ) : (
                                        <TargetSelect
                                            value={selected}
                                            onChange={(id) => setSelections(prev => ({ ...prev, [task.id]: id }))}
                                            placeholder={placeholder}
                                            options={options}
                                            disabled={task.running || task.done || preflightState !== 'idle'}
                                            open={!!dropdownOpen[task.id]}
                                            onOpenChange={(v) => setDropdownOpen(prev => ({ ...prev, [task.id]: v }))}
                                        />
                                    )}
                                </div>

                                {!task.done && preflightState === 'idle' && (
                                    <Button
                                        size="default"
                                        className={`h-11 text-xs font-bold px-4 transition-all w-full sm:w-auto rounded-xl border ${
                                            hasSelection
                                                ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-sm shadow-blue-500/10'
                                                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        }`}
                                        onClick={() => handlePreflightCheck(task.id)}
                                        disabled={!hasSelection}
                                    >
                                        Run Task
                                    </Button>
                                )}
                            </div>

                            <AnimatePresence>
                                {preflightState !== 'idle' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden w-full border-t border-slate-200/60 pt-3 mt-1"
                                    >
                                        {preflightState === 'assessing' && (
                                            <div className="flex flex-col gap-2.5 p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 animate-pulse">
                                                <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Calculating Blast Radius Pre-Flight...</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-blue-100/60 rounded-full overflow-hidden relative">
                                                    <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 animate-[loading-bar_1.5s_infinite_ease-in-out] rounded-full" />
                                                </div>
                                            </div>
                                        )}

                                        {preflightState === 'preflight' && taskPreflight && (
                                            <div className={`p-4 rounded-xl border flex flex-col gap-3.5 transition-colors ${
                                                taskPreflight.impactLevel === 'high' 
                                                    ? 'border-red-200 bg-red-50/30 text-red-950 shadow-[0_4px_12px_rgba(239,68,68,0.02)]' 
                                                    : taskPreflight.impactLevel === 'medium'
                                                    ? 'border-orange-200 bg-orange-50/30 text-orange-950 shadow-[0_4px_12px_rgba(245,158,11,0.02)]'
                                                    : 'border-blue-200 bg-blue-50/30 text-blue-950 shadow-[0_4px_12px_rgba(59,130,246,0.02)]'
                                            }`}>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2 font-bold text-xs">
                                                        <AlertTriangle className={`w-4 h-4 ${
                                                            taskPreflight.impactLevel === 'high' ? 'text-red-500 animate-bounce' : 'text-orange-500'
                                                        }`} />
                                                        <span className="font-mono tracking-wider">IMPACT RATING: {taskPreflight.impactLevel.toUpperCase()}</span>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                                                        taskPreflight.impactLevel === 'high' 
                                                            ? 'bg-red-100 text-red-700' 
                                                            : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        {taskPreflight.affectedComponents} components affected
                                                    </span>
                                                </div>

                                                <p className="text-xs leading-relaxed font-mono bg-white/80 p-3 rounded-lg border border-slate-100 text-slate-700 font-medium">
                                                    {taskPreflight.description}
                                                </p>

                                                <div className="flex items-center justify-end gap-2 mt-1">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => handleAbort(task.id)}
                                                        className="h-8 text-xs font-bold border border-slate-200 hover:bg-slate-100 text-slate-505 rounded-lg"
                                                    >
                                                        Abort Action
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => executeTask(task.id)}
                                                        className={`h-8 text-xs font-bold text-white rounded-lg shadow-sm border-transparent ${
                                                            taskPreflight.impactLevel === 'high'
                                                                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/10'
                                                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10'
                                                        }`}
                                                    >
                                                        Confirm & Run Task
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {preflightState === 'executing' && (
                                            <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-amber-200 bg-amber-50/40">
                                                <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                                                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                                    <span>Firing Task Action...</span>
                                                </div>
                                                <div className="h-1 bg-amber-400 w-full animate-pulse rounded" />
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {task.running && (
                                <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-[width-grow_2s_ease-in-out_forwards] w-full origin-left rounded-b-2xl" />
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
        <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden rounded-2xl p-6 h-fit flex flex-col flex-shrink-0">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-500 border border-orange-100/50">
                    <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-800">API Security Radar</h3>
                    <p className="text-xs text-slate-400">Monitor and block malicious IPs</p>
                </div>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2 max-h-[220px]">
                 <div className="space-y-2">
                    {ips.sort((a,b) => b.reqs - a.reqs).map((item, i) => (
                         <div key={item.ip} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100 group hover:border-slate-200 hover:bg-slate-55 transition-all duration-200">
                             <div className="flex items-center gap-3 min-w-0">
                                <span className="relative flex h-2 w-2 flex-shrink-0">
                                    {item.status !== 'banned' && i === 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${item.status === 'banned' ? 'bg-slate-300' : i === 0 ? 'bg-red-500' : 'bg-orange-500'}`} />
                                </span>
                                <div className="min-w-0">
                                    <p className={`text-sm font-bold font-mono truncate ${item.status === 'banned' ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                                        {item.ip}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                                        <span className="flex items-center gap-0.5">
                                            <Globe className="w-3 h-3 text-slate-400" />
                                            {item.location}
                                        </span>
                                        <span>•</span>
                                        <span>{item.reqs.toLocaleString()} requests</span>
                                    </div>
                                </div>
                             </div>

                             {item.status === 'banned' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-red-500 border border-red-100 uppercase tracking-widest font-mono">Banned</span>
                             ) : (
                                  <Button 
                                     size="sm" 
                                     variant="ghost" 
                                     onClick={() => handleBan(item.ip)}
                                     className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 hover:border hover:border-red-100 transition-all duration-200"
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
        <div className="relative overflow-hidden rounded-2xl border border-slate-900 bg-slate-950 p-6 shadow-2xl flex flex-col min-h-[360px] flex-shrink-0 w-full">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-4">
                <div className="flex items-center gap-3">
                    {/* Window dots controls */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 mr-1 select-none">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    </div>
                    <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <div>
                        <h3 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
                            Live Audit Stream
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono">Real-time administrator security activity logs</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            {status === 'connected' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                            }`} />
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                            {status === 'connected' ? 'Streaming' : status === 'connecting' ? 'Connecting' : 'Disconnected'}
                        </span>
                    </div>

                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                        {(['all', 'security', 'task', 'maintenance'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-2.5 py-1 rounded-md transition-all duration-200 uppercase font-bold text-[9px] tracking-wider ${
                                    activeFilter === f ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300'
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
                            className="h-7 px-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-mono hover:bg-slate-800 hover:text-slate-100 rounded-lg"
                        >
                            {paused ? <Play className="w-3 h-3 mr-1 text-emerald-400" /> : <Pause className="w-3 h-3 mr-1 text-amber-400" />}
                            {paused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCopy}
                            disabled={filteredLogs.length === 0}
                            className="h-7 px-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-mono hover:bg-slate-800 hover:text-slate-100 rounded-lg"
                        >
                            <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={clearLogs}
                            disabled={filteredLogs.length === 0}
                            className="h-7 px-2.5 bg-slate-900/50 border border-slate-800/80 text-red-400 text-[10px] font-mono hover:bg-red-950/20 hover:text-red-300 hover:border-red-900/50 rounded-lg"
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[220px] overflow-y-auto font-mono text-xs leading-relaxed max-h-[260px] pr-2 scrollbar-thin scrollbar-thumb-slate-800 bg-slate-950 border border-slate-900 rounded-xl p-4 shadow-inner">
                <div className="space-y-2">
                    {filteredLogs.length === 0 ? (
                        <div className="text-slate-600 text-center py-16 italic">
                            {paused ? 'Live connection paused. Resume streaming to record audits.' : 'Waiting for incoming operations logs...'}
                        </div>
                    ) : (
                        filteredLogs.map(log => {
                            return (
                                <div key={log.id} className="flex gap-2 items-start py-0.5 hover:bg-slate-900/40 px-1 rounded transition-colors group text-slate-300">
                                    <span className="text-slate-600 select-none flex-shrink-0 font-medium">
                                        [{new Date(log.timestamp).toLocaleTimeString()}]
                                    </span>
                                    <span className={`font-semibold uppercase text-[8px] px-1.5 py-0.5 rounded border flex-shrink-0 tracking-widest leading-none text-center font-mono ${
                                        log.type === 'security' 
                                            ? 'bg-red-950/40 border-red-900/50 text-red-400' 
                                            : log.type === 'maintenance'
                                            ? 'bg-purple-950/40 border-purple-900/50 text-purple-400'
                                            : log.type === 'task'
                                            ? 'bg-amber-950/40 border-amber-900/50 text-amber-400'
                                            : 'bg-blue-950/40 border-blue-900/50 text-blue-400'
                                    }`}>
                                        {log.type}
                                    </span>
                                    <span className="text-slate-400 truncate max-w-[150px] font-bold flex-shrink-0" title={log.user}>
                                        {log.user}:
                                    </span>
                                    <span className="text-slate-200 select-text font-medium">
                                        {log.message}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={terminalEndRef} />
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>BUFFER: {filteredLogs.length}/150 ACTIONS HELD</span>
                <span className="flex items-center gap-1 select-none font-bold text-slate-400">
                    TERMINAL ACTIVE <span className="animate-[pulse_1s_infinite] bg-emerald-400 w-1.5 h-3 inline-block">_</span>
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
          flex-1 flex flex-col h-full overflow-hidden relative z-0 text-slate-800 font-sans rounded-t-[2.5rem] transition-colors duration-500
          ${isLockdown ? 'bg-red-50/30' : 'bg-slate-50/50'}
        `}>
          {/* Page Header */}
          <div className="px-8 py-6 border-b border-slate-100 bg-white/90 backdrop-blur-md z-10 rounded-t-[2.5rem] flex-shrink-0 flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold font-mono mb-1 uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
                System Operations Center
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
                Global Operations & Security
              </h1>
            </div>
            <div>
              {isLockdown ? (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20 uppercase tracking-widest font-mono">
                  🚨 LOCKDOWN ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm uppercase tracking-widest font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500 fill-emerald-50" /> ALL SYSTEMS NORMAL
                </span>
              )}
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="flex-1 p-8 overflow-y-auto w-full max-w-[1600px] mx-auto flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-200">
            
            {/* DEFCON Threat Matrix Hero Row (Top Level) */}
            {loadingDefcon ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 h-56 flex flex-col justify-between animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                  <div className="h-7 w-48 bg-slate-100 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="h-24 bg-slate-50 rounded-xl" />
                  <div className="h-24 bg-slate-50 rounded-xl" />
                  <div className="h-24 bg-slate-50 rounded-xl" />
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <DefconMatrix currentState={defconState} onStateChange={handleDefconChange} />
              </div>
            )}

            {/* Granular Breakers Grid (Row 2) */}
            <div className="flex-shrink-0">
              <CircuitBreakers />
            </div>

            {/* Standard Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-auto mt-2 flex-shrink-0">
                
                {/* Column 1 */}
                <div className="space-y-6 flex flex-col lg:col-span-1">
                    <FeatureFlags />
                </div>

                {/* Column 2 */}
                <div className="space-y-6 flex flex-col lg:col-span-1">
                    <UserCRM />
                    <ApiBouncer />
                </div>

                {/* Column 3 */}
                <div className="space-y-6 flex flex-col lg:col-span-1">
                    <TaskExecutor />
                </div>

            </div>

            {/* Live Audit Stream Terminal Widget (Full-Width Row) */}
            <div className="w-full mt-2 flex-shrink-0">
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
