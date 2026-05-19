import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldAlert, 
  UserPlus, 
  Fingerprint, 
  Database, 
  Trash2, 
  RefreshCw, 
  CheckCircle2,
  Lock,
  Zap,
  Activity,
  ChevronDown,
  Loader2,
  Search,
  Check,
  Server,
  ShieldX,
  Power,
  Key,
  Copy,
  Circle,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/apiClient';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminList } from '../admin/hooks';
import { logClientEvent } from './api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- 1. Repository Control & Maintenance ---
const RepositoryControl = () => {
    const [repos, setRepos] = useState<any[]>([]);
    const [registeredRepos, setRegisteredRepos] = useState<any[]>([]);
    const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [toggling, setToggling] = useState(false);

    const handleCopyToClipboard = (text: string, successMessage: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => toast.success(successMessage))
                .catch(() => fallbackCopy(text, successMessage));
        } else {
            fallbackCopy(text, successMessage);
        }
    };

    const fallbackCopy = (text: string, successMessage: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success(successMessage);
        } catch (err) {
            toast.error("Failed to copy text automatically.");
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ghRes, apiRes] = await Promise.all([
                apiClient.get('/github/repos', { skipAuthErrorLog: true }).catch(() => ({ data: [] })),
                apiClient.get('/repositories').catch(() => ({ data: { repositories: [] } }))
            ]);
            setRepos(ghRes.data || []);
            setRegisteredRepos(apiRes.data?.repositories || []);
            
            if ((ghRes.data || []).length > 0 && !selectedRepoFullName) {
                setSelectedRepoFullName(ghRes.data[0].full_name);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load repository data.");
        } finally {
            setLoading(false);
        }
    }, [selectedRepoFullName]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [verificationStatus, setVerificationStatus] = useState<string>('PENDING');

    useEffect(() => {
        const registeredData = registeredRepos.find(r => r.github_repo_full_name === selectedRepoFullName);
        if (!registeredData?.servx_pin) return;
        
        setVerificationStatus(registeredData.verification_status || 'PENDING');
        
        const sseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/verify/status/${registeredData.servx_pin}`;
        const eventSource = new EventSource(sseUrl);
        
        eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.status) {
                    setVerificationStatus(data.status);
                }
            } catch(err) {
                console.error("SSE parse error", err);
            }
        };
        
        return () => eventSource.close();
    }, [registeredRepos, selectedRepoFullName]);

    const handleRegister = async () => {
        const repo = repos.find(r => r.full_name === selectedRepoFullName);
        if (!repo) return;

        setRegistering(true);
        try {
            const res = await apiClient.post('/repositories', {
                githubRepoId: repo.id,
                githubRepoFullName: repo.full_name
            });
            toast.success("Kill Switch Initialized Successfully");
            await fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to register repository.");
        } finally {
            setRegistering(false);
        }
    };

    const handleToggleMaintenance = async (pin: string, currentState: boolean) => {
        setToggling(true);
        try {
            await apiClient.patch(`/repositories/${pin}/maintenance`, {
                isMaintenance: !currentState
            });
            toast.success(`Maintenance mode ${!currentState ? 'ENABLED' : 'DISABLED'}`);
            await fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to toggle maintenance mode.");
        } finally {
            setToggling(false);
        }
    };

    const activeRepo = repos.find(r => r.full_name === selectedRepoFullName);
    const registeredData = registeredRepos.find(r => r.github_repo_full_name === selectedRepoFullName);

    return (
        <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-2xl p-6 md:p-8 flex flex-col w-full h-fit flex-shrink-0">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold font-mono uppercase tracking-widest mb-1.5">
                        <ShieldAlert className="w-4 h-4 text-emerald-500" />
                        Control Plane Layer
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">
                        Repository Control & Maintenance
                    </h2>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Repository Selector */}
                <div className="w-full lg:w-1/3 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Target Repository</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                disabled={loading}
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-black hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full justify-between"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2 text-sm text-slate-500">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                                    </span>
                                ) : activeRepo ? (
                                    <span className="font-semibold text-sm truncate">{activeRepo.full_name}</span>
                                ) : (
                                    <span className="text-sm text-slate-500">Select a repository</span>
                                )}
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[240px] overflow-y-auto bg-white border border-slate-200 shadow-xl p-1.5 rounded-xl scrollbar-thin scrollbar-thumb-slate-100">
                            {repos.map(r => (
                                <DropdownMenuRadioItem
                                    key={r.id}
                                    value={r.full_name}
                                    onClick={() => setSelectedRepoFullName(r.full_name)}
                                    className="cursor-pointer font-medium px-3 py-2 text-sm hover:bg-slate-50 rounded-lg truncate"
                                >
                                    {r.full_name}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {registeredData && (
                        <div className="mt-4 flex flex-col gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">E2E Verification Status</h5>
                            
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    {['AUTH_OK', 'META_OK', 'VERIFIED'].includes(verificationStatus) ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    ) : verificationStatus === 'PENDING' ? (
                                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                    )}
                                    <span className={`text-xs font-semibold transition-colors duration-300 ${['AUTH_OK', 'META_OK', 'VERIFIED'].includes(verificationStatus) ? 'text-slate-700' : verificationStatus === 'PENDING' ? 'text-indigo-600' : 'text-slate-400'}`}>CLI Authenticated</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {['META_OK', 'VERIFIED'].includes(verificationStatus) ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    ) : verificationStatus === 'AUTH_OK' ? (
                                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                    )}
                                    <span className={`text-xs font-semibold transition-colors duration-300 ${['META_OK', 'VERIFIED'].includes(verificationStatus) ? 'text-slate-700' : verificationStatus === 'AUTH_OK' ? 'text-indigo-600' : 'text-slate-400'}`}>Environment Scanned</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {verificationStatus === 'VERIFIED' ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    ) : verificationStatus === 'META_OK' ? (
                                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                    )}
                                    <span className={`text-xs font-semibold transition-colors duration-300 ${verificationStatus === 'VERIFIED' ? 'text-slate-700' : verificationStatus === 'META_OK' ? 'text-indigo-600' : 'text-slate-400'}`}>Persistent Link Active</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status & Actions */}
                <div className="w-full lg:w-2/3">
                    {loading ? (
                        <div className="h-full w-full rounded-xl bg-slate-50 animate-pulse border border-slate-100 min-h-[120px]"></div>
                    ) : !activeRepo ? (
                         <div className="h-full w-full rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center min-h-[120px] text-slate-400 text-sm font-medium">
                            Please select a valid GitHub repository.
                         </div>
                    ) : !registeredData ? (
                        <div className="h-full w-full rounded-xl bg-amber-50/50 border border-amber-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-amber-500" />
                                    Unsecured Repository
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-md">
                                    This repository is not yet bound to the ServX Control Plane. Initialize the Kill Switch to securely generate a PIN and enable remote SDK maintenance controls.
                                </p>
                            </div>
                            <Button 
                                onClick={handleRegister} 
                                disabled={registering}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold tracking-wide shadow-md shadow-amber-500/20"
                            >
                                {registering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                                Initialize Kill Switch
                            </Button>
                        </div>
                    ) : (
                        <div className={`h-full w-full rounded-xl border p-6 flex flex-col gap-5 transition-all duration-300 ${registeredData.is_maintenance ? 'bg-red-50 border-red-200' : 'bg-emerald-50/50 border-emerald-100'}`}>
                            {/* Top row with status header text and toggle switch side-by-side */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                                <div>
                                    <h4 className={`font-extrabold text-sm flex items-center gap-2 ${registeredData.is_maintenance ? 'text-red-700' : 'text-emerald-700'}`}>
                                        <Power className="w-4 h-4" />
                                        {registeredData.is_maintenance ? 'MAINTENANCE MODE ACTIVE' : 'SYSTEM OPERATIONAL'}
                                    </h4>
                                    <p className={`text-xs mt-1 ${registeredData.is_maintenance ? 'text-red-500/80' : 'text-emerald-600/80'}`}>
                                        SDK instances running on client devices will {registeredData.is_maintenance ? 'be blocked entirely' : 'run normally'}.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200/60 shadow-sm flex-shrink-0">
                                    <div className="flex flex-col items-start sm:items-end">
                                        <span className="text-xs font-bold text-slate-800">Master Toggle</span>
                                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest leading-none">Kill Switch</span>
                                    </div>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="inline-flex">
                                                    <Switch 
                                                        checked={registeredData.is_maintenance}
                                                        onCheckedChange={() => handleToggleMaintenance(registeredData.servx_pin, registeredData.is_maintenance)}
                                                        disabled={toggling || verificationStatus !== 'VERIFIED'}
                                                        className={`${registeredData.is_maintenance ? 'data-[state=checked]:bg-red-500' : 'data-[state=unchecked]:bg-emerald-400'}`}
                                                    />
                                                </div>
                                            </TooltipTrigger>
                                            {verificationStatus !== 'VERIFIED' && (
                                                <TooltipContent>
                                                    <p>Pending E2E Verification Handshake</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>

                            {/* PIN Badge below the status */}
                            <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-white/40 w-fit backdrop-blur-sm">
                                <Key className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-mono font-bold text-slate-700">PIN:</span>
                                <code className="text-xs font-mono font-extrabold text-indigo-600 select-all">{registeredData.servx_pin}</code>
                            </div>

                            {/* Stacked Code snippets widgets (above/below each other!) */}
                            <div className="flex flex-col gap-3 w-full mt-1">
                                {/* Raw Env Variable Widget */}
                                <div className="flex items-center justify-between gap-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-2.5 w-full shadow-sm hover:border-slate-300 transition-all duration-200 group">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">Env Configuration</span>
                                        <code className="text-xs font-mono font-bold text-slate-700 truncate select-all">
                                            SERVX_GLOBAL={registeredData.servx_pin}
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => handleCopyToClipboard(`SERVX_GLOBAL=${registeredData.servx_pin}`, "Copied environment variable string!")}
                                        className="p-1.5 rounded-lg hover:bg-slate-100/80 active:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                                        title="Copy Env String"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Local CLI Command Widget */}
                                <div className="flex items-center justify-between gap-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-2.5 w-full shadow-sm hover:border-slate-300 transition-all duration-200 group">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">CLI Initialize</span>
                                        <code className="text-xs font-mono font-bold text-slate-700 truncate select-all">
                                            npx @servx/cli init --key={registeredData.servx_pin}
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => handleCopyToClipboard(`npx @servx/cli init --key=${registeredData.servx_pin}`, "Copied CLI command string!")}
                                        className="p-1.5 rounded-lg hover:bg-slate-100/80 active:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                                        title="Copy CLI Command"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* React SDK Package Widget */}
                                <div className="flex items-center justify-between gap-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl px-4 py-2.5 w-full shadow-sm hover:border-slate-300 transition-all duration-200 group">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">React SDK Install</span>
                                        <code className="text-xs font-mono font-bold text-slate-700 truncate select-all">
                                            npm install @servx/react
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => handleCopyToClipboard(`npm install @servx/react`, "Copied React SDK install command!")}
                                        className="p-1.5 rounded-lg hover:bg-slate-100/80 active:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                                        title="Copy React SDK Install Command"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 2. Ghost Mode (UserCRM) ---
const formatNameFromEmail = (email: string) => {
    const parts = email.split('@')[0].split('.');
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

const UserCRM = () => {
    const { data: admins = [], isLoading } = useAdminList();
    const [impersonating, setImpersonating] = useState<string | null>(null);

    const handleImpersonate = (userId: string, name: string) => {
        setImpersonating(userId);
        setTimeout(async () => {
            setImpersonating(null);
            toast.success(`Impersonation Session Started`, {
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
        <div className="bg-transparent relative overflow-hidden h-full flex flex-col w-full">
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
            
            <div className="p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
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
                                        onClick={() => handleImpersonate(u.id, name)}
                                        disabled={impersonating === u.id}
                                        className="h-8 text-xs font-semibold hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all ml-2 flex-shrink-0"
                                    >
                                        {impersonating === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Impersonate"}
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

// --- 3. Remote Task Executor ---
const TargetSelect = ({ options, value, onChange, placeholder, disabled }: any) => {
    const [open, onOpenChange] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);

    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(searchQuery.toLowerCase()));
    const selectedLabel = options.find((o: any) => o.id === value)?.label;

    const dropdownContent = open ? (
        <>
            <div className="fixed inset-0 z-[100]" onClick={() => { onOpenChange(false); setSearchQuery(''); }} />
            <div 
                className="fixed z-[101] w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col transform origin-top animate-in fade-in zoom-in-95 duration-200"
                style={{
                    top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
                    left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left : 0,
                    width: buttonRef.current ? buttonRef.current.getBoundingClientRect().width : 'auto',
                }}
            >
                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search targets..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                </div>
                <div className="max-h-[240px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
                    {filteredOptions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500 font-medium">
                            {options.length === 0 ? 'No options available' : 'No matches found'}
                        </div>
                    ) : (
                        filteredOptions.map((opt: any, index: number) => (
                            <button
                                key={opt.id ? `${opt.id}-${index}` : index}
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
                <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {typeof document !== 'undefined' && document.body && createPortal(dropdownContent, document.body)}
        </div>
    );
};

const TaskExecutor = () => {
    const [tasks, setTasks] = useState([
        { id: 1, taskKey: 'backup-db', name: 'Database Backup', desc: 'Trigger full backup of selected database to S3 storage', icon: Database, running: false, done: false },
        { id: 2, taskKey: 'clear-redis', name: 'Clear Redis Cache', desc: 'Flush cache for selected hosting server environment', icon: Trash2, running: false, done: false },
        { id: 3, taskKey: 'sync-github', name: 'Sync GitHub Stats', desc: 'Refresh local environment variables and GitHub repository tokens', icon: RefreshCw, running: false, done: false },
    ]);

    const [selections, setSelections] = useState<Record<number, string>>({ 1: '', 2: '', 3: '' });
    const [preflightStates, setPreflightStates] = useState<Record<number, 'idle' | 'assessing' | 'preflight' | 'executing' | 'done'>>({ 1: 'idle', 2: 'idle', 3: 'idle' });
    const [preflightData, setPreflightData] = useState<Record<number, any>>({ 1: null, 2: null, 3: null });

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
            setDbOptions(connections.map((c: any) => ({ id: c.id, label: c.name || c.id })));
            setEnvOptions([{ id: 'production', label: 'Production' }, { id: 'staging', label: 'Staging' }]);
            setRepoOptions((githubRes?.data || []).map((r: any) => ({ id: r.id.toString(), label: r.full_name })));
        } catch (err) {
            console.warn("Failed to fetch task options");
        } finally {
            setLoadingOptions(false);
        }
    }, []);

    useEffect(() => {
        fetchOptions();
    }, [fetchOptions]);

    const getOptionsForTask = (taskId: number) => {
        if (taskId === 1) return dbOptions;
        if (taskId === 2) return envOptions;
        if (taskId === 3) return repoOptions;
        return [];
    };

    const getPlaceholderForTask = (taskId: number) => {
        if (taskId === 1) return "Select Database Connection...";
        if (taskId === 2) return "Select Hosting Environment...";
        if (taskId === 3) return "Select GitHub Repository...";
        return "Select Target...";
    };

    const runPreflight = async (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        const targetId = selections[taskId];
        if (!task || !targetId) return;

        setPreflightStates(prev => ({ ...prev, [taskId]: 'assessing' }));
        try {
            const res = await apiClient.post('/tasks/assess', { task: task.taskKey, targetId });
            setPreflightData(prev => ({ ...prev, [taskId]: res.data }));
            setPreflightStates(prev => ({ ...prev, [taskId]: 'preflight' }));
        } catch (err) {
            toast.error("Failed to assess blast radius. Script aborted.");
            setPreflightStates(prev => ({ ...prev, [taskId]: 'idle' }));
        }
    };

    const executeTask = async (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        const targetId = selections[taskId];
        if (!task || !targetId) return;

        setPreflightStates(prev => ({ ...prev, [taskId]: 'executing' }));
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: true } : t));

        try {
            await apiClient.post('/tasks/execute', { task: task.taskKey, targetId });
            setTimeout(() => {
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: false, done: true } : t));
                setPreflightStates(prev => ({ ...prev, [taskId]: 'done' }));
                toast.success(`${task.name} completed successfully.`);
            }, 2500);
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
                                            options={options}
                                            value={selected}
                                            onChange={(val: string) => {
                                                setSelections(prev => ({ ...prev, [task.id]: val }));
                                                setPreflightStates(prev => ({ ...prev, [task.id]: 'idle' }));
                                                setPreflightData(prev => ({ ...prev, [task.id]: null }));
                                            }}
                                            placeholder={placeholder}
                                            disabled={task.running || task.done || preflightState === 'assessing' || preflightState === 'executing'}
                                        />
                                    )}
                                </div>
                                {!task.done && preflightState === 'idle' && (
                                    <Button
                                        onClick={() => runPreflight(task.id)}
                                        disabled={!hasSelection || task.running}
                                        className={`h-11 px-5 rounded-xl flex-shrink-0 transition-all shadow-sm ${hasSelection ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-800/20' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                                    >
                                        Run Task
                                    </Button>
                                )}
                            </div>

                            <AnimatePresence mode="wait">
                                {preflightState !== 'idle' && preflightState !== 'done' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden relative z-10 mt-1"
                                    >
                                        {preflightState === 'assessing' && (
                                            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Running blast radius assessment...
                                            </div>
                                        )}

                                        {preflightState === 'preflight' && taskPreflight && (
                                            <div className={`p-4 rounded-xl border space-y-3 ${taskPreflight.impactLevel === 'high' ? 'bg-red-50/50 border-red-100' : 'bg-blue-50/50 border-blue-100'}`}>
                                                <div className="flex items-center gap-2">
                                                    {taskPreflight.impactLevel === 'high' ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Activity className="w-4 h-4 text-blue-500" />}
                                                    <h4 className={`text-xs font-extrabold uppercase tracking-widest ${taskPreflight.impactLevel === 'high' ? 'text-red-700' : 'text-blue-700'}`}>
                                                        Pre-Flight Verification
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                                    {taskPreflight.description}
                                                </p>
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-[10px] font-mono font-bold text-slate-500">
                                                        AFFECTED_COMPONENTS: {taskPreflight.affectedComponents}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={() => {
                                                                setPreflightStates(prev => ({ ...prev, [task.id]: 'idle' }));
                                                                setPreflightData(prev => ({ ...prev, [task.id]: null }));
                                                            }}
                                                            className="h-8 text-xs font-bold hover:bg-slate-200"
                                                        >
                                                            Abort
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
            `}</style>
        </div>
    );
};

// --- E2E Help Center & Quick Start Guide ---
const IntegrationHelpCenter = () => {
    const [activeTab, setActiveTab] = useState<'what' | 'can' | 'do'>('what');

    const handleCopyToClipboard = (text: string, toastMessage: string) => {
        navigator.clipboard.writeText(text);
        toast.success(toastMessage);
    };

    return (
        <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden rounded-2xl p-6 flex flex-col gap-5 flex-shrink-0 h-fit">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100/50">
                    <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-800">E2E Help Center & Quick Start</h3>
                    <p className="text-xs text-slate-400">Master the remote kill switch and E2E integration sequence</p>
                </div>
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-slate-100 gap-2">
                <button
                    onClick={() => setActiveTab('what')}
                    className={`pb-2.5 px-2 text-xs font-bold transition-all relative ${activeTab === 'what' ? 'text-indigo-600 border-b-2 border-indigo-500 font-extrabold' : 'text-slate-400 hover:text-slate-700'}`}
                >
                    1. What is this?
                </button>
                <button
                    onClick={() => setActiveTab('can')}
                    className={`pb-2.5 px-2 text-xs font-bold transition-all relative ${activeTab === 'can' ? 'text-indigo-600 border-b-2 border-indigo-500 font-extrabold' : 'text-slate-400 hover:text-slate-700'}`}
                >
                    2. What can it do?
                </button>
                <button
                    onClick={() => setActiveTab('do')}
                    className={`pb-2.5 px-2 text-xs font-bold transition-all relative ${activeTab === 'do' ? 'text-indigo-600 border-b-2 border-indigo-500 font-extrabold' : 'text-slate-400 hover:text-slate-700'}`}
                >
                    3. What do I do? (Step-by-Step)
                </button>
            </div>

            {/* Tab Contents */}
            <div className="text-xs text-slate-600 leading-relaxed font-medium space-y-4">
                {activeTab === 'what' && (
                    <div className="space-y-3">
                        <p>
                            The **ServX Control Plane** is a centralized remote management system designed to monitor and control distributed applications (repositories) in real-time.
                        </p>
                        <p>
                            Through the use of **cryptographically secure PINs**, external applications can establish a trusted relationship with this dashboard without sharing access tokens, GitHub passwords, or server credentials.
                        </p>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100/50 flex flex-col gap-2">
                            <span className="font-bold text-slate-700 block">Core Architecture Model:</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                                Centralized Dashboard (Hub) ➔ Real-time HTTP/SSE Handshake ➔ Connected Client (Spoke)
                            </span>
                        </div>
                    </div>
                )}

                {activeTab === 'can' && (
                    <div className="space-y-3">
                        <p>
                            By integrating the `@servx/cli` and `@servx/react` SDK into your repository, you gain advanced system-level powers:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong className="text-slate-700">Remote Kill Switch:</strong> Instantly take down or restore your client-facing application from this operations dashboard with zero delays.
                            </li>
                            <li>
                                <strong className="text-slate-700">Dynamic Tooltip Lockouts:</strong> Prevent accidental toggling or deployment operations on repositories that haven't successfully proven their connectivity.
                            </li>
                            <li>
                                <strong className="text-slate-700">Framework Profiling:</strong> Automatically scan your local repository for framework configuration data (e.g. Vite, Next.js) and report package metrics back to the central hub.
                            </li>
                        </ul>
                    </div>
                )}

                {activeTab === 'do' && (
                    <div className="space-y-4">
                        <p>Follow these 4 simple steps to connect an external project to this dashboard:</p>
                        
                        <div className="space-y-3">
                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-mono font-extrabold text-[10px] text-indigo-600">1</span>
                                <div className="space-y-1">
                                    <strong className="text-slate-800 block text-[11px]">Generate a PIN</strong>
                                    <p>Select your repository in the dropdown above, and click <strong className="text-amber-600">Initialize Kill Switch</strong> to securely create a new PIN in our database.</p>
                                </div>
                            </div>

                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-mono font-extrabold text-[10px] text-indigo-600">2</span>
                                <div className="space-y-1 w-full">
                                    <strong className="text-slate-800 block text-[11px]">Run the CLI initialization command</strong>
                                    <p>Open your external repository's terminal and run the local initialization script with your generated PIN. This fires our 3-step E2E handshake:</p>
                                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 mt-1.5 flex items-center justify-between gap-3 group">
                                        <code className="text-[10px] font-mono font-bold text-slate-600 truncate">npx @servx/cli init --key=svx_YOUR_PIN</code>
                                        <button
                                            onClick={() => handleCopyToClipboard(`npx @servx/cli init`, "Copied CLI command base!")}
                                            className="p-1 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-all flex-shrink-0"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-mono font-extrabold text-[10px] text-indigo-600">3</span>
                                <div className="space-y-1 w-full">
                                    <strong className="text-slate-800 block text-[11px]">Install the React SDK package</strong>
                                    <p>Install the React hooks in your web project to listen to active control plane signals:</p>
                                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 mt-1.5 flex items-center justify-between gap-3 group">
                                        <code className="text-[10px] font-mono font-bold text-slate-600">npm install @servx/react</code>
                                        <button
                                            onClick={() => handleCopyToClipboard("npm install @servx/react", "Copied React SDK install command!")}
                                            className="p-1 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-all flex-shrink-0"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-mono font-extrabold text-[10px] text-indigo-600">4</span>
                                <div className="space-y-1">
                                    <strong className="text-slate-800 block text-[11px]">Wrap your application</strong>
                                    <p>Wrap your root component in <code className="text-indigo-600 font-mono font-bold">&lt;ServXProvider projectKey="YOUR_PIN" /&gt;</code>. The SDK will now block standard operations instantly whenever maintenance mode is toggled on.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- PAGE LAYOUT & MAIN ENTRY ---
const OperationsContent = () => {
    return (
        <div className="flex-1 flex flex-row h-full overflow-hidden bg-white rounded-t-[2.5rem] w-full">
            {/* Center Area (Main Dashboard) */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0 text-slate-800 font-sans bg-white">
                {/* Page Header */}
                <div className="px-8 py-6 border-b border-slate-100 bg-white z-10 flex-shrink-0 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
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
                </div>

                {/* Dashboard Scroll Container */}
                <div className="flex-1 p-8 overflow-y-auto w-full max-w-5xl mx-auto flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-200">
                    {/* Row 1: Repository Control Plane */}
                    <div className="flex-shrink-0">
                        <RepositoryControl />
                    </div>

                    {/* Row 2: Help Center & Quick Start Guide */}
                    <div className="flex-shrink-0 mt-2">
                        <IntegrationHelpCenter />
                    </div>

                    {/* Row 3: Remote Tasks */}
                    <div className="flex-shrink-0 mt-2">
                        <TaskExecutor />
                    </div>
                </div>
            </main>

            {/* Right Sidebar (Light Grey) - Ghost Mode */}
            <aside className="w-80 border-l border-slate-100 bg-slate-50/50 flex flex-col h-full overflow-hidden flex-shrink-0">
                <UserCRM />
            </aside>
        </div>
    );
};

const Operations = () => (
    <OperationsContent />
);

export default Operations;
