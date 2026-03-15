import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  Terminal, 
  Server, 
  GitBranch, 
  FolderGit2, 
  ArrowRight,
  Activity,
  Ghost,
  Database,
  Code2,
  RefreshCw,
  Play,
  Cpu,
  Bug
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';

// --- MOCK ERRORS (Keep these for now as specified) ---
const mockErrors = [
    { id: '1', provider: 'Vercel', repo: 'Zync', branch: 'main', type: 'Frontend Error', message: 'TypeError: Cannot read properties of undefined', stack: 'at /api/users/login.ts:42:15\nTypeError: Cannot read properties of undefined (reading \'password\')\nat AuthController.validate (/src/controllers/auth.ts:12)' },
    { id: '2', provider: 'Vercel', repo: 'Portfolio', branch: 'main', type: 'Build Failed', message: 'Webpack compilation error', stack: 'Error: Cannot find module \'framer-motion\'\nRequire stack:\n- /src/components/Hero.tsx' },
    { id: '3', provider: 'Render', repo: 'QuizWhiz', branch: 'prod', type: 'DB Timeout', message: 'Connection timeout after 10000ms', stack: 'MongooseError: Operation `users.findOne()` buffering timed out after 10000ms\nat Timeout.<anonymous> (/node_modules/mongoose/lib/drivers/node-mongodb-native/collection.js)' },
];

export const AutoMedicPipeline = () => {
    const navigate = useNavigate();
    const [isHudOpen, setIsHudOpen] = useState(false);
    const [activeErrorId, setActiveErrorId] = useState<string | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // --- CONNECTION STATE ---
    const [connections, setConnections] = useState({ vercel: false, render: false });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                setIsLoading(true);
                const { data } = await apiClient.get('/connections');
                const hasVercel = data.some((c: any) => c.provider.toLowerCase() === 'vercel');
                const hasRender = data.some((c: any) => c.provider.toLowerCase() === 'render');
                setConnections({ vercel: hasVercel, render: hasRender });
            } catch (err) {
                console.error('Failed to fetch connections for Auto-Medic:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConnections();
    }, []);

    const isConnected = connections.vercel || connections.render;
    const activeErrors = mockErrors.length;
    
    const activeError = activeErrorId ? mockErrors.find(e => e.id === activeErrorId) : null;

    // --- LOADING STATE ---
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white h-full">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-10 h-10 text-[#6C63FF] animate-spin" strokeWidth={1.5} />
                    <span className="text-xs font-mono tracking-widest text-gray-400 uppercase">Verifying Infrastructure...</span>
                </div>
            </div>
        );
    }

    // --- GATEKEEPER VIEW ---
    if (!isConnected) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-white h-full">
                <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center space-y-6 flex flex-col items-center animate-in zoom-in-95 duration-700">
                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-2 border border-purple-100">
                       <AlertTriangle className="w-8 h-8 text-[#6C63FF]" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold tracking-tight text-black">Deployment Servers Disconnected</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            ServX cannot diagnose pipelines without infrastructure access. Please connect a hosting provider to enable Auto-Medic.
                        </p>
                    </div>
                    <Button 
                        onClick={() => navigate('/infra')}
                        className="w-full bg-[#00C2CB] hover:bg-[#00A5AD] text-white font-semibold h-11 shadow-sm transition-all"
                    >
                        Go to Connection Vault
                    </Button>
                </div>
            </div>
        );
    }

    // Pipeline logic
    const handleSelectError = (id: string) => {
        setActiveErrorId(id);
        setIsHudOpen(false);
        setActiveStep(0);
        
        // Simulate scanning
        setTimeout(() => setActiveStep(1), 500);
        setTimeout(() => setActiveStep(2), 2000);
        setTimeout(() => setActiveStep(3), 3500);
        setTimeout(() => setActiveStep(4), 5000);
    };

    const handleReplay = () => {
        setIsPlaying(true);
        setActiveStep(0);
        setTimeout(() => setIsPlaying(false), 500);
        setTimeout(() => setActiveStep(4), 1000); // skip to end for replay
    };

    // Group errors safely
    const groupedErrors = mockErrors.reduce((acc, error) => {
        if (!acc[error.provider]) {
            acc[error.provider] = [];
        }
        acc[error.provider].push(error);
        return acc;
    }, {} as Record<string, typeof mockErrors>);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white text-black font-sans relative">
            
            {/* --- SYSTEM HEALTH HUD --- */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
                <button 
                    onClick={() => setIsHudOpen(!isHudOpen)}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm backdrop-blur-md transition-all duration-300
                        ${activeErrors > 0 
                            ? 'bg-white/95 border-purple-200 hover:border-purple-400 text-purple-700 shadow-[0_0_20px_rgba(108,99,255,0.1)]' 
                            : 'bg-white/95 border-green-200 hover:border-green-400 text-green-700'
                        }
                    `}
                >
                    {activeErrors > 0 ? (
                        <>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6C63FF] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#6C63FF]"></span>
                            </span>
                            <span className="text-sm font-semibold tracking-wide">{activeErrors} Active Pipeline Failures</span>
                        </>
                    ) : (
                        <>
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-sm font-semibold tracking-wide">All Systems Nominal</span>
                        </>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isHudOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* HUD Dropdown (Framer Motion) */}
                <AnimatePresence>
                    {isHudOpen && activeErrors > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 10, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden backdrop-blur-xl origin-top"
                        >
                            <ScrollArea className="max-h-96">
                                <div className="p-2 space-y-4">
                                    {Object.entries(groupedErrors).map(([provider, errors]) => (
                                        <div key={provider} className="space-y-1">
                                            <div className="px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest bg-gray-50 rounded-md border border-gray-100">
                                                <Server className="w-3 h-3" /> {provider}
                                            </div>
                                            {errors.map(error => (
                                                <button
                                                    key={error.id}
                                                    onClick={() => handleSelectError(error.id)}
                                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group flex flex-col gap-1 border border-transparent hover:border-gray-200"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-black group-hover:text-[#6C63FF] transition-colors">
                                                            [{error.repo} - {error.type}]
                                                        </span>
                                                        {activeErrorId === error.id && <div className="w-1.5 h-1.5 rounded-full bg-[#00C2CB] shadow-[0_0_8px_rgba(0,194,203,0.8)]" />}
                                                    </div>
                                                    <span className="text-xs text-gray-500 truncate">{error.message}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- PIPELINE CONTENT --- */}
            {activeError ? (
                <div className="flex-1 p-6 pt-24 overflow-hidden flex flex-col">
                    
                    {/* Pipeline Context Headers */}
                    <div className="mb-6 flex items-center gap-3">
                         <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1.5 shadow-sm font-mono text-xs text-gray-500">
                             <div className="flex items-center gap-2 px-3 py-1.5 hover:text-black transition-colors cursor-default">
                                <Server className="w-4 h-4 text-[#00C2CB]" /> {activeError.provider}
                             </div>
                             <div className="text-gray-300 font-light">/</div>
                             <div className="flex items-center gap-2 px-3 py-1.5 hover:text-black transition-colors cursor-default">
                                <FolderGit2 className="w-4 h-4 text-[#6C63FF]" /> {activeError.repo}
                             </div>
                             <div className="text-gray-300 font-light">/</div>
                             <div className="flex items-center gap-2 px-3 py-1.5 hover:text-black transition-colors cursor-default">
                                <GitBranch className="w-4 h-4 text-green-500" /> {activeError.branch}
                             </div>
                         </div>
                         <Badge variant="outline" className="bg-purple-50 text-[#6C63FF] border-purple-100 font-mono tracking-widest text-[10px] py-1">
                             TARGET LOCKED
                         </Badge>
                    </div>

                    {/* Bento Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full max-h-[800px] pb-6">
                         {/* Column 1: Live Log Stream (Input) */}
                        <div className={`
                            col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-500
                            ${activeStep >= 1 ? 'border-red-200 bg-red-50/10' : 'border-gray-200'}
                        `}>
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-2 text-black">
                                    <Terminal className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-semibold tracking-wide">Live Log Stream</span>
                                </div>
                                <Badge variant="secondary" className="bg-white text-xs font-mono text-gray-400 border-gray-200">
                                    tail -f /var/log/api
                                </Badge>
                            </div>
                            <ScrollArea className="flex-1 p-4 font-mono text-xs leading-relaxed">
                                <div className="space-y-1 text-gray-500">
                                    <p>[10:42:01] INFO  Request received: GET /api/health</p>
                                    <p>[10:42:02] INFO  Health check passed (2ms)</p>
                                    <p>[10:42:05] INFO  Executing workload for {activeError.repo}</p>
                                    
                                    {(activeStep >= 1) && (
                                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                            <p className="text-red-500 font-bold mt-4 border-l-2 border-red-500 pl-2">
                                                [10:42:06] ERROR 500 - {activeError.type}
                                            </p>
                                            {activeError.stack.split('\n').map((line, i) => (
                                                <p key={i} className="text-red-500/80 pl-2">{line}</p>
                                            ))}
                                        </div>
                                    )}
                                    <div className="h-0.5 w-3 bg-gray-300 animate-pulse mt-1" />
                                </div>
                            </ScrollArea>
                            {activeStep >= 1 && (
                                <div className="p-3 bg-red-50 border-t border-red-100 flex items-center justify-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                                    <span className="text-xs font-bold text-red-600">{activeError.message}</span>
                                </div>
                            )}
                        </div>

                         {/* Column 2: AI Error Analyzer (Diagnosis) */}
                        <div className={`
                            col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-700 delay-300
                            ${activeStep >= 2 ? 'border-purple-200' : 'border-gray-200 opacity-50 grayscale'}
                        `}>
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                                <Ghost className={`w-4 h-4 ${activeStep >= 2 ? 'text-[#6C63FF]' : 'text-gray-400'}`} />
                                <span className="text-sm font-semibold tracking-wide text-black">AI Diagnostics</span>
                            </div>
                            
                            <div className="flex-1 p-5 flex flex-col gap-4 relative">
                                {activeStep >= 2 ? (
                                    <>
                                        <div className="space-y-1 animate-in fade-in zoom-in-95 duration-500">
                                            <h3 className="text-lg font-bold text-black">{activeError.type} Analysis</h3>
                                            <p className="text-xs font-mono text-[#6C63FF]">CONFIDENCE: 99.8%</p>
                                        </div>
                                        
                                        <div className="p-4 rounded-lg bg-purple-50 border border-purple-100 text-sm text-purple-900 leading-relaxed animate-in slide-in-from-bottom-4 duration-700">
                                            <p>
                                                Detected anomaly in <code className="bg-gray-200 px-1 py-0.5 rounded text-[#6C63FF]">{activeError.repo}</code> environment.
                                            </p>
                                            <p className="mt-3">
                                                {activeError.message}
                                            </p>
                                        </div>

                                        <div className="mt-auto space-y-2">
                                            <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest">
                                                <span>Analysis Time</span>
                                                <span>240ms</span>
                                            </div>
                                            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 w-[98%] shadow-sm" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <RefreshCw className="w-8 h-8 animate-spin" />
                                        <span className="text-xs uppercase tracking-widest">Waiting for Logs...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* Column 3: API Time Machine (Test) */}
                        <div className={`
                            col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-700 delay-500
                            ${activeStep >= 3 ? 'border-blue-200' : 'border-gray-200 opacity-50 grayscale'}
                        `}>
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Database className={`w-4 h-4 ${activeStep >= 3 ? 'text-blue-500' : 'text-gray-400'}`} />
                                    <span className="text-sm font-semibold tracking-wide text-black">Request Payload</span>
                                </div>
                            </div>

                            <div className="flex-1 p-0 flex flex-col relative overflow-hidden bg-gray-50/50">
                                {activeStep >= 3 ? (
                                    <>
                                        <ScrollArea className="flex-1 p-4">
                                            <pre className="text-xs font-mono text-gray-700 leading-relaxed">
{`{
  "context": {
    "provider": "${activeError.provider}",
    "repo": "${activeError.repo}",
    "branch": "${activeError.branch}"
  },
  "event": "CRASH",
  "payload": {
    "status": 500,\n`}
    <span className="text-red-600 bg-red-50 px-1 font-bold">    "error": "${activeError.message}"</span>
{`
  }
}`}
                                            </pre>
                                        </ScrollArea>
                                        
                                        <div className="p-4 border-t border-gray-200 bg-white">
                                            <Button 
                                                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-sm transition-all"
                                                onClick={handleReplay}
                                                disabled={isPlaying}
                                            >
                                                {isPlaying ? (
                                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Play className="mr-2 h-4 w-4 fill-current" />
                                                )}
                                                {isPlaying ? 'Replaying...' : 'Replay Request Locally'}
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Database className="w-8 h-8 opacity-20" />
                                        <span className="text-xs uppercase tracking-widest">Waiting for Analysis...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* Column 4: AI Code Auto-Fixer (Resolution) */}
                        <div className={`
                            col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-700 delay-700
                            ${activeStep >= 4 ? 'border-green-200' : 'border-gray-200 opacity-50 grayscale'}
                        `}>
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Code2 className={`w-4 h-4 ${activeStep >= 4 ? 'text-green-500' : 'text-gray-400'}`} />
                                    <span className="text-sm font-semibold tracking-wide text-black">Automated Resolution</span>
                                </div>
                            </div>

                            <div className="flex-1 p-0 flex flex-col relative bg-gray-50/50 font-mono text-xs">
                                {activeStep >= 4 ? (
                                    <>
                                        <ScrollArea className="flex-1">
                                            <div className="p-4 space-y-4">
                                                <div className="animate-in slide-in-from-bottom-8 duration-700">
                                                    <div className="bg-green-50 border-l-2 border-green-500/50 p-2 text-green-800">
                                                        // Auto-generated patch for {activeError.repo}
                                                    </div>
                                                    <div className="bg-green-50 border-l-2 border-green-500 p-2 text-green-800 font-bold shadow-sm">
                                                        + if (!target) throw new Error('{activeError.type} Handled');
                                                    </div>
                                                    <div className="bg-green-50 border-l-2 border-green-500 p-2 text-green-800/80">
                                                          return processTarget(target);
                                                    </div>
                                                </div>
                                            </div>
                                        </ScrollArea>

                                        <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                                            <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider">
                                                <span>Safety Check</span>
                                                <span className="text-green-600 flex items-center gap-1 font-bold">
                                                    <CheckCircle2 className="w-3 h-3" /> Passed
                                                </span>
                                            </div>
                                            <Button 
                                                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold shadow-sm h-10 transition-all border border-green-400"
                                            >
                                                <Cpu className="mr-2 h-4 w-4" />
                                                Commit Fix to GitHub PR
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Bug className="w-8 h-8 opacity-20" />
                                        <span className="text-xs uppercase tracking-widest">Generating Fix...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center flex-col gap-4 text-gray-300 animate-in fade-in duration-1000">
                    <Activity className="w-16 h-16 opacity-10 text-black px-2" />
                    <p className="font-mono text-sm tracking-widest uppercase opacity-40">Awaiting Target Selection</p>
                </div>
            )}
        </div>
    );
};
