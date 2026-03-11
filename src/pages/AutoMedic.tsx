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
    <div className="flex h-screen w-full bg-white text-black overflow-hidden font-sans">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full pl-56 overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-50 rounded-lg border border-red-200 shadow-sm">
                <Activity className="w-5 h-5 text-red-500 animate-pulse" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
                  Auto-Medic Incident Pipeline
                  <Badge variant="outline" className="ml-2 border-red-200 text-red-600 bg-red-50 text-[10px] uppercase tracking-wider">
                    Live Incident
                  </Badge>
                </h1>
                <p className="text-xs text-gray-500 font-mono mt-0.5">ID: INC-2024-8972 • SEV-1 • DETECTED 2M AGO</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <span className="text-xs font-medium text-green-600">System Monitoring Active</span>
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full max-h-full">
            
            {/* Column 1: Live Log Stream (Input) */}
            <div className={`
                col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-500
                ${activeStep >= 1 ? 'border-red-200 shadow-[0_0_30px_-10px_rgba(239,68,68,0.1)]' : 'border-gray-200'}
            `}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2 text-black">
                        <Terminal className="w-4 h-4" />
                        <span className="text-sm font-semibold tracking-wide">Live Log Stream</span>
                    </div>
                    <Badge variant="secondary" className="bg-gray-200 text-xs font-mono text-gray-600 border-gray-300">
                        tail -f /var/log/api
                    </Badge>
                </div>
                <ScrollArea className="flex-1 p-4 font-mono text-xs leading-relaxed">
                    <div className="space-y-1 text-gray-600">
                        <p>[10:42:01] INFO  Request received: GET /api/health</p>
                        <p>[10:42:02] INFO  Health check passed (2ms)</p>
                        <p>[10:42:05] INFO  Request received: POST /api/auth/login</p>
                        <p>[10:42:05] DB    Query: SELECT * FROM users WHERE email=...</p>
                        
                        {(activeStep >= 1) && (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                <p className="text-red-600 font-bold mt-4 border-l-2 border-red-500 pl-2">
                                    [10:42:06] ERROR 500 - UnhandledPromiseRejection
                                </p>
                                <p className="text-red-500/80 pl-2">
                                    at /api/users/login.ts:42:15
                                </p>
                                <p className="text-red-500/80 pl-2">
                                    TypeError: Cannot read properties of undefined (reading 'password')
                                </p>
                                <p className="text-red-500/80 pl-2">
                                    at AuthController.validate (/src/controllers/auth.ts:12)
                                </p>
                            </div>
                        )}
                        
                        <div className="h-0.5 w-3 bg-gray-400 animate-pulse mt-1" />
                    </div>
                </ScrollArea>
                {activeStep >= 1 && (
                     <div className="p-3 bg-red-50 border-t border-red-100 flex items-center justify-center gap-2">
                         <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                         <span className="text-xs font-bold text-red-600">CRITICAL EXCEPTION CAUGHT</span>
                     </div>
                )}
            </div>

            {/* Connection Arrow 1 */}
            <div className="lg:hidden flex justify-center py-2">
                <ArrowRight className="text-gray-400" />
            </div>


            {/* Column 2: AI Error Analyzer (Diagnosis) */}
            <div className={`
                col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-700 delay-300
                ${activeStep >= 2 ? 'border-purple-200 shadow-[0_0_30px_-10px_rgba(168,85,247,0.1)]' : 'border-gray-200 opacity-50 grayscale'}
            `}>
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                    <Ghost className={`w-4 h-4 ${activeStep >= 2 ? 'text-purple-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-semibold tracking-wide text-black">AI Diagnostics</span>
                </div>
                
                <div className="flex-1 p-5 flex flex-col gap-4 relative">
                    {/* Background Grid Pattern */}
                     <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>

                    {activeStep >= 2 ? (
                        <>
                            <div className="space-y-1 animate-in fade-in zoom-in-95 duration-500">
                                <h3 className="text-lg font-bold text-black">Null Pointer Exception</h3>
                                <p className="text-xs font-mono text-purple-600">CONFIDENCE: 99.8%</p>
                            </div>
                            
                            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100 text-sm text-purple-900 leading-relaxed animate-in slide-in-from-bottom-4 duration-700">
                                <p>
                                    The authentication controller attempted to verify a password, but the received user object was <code className="bg-gray-200 px-1 py-0.5 rounded text-purple-600">undefined</code>.
                                </p>
                                <p className="mt-3">
                                    This likely happened because the email lookup returned null, but the code didn't check for existence before accessing properties.
                                </p>
                            </div>

                            <div className="mt-auto space-y-2">
                                <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest">
                                    <span>Analysis Time</span>
                                    <span>240ms</span>
                                </div>
                                <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
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
                ${activeStep >= 3 ? 'border-blue-200 shadow-[0_0_30px_-10px_rgba(59,130,246,0.1)]' : 'border-gray-200 opacity-50 grayscale'}
            `}>
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className={`w-4 h-4 ${activeStep >= 3 ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-semibold tracking-wide text-black">Request Payload</span>
                    </div>
                </div>

                 <div className="flex-1 p-0 flex flex-col relative overflow-hidden bg-gray-50">
                    {activeStep >= 3 ? (
                        <>
                            <div className="absolute top-0 right-0 p-2 opacity-50">
                                <Badge variant="outline" className="border-blue-200 text-blue-600 font-mono text-[10px] bg-white">CAPTURED</Badge>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                <pre className="text-xs font-mono text-gray-700 leading-relaxed">
{`{
  "headers": {
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0..."
  },
  "method": "POST",
  "body": {
    "email": "ghost_user@syntro.com",\n`}
    <span className="text-red-600 bg-red-50 px-1 font-bold">"password": null</span>
{`
  }
}`}
                                </pre>
                            </ScrollArea>
                            
                            <div className="p-4 border-t border-gray-200 bg-white">
                                <Button 
                                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-sm"
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
                ${activeStep >= 4 ? 'border-green-200 shadow-[0_0_30px_-10px_rgba(34,197,94,0.1)]' : 'border-gray-200 opacity-50 grayscale'}
            `}>
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Code2 className={`w-4 h-4 ${activeStep >= 4 ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-semibold tracking-wide text-black">Automated Resolution</span>
                    </div>
                </div>

                <div className="flex-1 p-0 flex flex-col relative bg-gray-50 font-mono text-xs">
                     {activeStep >= 4 ? (
                         <>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-4">
                                    {/* The Bad Code */}
                                    <div className="opacity-60 grayscale blur-[1px] hover:blur-0 transition-all">
                                        <div className="bg-red-50 border-l-2 border-red-500 p-2 text-red-700 line-through decoration-red-400">
                                            const user = await User.findOne(email);
                                        </div>
                                        <div className="bg-red-50 border-l-2 border-red-500 p-2 text-red-700 line-through decoration-red-400">
                                            const valid = user.password === input.password;
                                        </div>
                                    </div>

                                    {/* The Fix */}
                                    <div className="animate-in slide-in-from-bottom-8 duration-700">
                                        <div className="bg-green-50 border-l-2 border-green-500 p-2 text-green-800">
                                            const user = await User.findOne(email);
                                        </div>
                                        <div className="bg-green-50 border-l-2 border-green-500 p-2 text-green-800 font-bold shadow-sm">
                                            if (!user) throw new Error('User not found');
                                        </div>
                                        <div className="bg-green-50 border-l-2 border-green-500 p-2 text-green-800">
                                            const valid = user.password === input.password;
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                             <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                                <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider">
                                    <span>Safety Check</span>
                                    <span className="text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Passed
                                    </span>
                                </div>
                                <Button 
                                    className="w-full bg-green-500 hover:bg-green-600 text-white shadow-sm h-10"
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
      </main>
    </div>
  );
};

export default AutoMedic;
