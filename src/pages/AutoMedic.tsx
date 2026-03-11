import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Terminal, 
  Activity, 
  Database, 
  Code2, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Cpu,
  RefreshCw,
  Bug,
  Ghost
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Sidebar from "@/components/Sidebar";

const AutoMedic = () => {
  const [searchParams] = useSearchParams();
  const deploymentId = searchParams.get('deploymentId');
  
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Simulate the pipeline progression
  useEffect(() => {
    if (deploymentId) {
        // Here is where you would normally call fetchErrorLogs(deploymentId)
        console.log(`Auto-Medic triggered for deployment ID: ${deploymentId}`);
    }

    if (activeStep < 4) {
      const timer = setTimeout(() => {
        setActiveStep(prev => prev + 1);
      }, 1500); // 1.5s delay between steps for effect
      return () => clearTimeout(timer);
    }
  }, [activeStep]);

  const handleReplay = () => {
    setIsPlaying(true);
    setActiveStep(0);
    setTimeout(() => setIsPlaying(false), 500);
  };

  return (
    <div className="flex h-screen w-full bg-[#0B0E14] text-white overflow-hidden font-sans">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full pl-56 overflow-hidden">
        {/* Header */}
        <header className="border-b border-white/5 bg-black/20 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]">
                <Activity className="w-5 h-5 text-red-400 animate-pulse" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Auto-Medic Incident Pipeline
                  <Badge variant="outline" className="ml-2 border-red-500/30 text-red-400 bg-red-500/10 text-[10px] uppercase tracking-wider">
                    Live Incident
                  </Badge>
                </h1>
                <p className="text-xs text-white/40 font-mono mt-0.5">ID: INC-2024-8972 • SEV-1 • DETECTED 2M AGO</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <span className="text-xs font-medium text-green-400">System Monitoring Active</span>
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full max-h-full">
            
            {/* Column 1: Live Log Stream (Input) */}
            <div className={`
                col-span-1 rounded-xl border bg-black/40 backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-500
                ${activeStep >= 1 ? 'border-red-500/50 shadow-[0_0_30px_-10px_rgba(239,68,68,0.2)]' : 'border-white/5'}
            `}>
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2 text-white/70">
                        <Terminal className="w-4 h-4" />
                        <span className="text-sm font-semibold tracking-wide">Live Log Stream</span>
                    </div>
                    <Badge variant="secondary" className="bg-black/50 text-xs font-mono text-white/50 border-white/10">
                        tail -f /var/log/api
                    </Badge>
                </div>
                <ScrollArea className="flex-1 p-4 font-mono text-xs leading-relaxed opacity-90">
                    <div className="space-y-1 text-white/50">
                        <p>[10:42:01] INFO  Request received: GET /api/health</p>
                        <p>[10:42:02] INFO  Health check passed (2ms)</p>
                        <p>[10:42:05] INFO  Request received: POST /api/auth/login</p>
                        <p>[10:42:05] DB    Query: SELECT * FROM users WHERE email=...</p>
                        
                        {(activeStep >= 1) && (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                <p className="text-red-400 font-bold mt-4 border-l-2 border-red-500 pl-2">
                                    [10:42:06] ERROR 500 - UnhandledPromiseRejection
                                </p>
                                <p className="text-red-300/80 pl-2">
                                    at /api/users/login.ts:42:15
                                </p>
                                <p className="text-red-300/80 pl-2">
                                    TypeError: Cannot read properties of undefined (reading 'password')
                                </p>
                                <p className="text-red-300/80 pl-2">
                                    at AuthController.validate (/src/controllers/auth.ts:12)
                                </p>
                            </div>
                        )}
                        
                        <div className="h-0.5 w-3 bg-white/50 animate-pulse mt-1" />
                    </div>
                </ScrollArea>
                {activeStep >= 1 && (
                     <div className="p-3 bg-red-500/10 border-t border-red-500/20 flex items-center justify-center gap-2">
                         <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                         <span className="text-xs font-bold text-red-400">CRITICAL EXCEPTION CAUGHT</span>
                     </div>
                )}
            </div>

            {/* Connection Arrow 1 */}
            <div className="lg:hidden flex justify-center py-2">
                <ArrowRight className="text-white/20" />
            </div>


            {/* Column 2: AI Error Analyzer (Diagnosis) */}
            <div className={`
                col-span-1 rounded-xl border bg-white/5 backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-700 delay-300
                ${activeStep >= 2 ? 'border-purple-500/50 shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)]' : 'border-white/10 opacity-50 grayscale'}
            `}>
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <Ghost className={`w-4 h-4 ${activeStep >= 2 ? 'text-purple-400' : 'text-white/50'}`} />
                    <span className="text-sm font-semibold tracking-wide text-white/90">AI Diagnostics</span>
                </div>
                
                <div className="flex-1 p-5 flex flex-col gap-4 relative">
                    {/* Background Grid Pattern */}
                     <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

                    {activeStep >= 2 ? (
                        <>
                            <div className="space-y-1 animate-in fade-in zoom-in-95 duration-500">
                                <h3 className="text-lg font-bold text-white">Null Pointer Exception</h3>
                                <p className="text-xs font-mono text-purple-300">CONFIDENCE: 99.8%</p>
                            </div>
                            
                            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-100 leading-relaxed animate-in slide-in-from-bottom-4 duration-700">
                                <p>
                                    The authentication controller attempted to verify a password, but the received user object was <code className="bg-black/30 px-1 py-0.5 rounded text-purple-300">undefined</code>.
                                </p>
                                <p className="mt-3">
                                    This likely happened because the email lookup returned null, but the code didn't check for existence before accessing properties.
                                </p>
                            </div>

                            <div className="mt-auto space-y-2">
                                <div className="flex justify-between text-xs text-white/40 uppercase tracking-widest">
                                    <span>Analysis Time</span>
                                    <span>240ms</span>
                                </div>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[98%] shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                                </div>
                            </div>
                        </>
                    ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-2">
                             <RefreshCw className="w-8 h-8 animate-spin" />
                             <span className="text-xs uppercase tracking-widest">Waiting for Logs...</span>
                         </div>
                    )}
                </div>
            </div>


            {/* Column 3: API Time Machine (Test) */}
            <div className={`
                col-span-1 rounded-xl border bg-white/5 backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-700 delay-500
                ${activeStep >= 3 ? 'border-cyan-500/50 shadow-[0_0_30px_-10px_rgba(6,182,212,0.2)]' : 'border-white/10 opacity-50 grayscale'}
            `}>
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className={`w-4 h-4 ${activeStep >= 3 ? 'text-cyan-400' : 'text-white/50'}`} />
                        <span className="text-sm font-semibold tracking-wide text-white/90">Request Payload</span>
                    </div>
                </div>

                 <div className="flex-1 p-0 flex flex-col relative overflow-hidden bg-[#0F1115]">
                    {activeStep >= 3 ? (
                        <>
                            <div className="absolute top-0 right-0 p-2 opacity-50">
                                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-mono text-[10px]">CAPTURED</Badge>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                <pre className="text-xs font-mono text-cyan-100/80 leading-relaxed">
{`{
  "headers": {
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0..."
  },
  "method": "POST",
  "body": {
    "email": "ghost_user@syntro.com",\n`}
    <span className="text-red-400 bg-red-500/10 px-1 font-bold">"password": null</span>
{`
  }
}`}
                                </pre>
                            </ScrollArea>
                            
                            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                                <Button 
                                    className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)]"
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
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-2">
                             <Database className="w-8 h-8 opacity-20" />
                             <span className="text-xs uppercase tracking-widest">Waiting for Analysis...</span>
                         </div>
                    )}
                 </div>
            </div>


            {/* Column 4: AI Code Auto-Fixer (Resolution) */}
            <div className={`
                col-span-1 rounded-xl border bg-white/5 backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-700 delay-700
                ${activeStep >= 4 ? 'border-green-500/50 shadow-[0_0_30px_-10px_rgba(34,197,94,0.2)]' : 'border-white/10 opacity-50 grayscale'}
            `}>
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Code2 className={`w-4 h-4 ${activeStep >= 4 ? 'text-green-400' : 'text-white/50'}`} />
                        <span className="text-sm font-semibold tracking-wide text-white/90">Automated Resolution</span>
                    </div>
                </div>

                <div className="flex-1 p-0 flex flex-col relative bg-[#0F1115] font-mono text-xs">
                     {activeStep >= 4 ? (
                         <>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-4">
                                    {/* The Bad Code */}
                                    <div className="opacity-60 grayscale blur-[1px] hover:blur-0 transition-all">
                                        <div className="bg-red-500/10 border-l-2 border-red-500 p-2 text-red-100/50 line-through decoration-red-500/40">
                                            const user = await User.findOne(email);
                                        </div>
                                        <div className="bg-red-500/10 border-l-2 border-red-500 p-2 text-red-100/50 line-through decoration-red-500/40">
                                            const valid = user.password === input.password;
                                        </div>
                                    </div>

                                    {/* The Fix */}
                                    <div className="animate-in slide-in-from-bottom-8 duration-700">
                                        <div className="bg-green-500/10 border-l-2 border-green-500 p-2 text-green-200">
                                            const user = await User.findOne(email);
                                        </div>
                                        <div className="bg-green-500/10 border-l-2 border-green-500 p-2 text-green-200 font-bold shadow-[0_0_15px_-3px_rgba(34,197,94,0.1)]">
                                            if (!user) throw new Error('User not found');
                                        </div>
                                        <div className="bg-green-500/10 border-l-2 border-green-500 p-2 text-green-200">
                                            const valid = user.password === input.password;
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                             <div className="p-4 border-t border-white/5 bg-white/[0.02] space-y-3">
                                <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-wider">
                                    <span>Safety Check</span>
                                    <span className="text-green-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Passed
                                    </span>
                                </div>
                                <Button 
                                    className="w-full bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.6)] border border-green-500/50 h-10"
                                >
                                    <Cpu className="mr-2 h-4 w-4" />
                                    Commit Fix to GitHub PR
                                </Button>
                            </div>
                         </>
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-2">
                             <Bug className="w-8 h-8 opacity-20" />
                             <span className="text-xs uppercase tracking-widest">Generating Fix...</span>
                         </div>
                     )}
                </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default AutoMedic;
