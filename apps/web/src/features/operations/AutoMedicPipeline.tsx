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
import { useLatestIncident } from './hooks';

export const AutoMedicPipeline = ({ onCheck, deploymentId }: { onCheck?: () => void, deploymentId?: string | null }) => {
    const navigate = useNavigate();
    const [isHudOpen, setIsHudOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [lastHandledIncidentId, setLastHandledIncidentId] = useState<string | null>(null);
    
    // --- REAL DATA POLLING ---
    const { data: incidentData, isLoading: isIncidentLoading } = useLatestIncident(deploymentId);
    const activeIncident = incidentData?.incident;

    // --- INFRASTRUCTURE STATE ---
    const [connections, setConnections] = useState({ vercel: false, render: false });
    const [isInfraLoading, setIsInfraLoading] = useState(true);

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                setIsInfraLoading(true);
                const { data } = await apiClient.get('/connections');
                const hasVercel = data.some((c: any) => c.provider.toLowerCase() === 'vercel');
                const hasRender = data.some((c: any) => c.provider.toLowerCase() === 'render');
                setConnections({ vercel: hasVercel, render: hasRender });
            } catch (err) {
                console.error('Failed to fetch connections for Auto-Medic:', err);
            } finally {
                setIsInfraLoading(false);
            }
        };
        fetchConnections();
    }, []);

    // --- PIPELINE STEP TRIGGER ---
    useEffect(() => {
        if (activeIncident && activeIncident.id !== lastHandledIncidentId) {
            setLastHandledIncidentId(activeIncident.id);
            setActiveStep(0);
            
            // Sequence the visual steps
            setTimeout(() => setActiveStep(1), 500);
            setTimeout(() => setActiveStep(2), 2000);
            setTimeout(() => setActiveStep(3), 3500);
            setTimeout(() => setActiveStep(4), 5000);
        }
    }, [activeIncident, lastHandledIncidentId]);

    const isConnected = connections.vercel || connections.render;

    // --- LOADING STATE ---
    if (isInfraLoading || isIncidentLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white h-full">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-10 h-10 text-[#6C63FF] animate-spin" strokeWidth={1.5} />
                    <span className="text-xs font-mono tracking-widest text-gray-400 uppercase">Synchronizing Pipeline...</span>
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

    const handleReplay = () => {
        setIsPlaying(true);
        setActiveStep(0);
        setTimeout(() => setIsPlaying(false), 500);
        setTimeout(() => setActiveStep(4), 1000); 
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white text-black font-sans relative">
            
            {/* --- SYSTEM HEALTH HUD --- */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
                <button 
                    onClick={() => setIsHudOpen(!isHudOpen)}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm backdrop-blur-md transition-all duration-300
                        ${activeIncident 
                            ? 'bg-white/95 border-gray-200 hover:border-gray-300 text-black shadow-sm' 
                            : 'bg-white/95 border-gray-200 hover:border-gray-300 text-black'
                        }
                    `}
                >
                    {activeIncident ? (
                        <>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                            </span>
                            <span className="text-sm font-semibold tracking-wide text-black">1 Active Incident Detected</span>
                        </>
                    ) : (
                        <>
                             <CheckCircle2 className="w-4 h-4 text-black" />
                             <span className="text-sm font-semibold tracking-wide text-black">All Systems Nominal</span>
                        </>
                    )}
                </button>
            </div>

            {/* --- PIPELINE CONTENT --- */}
            {activeIncident ? (
                <div className="flex-1 p-6 pt-24 overflow-hidden flex flex-col">
                    
                    <div className="mb-6 flex items-center gap-3">
                         <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm font-mono text-xs text-black font-medium">
                             <div className="flex items-center gap-2 px-3 py-1.5 cursor-default">
                                <Server className="w-4 h-4 text-black" /> PRODUCTION
                             </div>
                             <div className="text-gray-300 font-light">/</div>
                             <div className="flex items-center gap-2 px-3 py-1.5 cursor-default capitalize">
                                <FolderGit2 className="w-4 h-4 text-black" /> {activeIncident.method} {activeIncident.path}
                             </div>
                         </div>
                         <Badge variant="outline" className={`font-mono tracking-widest text-[10px] py-1 bg-white text-black border-gray-200 font-medium`}>
                             {activeIncident.cached ? 'CACHE HIT' : 'REAL-TIME ANALYSIS'}
                         </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full max-h-[800px] pb-6">
                         {/* Column 1: Live Log Stream */}
                        <div className={`col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-500 ${activeStep >= 1 ? 'border-red-200 bg-red-50/10' : 'border-gray-200'}`}>
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-2 text-black">
                                    <Terminal className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-semibold tracking-wide">Live Log Stream</span>
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-4 font-mono text-xs leading-relaxed">
                                <div className="space-y-1 text-gray-500">
                                    <p>[{new Date(activeIncident.timestamp).toLocaleTimeString()}] INFO Processing Request...</p>
                                    {(activeStep >= 1) && (
                                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                            <p className="text-red-500 font-bold mt-4 border-l-2 border-red-500 pl-2">
                                                ERROR {activeIncident.error_code} - {activeIncident.error_message}
                                            </p>
                                            <p className="text-red-500/80 pl-2 whitespace-pre-wrap">{activeIncident.error_stack?.substring(0, 300)}...</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                         {/* Column 2: AI Diagnostics */}
                        <div className={`col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-700 delay-300 ${activeStep >= 2 ? 'border-purple-200' : 'border-gray-200 opacity-50 grayscale'}`}>
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                                <Ghost className={`w-4 h-4 ${activeStep >= 2 ? 'text-[#6C63FF]' : 'text-gray-400'}`} />
                                <span className="text-sm font-semibold tracking-wide text-black">AI Diagnostics</span>
                            </div>
                            <div className="flex-1 p-5 flex flex-col gap-4 relative">
                                {activeStep >= 2 ? (
                                    <>
                                        <div className="space-y-1 animate-in fade-in zoom-in-95 duration-500">
                                            <h3 className="text-lg font-bold text-black">Analysis Report</h3>
                                            <p className="text-xs font-mono text-[#6C63FF]">SEVERITY: {activeIncident.severity}</p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-purple-50 border border-purple-100 text-sm text-purple-900 leading-relaxed animate-in slide-in-from-bottom-4 duration-700">
                                            {activeIncident.diagnosis}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <RefreshCw className="w-8 h-8 animate-spin" />
                                        <span className="text-xs uppercase tracking-widest">Diagnosing...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* Column 3: Request Payload */}
                        <div className={`col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-700 delay-500 ${activeStep >= 3 ? 'border-blue-200' : 'border-gray-200 opacity-50 grayscale'}`}>
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                                <Database className={`w-4 h-4 ${activeStep >= 3 ? 'text-blue-500' : 'text-gray-400'}`} />
                                <span className="text-sm font-semibold tracking-wide text-black">Context</span>
                            </div>
                            <div className="flex-1 p-0 flex flex-col bg-gray-50/50">
                                {activeStep >= 3 ? (
                                    <ScrollArea className="flex-1 p-4">
                                        <pre className="text-xs font-mono text-gray-700 leading-relaxed">
{`{
  "incident_id": "${activeIncident.id}",
  "request": {
    "path": "${activeIncident.path}",
    "method": "${activeIncident.method}"
  },
  "status": ${activeIncident.error_code}
}`}
                                        </pre>
                                    </ScrollArea>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Database className="w-8 h-8 opacity-20" />
                                        <span className="text-xs uppercase tracking-widest">Waiting for Context...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* Column 4: Automated Resolution */}
                        <div className={`col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-700 delay-700 ${activeStep >= 4 ? 'border-green-200' : 'border-gray-200 opacity-50 grayscale'}`}>
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Code2 className={`w-4 h-4 ${activeStep >= 4 ? 'text-green-500' : 'text-gray-400'}`} />
                                    <span className="text-sm font-semibold tracking-wide text-black">Automated Resolution</span>
                                </div>
                            </div>
                            <div className="flex-1 p-0 flex flex-col relative bg-gray-50/50 font-mono text-xs">
                                {activeStep >= 4 ? (
                                    <>
                                        <ScrollArea className="flex-1 p-4">
                                            <div className="bg-green-50 border-l-2 border-green-500/50 p-2 text-green-800 whitespace-pre-wrap">
                                                {activeIncident.suggested_fix}
                                            </div>
                                        </ScrollArea>
                                        <div className="p-4 border-t border-gray-200 bg-white">
                                            <Button 
                                                onClick={() => {
                                                    if (onCheck) onCheck();
                                                    else navigate('/auto-medic/diagnostic');
                                                }}
                                                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-10 transition-all border border-green-400"
                                            >
                                                <Activity className="mr-2 h-4 w-4" /> Check
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
                    <p className="font-mono text-sm tracking-widest uppercase opacity-40">All Systems Nominal</p>
                </div>
            )}
        </div>
    );
};
