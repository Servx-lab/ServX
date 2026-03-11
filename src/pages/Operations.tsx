import React, { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Sidebar from "@/components/Sidebar";

// --- 1. Kill Switch & Feature Flags ---
const FeatureFlags = () => {
    const [maintenance, setMaintenance] = useState(false);
    const [flags, setFlags] = useState({
        imageUploads: true,
        aiFeatures: true,
        newSignups: false,
    });

    const toggleFlag = (key: keyof typeof flags) => {
        setFlags(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            toast.success(`${key} is now ${newState[key] ? 'Active' : 'Disabled'}`);
            return newState;
        });
    };

    return (
        <div className="glass-card relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6 text-black">
                <Power className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold tracking-tight">Kill Switches & Features</h3>
            </div>

            <div className="space-y-6">
                {/* Big Maintenance Mode Button */}
                <div className={`
                    relative p-5 rounded-lg border transition-all duration-300 group
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
                        <Switch 
                            checked={maintenance}
                            onCheckedChange={(checked) => {
                                setMaintenance(checked);
                                if(checked) toast.error("MAINTENANCE MODE ACTIVATED - TRAFFIC BLOCKED");
                                else toast.success("Maintenance Mode Deactivated - Traffic Restored");
                            }}
                            className={`data-[state=checked]:bg-red-500`}
                        />
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
                        onChange={() => toggleFlag('imageUploads')}
                        color="text-blue-500"
                    />
                    <FlagItem 
                        icon={Sparkles} 
                        label="Beta AI Features" 
                        active={flags.aiFeatures} 
                        onChange={() => toggleFlag('aiFeatures')}
                        color="text-purple-500"
                    />
                    <FlagItem 
                        icon={UserPlus} 
                        label="New User Signups" 
                        active={flags.newSignups} 
                        onChange={() => toggleFlag('newSignups')}
                        color="text-green-500"
                    />
                </div>
            </div>
        </div>
    );
};

const FlagItem = ({ icon: Icon, label, active, onChange, color }: any) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md bg-white border border-gray-100 ${active ? color : 'text-gray-400'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`text-sm font-medium ${active ? 'text-black' : 'text-gray-400 line-through'}`}>
                {label}
            </span>
        </div>
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full shadow-sm ${active ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`} />
            <Switch checked={active} onCheckedChange={onChange} />
        </div>
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


// --- 3. Remote Task Executor ---
const TaskExecutor = () => {
    const [tasks, setTasks] = useState([
        { id: 1, name: 'Force DB Backup', icon: Database, running: false, done: false },
        { id: 2, name: 'Clear Redis Cache', icon: Trash2, running: false, done: false },
        { id: 3, name: 'Sync GitHub Stats', icon: RefreshCw, running: false, done: false },
    ]);

    const runTask = (id: number) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, running: true, done: false } : t));
        
        setTimeout(() => {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, running: false, done: true } : t));
            toast.success("Task Completed Successfully");
        }, 2000);
    };

    return (
        <div className="glass-card relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4">
             <div className="flex items-center gap-2 text-black mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold tracking-tight">Remote Tasks</h3>
            </div>

            <div className="space-y-4">
                {tasks.map(task => (
                    <div key={task.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 relative overflow-hidden">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3 text-sm font-medium text-black">
                                <task.icon className="w-4 h-4 text-gray-400" />
                                {task.name}
                            </div>
                            
                            {task.done ? (
                                <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                                </Badge>
                            ) : (
                                <Button 
                                    size="sm" 
                                    className="h-7 text-xs bg-gray-100 hover:bg-gray-200 text-black border border-gray-200"
                                    onClick={() => runTask(task.id)}
                                    disabled={task.running}
                                >
                                    {task.running ? 'Running...' : 'Run Task'}
                                </Button>
                            )}
                        </div>
                        
                        {/* Progress Bar Animation */}
                        {task.running && (
                             <div className="absolute bottom-0 left-0 h-1 bg-yellow-500 animate-[width_2s_ease-in-out_forwards] w-full origin-left" 
                                  style={{ animationName: 'width-grow' }} 
                             />
                        )}
                         <style>{`
                            @keyframes width-grow {
                                from { width: 0%; }
                                to { width: 100%; }
                            }
                        `}</style>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- 4. Unified FinOps ---
const FinOps = () => {
    const currentCost = 0.00;
    const projected = 1.20;
    const threshold = 1.00;
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
    const [ips, setIps] = useState([
        { ip: '192.168.1.45', location: 'Kiev, UA', reqs: 1240, status: 'active' },
        { ip: '10.0.0.12', location: 'San Jose, US', reqs: 980, status: 'active' },
        { ip: '172.16.0.5', location: 'Frankfurt, DE', reqs: 850, status: 'active' },
        { ip: '45.32.11.8', location: 'Beijing, CN', reqs: 420, status: 'banned' },
        { ip: '23.11.45.90', location: 'Moscow, RU', reqs: 15400, status: 'active' },
    ]);

    const handleBan = (ip: string) => {
        setIps(prev => prev.map(item => item.ip === ip ? { ...item, status: 'banned' } : item));
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


// --- PAGE LAYOUT ---
const Operations = () => {
    return (
        <div className="flex h-screen w-full bg-white text-black overflow-hidden font-sans">
            <Sidebar />
            
            <main className="flex-1 flex flex-col h-full pl-56 overflow-hidden relative z-0">
                 {/* Page Header */}
                 <div className="p-8 pb-4 border-b border-gray-200 bg-white/80 backdrop-blur-md z-1">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-mono mb-2 uppercase tracking-widest">
                        <Activity className="w-3 h-3" />
                        System Operations Center
                    </div>
                    <div className="flex justify-between items-end">
                        <h1 className="text-3xl font-bold tracking-tight text-black">
                            Global Operations & Security
                        </h1>
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
                             {/* Widget 3: Task Executor */}
                             <div className="flex-1">
                                 <TaskExecutor />
                             </div>
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-6 flex flex-col lg:col-span-1 h-full">
                            {/* Widget 5: API Bouncer */}
                            <div className="h-full">
                                <ApiBouncer />
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default Operations;
