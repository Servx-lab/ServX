import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldAlert, 
  Power, 
  Image as ImageIcon, 
  Sparkles, 
  UserPlus, 
  User, 
  Fingerprint, 
  Database, 
  Trash2, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Globe, 
  Ban, 
  CheckCircle2,
  Lock,
  Zap,
  Activity,
  ChevronRight,
  ChevronDown,
  Loader2,
  Search,
  Check,
  FolderKanban,
  Triangle,
  Server
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import apiClient from '@/lib/apiClient';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectProvider, useProject } from "./ProjectContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

// Default fallbacks for when project has no stored data
const DEFAULT_KILL_SWITCHES = { maintenance: false, flags: { imageUploads: true, aiFeatures: true, newSignups: true } };
const DEFAULT_FINOPS = { currentCost: 0, projected: 0, threshold: 1.00 };
const DEFAULT_API_IPS: { ip: string; location: string; reqs: number; status: 'active' | 'banned' }[] = [];

// --- 1. Kill Switch & Feature Flags ---
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
                {/* Project Selector - inside this box */}
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Project</p>
                    <ProjectSelectDropdown />
                </div>

                {/* Global Maintenance Mode - only inside this box */}
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
                <FlagItem 
                    icon={ImageIcon} 
                    label="Image Uploads" 
                    active={flags.imageUploads} 
                    color="text-blue-500"
                />
                <FlagItem 
                    icon={Sparkles} 
                    label="Beta AI Features" 
                    active={flags.aiFeatures} 
                    color="text-purple-500"
                />
                <FlagItem 
                    icon={UserPlus} 
                    label="New User Signups" 
                    active={flags.newSignups} 
                    color="text-green-500"
                />
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


// --- 2. Ghost Mode / User CRM ---
const UserCRM = () => {
    const users = [
        { name: 'Prem Sai', role: 'Admin', email: 'prem@syntro.com', status: 'Active' },
        { name: 'Eeshitha', role: 'Editor', email: 'eeshitha@syntro.com', status: 'Away' },
        { name: 'Chitkul', role: 'Viewer', email: 'chitkul@syntro.com', status: 'Active' },
    ];

    const handleImpersonate = (user: string) => {
        toast.message(`Generating Session Token...`, {
            description: `Signing in as ${user}`,
        });
        setTimeout(() => {
            toast.success(`Logged in as ${user}`, {
                description: 'Restricted Session Active (Audit Logged)',
                icon: <Fingerprint className="w-4 h-4 text-purple-400" />,
            });
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


// --- Target Selector Dropdown (styled per spec) ---
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
                {/* Search input */}
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
                {/* Options list */}
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
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => { onOpenChange(!open); if (!open) setSearchQuery(''); }}
                className={`
                    w-full min-w-[280px] px-4 py-3 text-left text-base rounded-lg
                    bg-white border transition-all duration-200
                    flex items-center justify-between gap-2
                    ${open ? 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]' : 'border-gray-200'}
                    ${selectedLabel ? 'text-black' : 'text-gray-500'}
                    hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.5)]
                `}
            >
                <span className="truncate">{selectedLabel || placeholder}</span>
                <ChevronDown className={`w-5 h-5 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {typeof document !== 'undefined' && document.body && createPortal(dropdownContent, document.body)}
        </div>
    );
};

// --- 3. Remote Task Executor ---
const TaskExecutor = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([
        { id: 1, taskKey: 'backup-db', name: 'Force DB Backup', desc: 'Trigger full backup of selected database', icon: Database, running: false, done: false },
        { id: 2, taskKey: 'clear-redis', name: 'Clear Redis Cache', desc: 'Flush cache for selected environment', icon: Trash2, running: false, done: false },
        { id: 3, taskKey: 'sync-github', name: 'Sync GitHub Stats', desc: 'Refresh analytics for selected repo', icon: RefreshCw, running: false, done: false },
    ]);

    const [selections, setSelections] = useState<Record<number, string>>({ 1: '', 2: '', 3: '' });
    const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });

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
                console.warn('[Operations] GitHub 401 detected. Token might be expired.');
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

    const executeTask = async (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        const targetId = selections[taskId];
        if (!task || !targetId) return;

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: true, done: false } : t));

        try {
            await apiClient.post('/tasks/execute', { task: task.taskKey, targetId });
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: false, done: true } : t));
            toast.success('Task completed successfully');
        } catch {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: false } : t));
            toast.error('Task failed. Please try again.');
        }
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
                        <div key={task.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 relative overflow-visible">
                            <div className="flex flex-wrap items-center gap-4 relative z-10">
                                {/* Task Info */}
                                <div className="flex-1 min-w-[140px]">
                                    <div className="flex items-center gap-2">
                                        <task.icon className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-medium text-black">{task.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 pl-6">{task.desc}</p>
                                </div>

                                {/* Target Selector */}
                                <div className="flex-shrink-0">
                                    {loadingOptions ? (
                                        <div className="min-w-[280px] px-4 py-3 flex items-center justify-center gap-2 text-gray-500 text-base">
                                            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                                        </div>
                                    ) : (
                                        <TargetSelect
                                            value={selected}
                                            onChange={(id) => setSelections(prev => ({ ...prev, [task.id]: id }))}
                                            placeholder={placeholder}
                                            options={options}
                                            disabled={task.running || task.done}
                                            open={!!dropdownOpen[task.id]}
                                            onOpenChange={(v) => setDropdownOpen(prev => ({ ...prev, [task.id]: v }))}
                                        />
                                    )}
                                </div>

                                {/* Action Button */}
                                <div className="flex-shrink-0">
                                    {task.done ? (
                                        <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                                        </Badge>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className={`h-8 text-xs transition-all ${
                                                hasSelection
                                                    ? 'bg-blue-50 text-blue-600 border border-blue-500 hover:bg-blue-100'
                                                    : 'opacity-50 bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed'
                                            }`}
                                            onClick={() => executeTask(task.id)}
                                            disabled={task.running || !hasSelection}
                                        >
                                            {task.running ? (
                                                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Running...</>
                                            ) : (
                                                'Run Task'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

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
            `}</style>
        </div>
    );
};


// --- 4. Unified FinOps ---
const FinOps = () => {
    const { selectedProjectId } = useProject();
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
                     {/* Threshold Marker */}
                     <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 z-10" style={{ left: '70%' }}></div>
                </div>
            </div>
         </div>
    );
};


// --- 5. API Bouncer ---
const ApiBouncer = () => {
    const { selectedProjectId, bannedIps, banIp } = useProject();
    const baseIps = DEFAULT_API_IPS;
    const projectBanned = selectedProjectId ? (bannedIps[selectedProjectId] ?? new Set<string>()) : new Set<string>();
    const ips = baseIps.map((item) => ({
        ...item,
        status: (projectBanned.has(item.ip) ? 'banned' : item.status) as 'active' | 'banned',
    }));

    const handleBan = (ip: string) => {
        if (selectedProjectId) banIp(selectedProjectId, ip);
        toast("IP Address Blacklisted", {
            description: `${ip} has been added to the firewall rejection list.`,
            icon: <Ban className="w-4 h-4 text-red-500" />
        });
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


// --- Project Selection Dropdown (used inside Kill Switches & Features) ---
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

// --- PAGE LAYOUT ---
const OperationsContent = () => {
    const navigate = useNavigate();
    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0 bg-white text-black font-sans">
                 {/* Page Header */}
                 <div className="p-8 pb-4 border-b border-gray-200 bg-white/80 backdrop-blur-md z-1">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-mono mb-2 uppercase tracking-widest">
                        <Activity className="w-3 h-3" />
                        System Operations Center
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold tracking-tight text-black">
                                Global Operations & Security
                            </h1>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="border-green-500/30 bg-green-50 text-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> ALL SYSTEMS NORMAL
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="flex-1 p-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
                        
                        {/* Column 1 */}
                        <div className="space-y-6 flex flex-col lg:col-span-1">
                            {/* Widget 1: Kill Switches */}
                            <div className="flex-[2]"> 
                                <FeatureFlags />
                            </div>
                             {/* Widget 4: FinOps */}
                            <div className="flex-1">
                                <FinOps />
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-6 flex flex-col lg:col-span-1">
                             {/* Widget 2: Ghost Mode */}
                             <div className="flex-[1.5]">
                                <UserCRM />
                             </div>
                             {/* Widget 3: API Security Radar */}
                             <div className="flex-1">
                                 <ApiBouncer />
                             </div>
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-6 flex flex-col lg:col-span-1 h-full">
                            {/* Widget 5: Remote Tasks */}
                            <div className="h-full">
                                <TaskExecutor />
                            </div>
                        </div>

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
