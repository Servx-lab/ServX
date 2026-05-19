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
  Key
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/apiClient';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
                        <DropdownMenuContent align="start" className="w-[300px] bg-white border border-slate-200 shadow-xl p-1 rounded-xl">
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
                        <div className={`h-full w-full rounded-xl border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 ${registeredData.is_maintenance ? 'bg-red-50 border-red-200' : 'bg-emerald-50/50 border-emerald-100'}`}>
                            <div className="space-y-3">
                                <div>
                                    <h4 className={`font-extrabold text-sm flex items-center gap-2 ${registeredData.is_maintenance ? 'text-red-700' : 'text-emerald-700'}`}>
                                        <Power className="w-4 h-4" />
                                        {registeredData.is_maintenance ? 'MAINTENANCE MODE ACTIVE' : 'SYSTEM OPERATIONAL'}
                                    </h4>
                                    <p className={`text-xs mt-1 ${registeredData.is_maintenance ? 'text-red-500/80' : 'text-emerald-600/80'}`}>
                                        SDK instances running on client devices will {registeredData.is_maintenance ? 'be blocked entirely' : 'run normally'}.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-white/40 w-fit backdrop-blur-sm">
                                    <Key className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs font-mono font-bold text-slate-700">PIN:</span>
                                    <code className="text-xs font-mono font-extrabold text-indigo-600 select-all">{registeredData.servx_pin}</code>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white px-5 py-4 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold text-slate-800">Master Toggle</span>
                                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Kill Switch</span>
                                </div>
                                <Switch 
                                    checked={registeredData.is_maintenance}
                                    onCheckedChange={() => handleToggleMaintenance(registeredData.servx_pin, registeredData.is_maintenance)}
                                    disabled={toggling}
                                    className={`${registeredData.is_maintenance ? 'data-[state=checked]:bg-red-500' : 'data-[state=unchecked]:bg-emerald-400'}`}
                                />
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
                        filteredOptions.map((opt: any) => (
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

// --- PAGE LAYOUT & MAIN ENTRY ---
const OperationsContent = () => {
    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0 text-slate-800 font-sans rounded-t-[2.5rem] transition-colors duration-500 bg-slate-50/50">
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
          </div>

          {/* Dashboard Grid */}
          <div className="flex-1 p-8 overflow-y-auto w-full max-w-[1600px] mx-auto flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-200">
            
            {/* Top Row: Repository Control Plane */}
            <div className="flex-shrink-0">
                <RepositoryControl />
            </div>

            {/* Bottom Row: 50/50 Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-auto flex-shrink-0 mt-2">
                <div className="flex flex-col">
                    <UserCRM />
                </div>
                <div className="flex flex-col">
                    <TaskExecutor />
                </div>
            </div>

          </div>
        </main>
    );
};

const Operations = () => (
    <OperationsContent />
);

export default Operations;
