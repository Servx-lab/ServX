import React, { useEffect, useState } from 'react';
import { Activity, Terminal, Shield, Code, MousePointer2, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { NodeState } from './AutoMedicShowcaseScene';
import { motion, useAnimationControls } from 'framer-motion';

const ERRORS = [
  {
    id: "INC-2024-8972",
    code: "ERROR 23505",
    msg: "memory limit exceeded",
    sig: "\"FATAL_OOM_PRODUCTION_API\"",
    status: 500,
    metric: "OOM",
    cursorStart: { top: "50%", left: "-10%" }
  },
  {
    id: "INC-2024-8973",
    code: "ERROR 40001",
    msg: "serialization failure",
    sig: "\"DB_DEADLOCK_DETECTED\"",
    status: 503,
    metric: "Deadlock",
    cursorStart: { top: "-10%", left: "50%" }
  },
  {
    id: "INC-2024-8974",
    code: "ERROR 502",
    msg: "bad gateway",
    sig: "\"CPU_OVERLOAD_99PERCENT\"",
    status: 502,
    metric: "CPU 99%",
    cursorStart: { top: "50%", left: "110%" }
  },
  {
    id: "INC-2024-8975",
    code: "ERROR 504",
    msg: "gateway timeout",
    sig: "\"NETWORK_LATENCY_SPIKE\"",
    status: 504,
    metric: "Latency 5s",
    cursorStart: { top: "110%", left: "50%" }
  }
];

export const AutoMedicPipelineUI = ({ nodeState, errorIndex = 0 }: { nodeState: NodeState, errorIndex?: number }) => {
  const err = ERRORS[errorIndex % 4];
  const cursorControls = useAnimationControls();
  
  const [targetLogs, setTargetLogs] = useState<string>("[6:53:08 PM] INFO Processing Request...");
  const [displayedLogs, setDisplayedLogs] = useState<string>("");
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    if (nodeState === 'corrupted') {
      setStep(1);
      const t1 = setTimeout(() => setStep(2), 800);
      const t2 = setTimeout(() => setStep(3), 1600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else if (nodeState === 'healthy') {
      setStep(0);
    } else if (nodeState === 'healing') {
      setStep(4);
    }
  }, [nodeState]);

  useEffect(() => {
    if (nodeState === 'corrupted') {
      cursorControls.set({ opacity: 0, top: err.cursorStart.top, left: err.cursorStart.left, scale: 1 });
      setTargetLogs(`[6:53:08 PM] INFO Processing Request...\n\n${err.code} - ${err.msg}\n${err.sig}`);
    } else if (nodeState === 'resolving') {
      cursorControls.start({
        top: [err.cursorStart.top, "85%"],
        left: [err.cursorStart.left, "87%"],
        transition: { duration: 1.5, ease: "easeInOut" }
      });
    } else if (nodeState === 'healing') {
      cursorControls.start({
        scale: [1, 0.8, 1],
        transition: { duration: 0.3 }
      });
      setTargetLogs(`[6:53:08 PM] INFO Processing Request...\n\n${err.code} - ${err.msg}\n\n[6:53:11 PM] INFO Deploying Fix...\n[6:53:12 PM] SUCCESS Node healed.`);
    } else {
      cursorControls.set({ opacity: 0, top: err.cursorStart.top, left: err.cursorStart.left, scale: 1 });
      setTargetLogs("[6:53:08 PM] INFO Waiting for events...\n[6:53:10 PM] INFO All systems nominal.");
    }
  }, [nodeState, cursorControls, err]);

  // Fade in cursor strictly after all boxes have appeared (step 3)
  useEffect(() => {
    if (step === 3 && nodeState === 'corrupted') {
      cursorControls.start({
        opacity: 1,
        transition: { duration: 0.3 }
      });
    }
  }, [step, nodeState, cursorControls]);

  // Typewriter effect logic
  useEffect(() => {
    let isMounted = true;
    
    setDisplayedLogs(prev => {
      // If the new target doesn't start with what we have, reset to empty
      if (!targetLogs.startsWith(prev)) return "";
      return prev;
    });

    const intervalId = setInterval(() => {
      if (!isMounted) return;
      
      setDisplayedLogs(prev => {
        if (prev.length < targetLogs.length) {
          return targetLogs.substring(0, prev.length + 2); // type 2 chars at a time for speed
        }
        clearInterval(intervalId);
        return prev;
      });
    }, 15);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [targetLogs]);

  const isError = nodeState === 'corrupted' || nodeState === 'resolving';
  const isHealed = nodeState === 'healing';
  const isIdle = nodeState === 'healthy';

  return (
    <div className="relative isolate z-0 w-full h-full bg-white rounded-xl shadow-xl border border-gray-200 p-6 flex flex-col overflow-hidden font-sans">
      
      {/* Animated Cursor */}
      <motion.div
        animate={cursorControls}
        initial={{ opacity: 0, top: "80%", left: "20%", scale: 1 }}
        className="absolute z-20 pointer-events-none flex items-center justify-center -ml-2 -mt-2"
      >
        <MousePointer2 className="w-8 h-8 text-black fill-white drop-shadow-md relative z-10" />
        {nodeState === 'healing' && (
          <span className="absolute w-12 h-12 rounded-full border-2 border-black/30 bg-black/10 animate-ping" />
        )}
      </motion.div>

      {/* Incident Status Banner */}
      <div className="flex justify-center mb-6">
        <div className={`px-4 py-1.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-colors ${isError ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : isHealed ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <div className={`w-2 h-2 rounded-full ${isError ? 'bg-indigo-500 animate-pulse' : isHealed ? 'bg-green-500' : 'bg-gray-400'}`} />
          {isError ? '1 Active Incident Detected' : isHealed ? 'Incident Resolved' : '0 Active Incidents'}
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-4 gap-4 flex-1">
        
        {/* Live Log Stream */}
        <div className="border border-gray-100 rounded-xl p-4 flex flex-col bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold text-sm">
            <Terminal className="w-4 h-4 text-gray-400" />
            Live Log Stream
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-3 font-mono text-[11px] overflow-hidden border border-gray-100">
            <pre className={`whitespace-pre-wrap ${isError ? 'text-red-600' : isHealed ? 'text-green-600' : 'text-gray-500'} transition-colors duration-500`}>
              {displayedLogs}
              <span className="inline-block w-1 h-3 bg-gray-400 ml-1 animate-pulse" />
            </pre>
          </div>
        </div>

        {/* AI Diagnostics */}
        <div className={`border rounded-xl p-4 flex flex-col bg-white shadow-sm transition-all duration-500 ${step >= 2 ? 'border-purple-200' : 'border-gray-200 opacity-60 grayscale'}`}>
          <div className="flex items-center gap-2 mb-3 text-purple-700 font-semibold text-sm">
            <Shield className="w-4 h-4" />
            AI Diagnostics
          </div>
          {step >= 2 ? (
            <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500">
              <div className="mb-2">
                <h4 className="font-bold text-gray-900 text-sm">Analysis Report</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                  Severity: SEV-1
                </span>
              </div>
              <div className={`flex-1 rounded-lg p-3 text-[11px] flex items-center justify-center text-center transition-colors border ${isHealed ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                {isHealed ? 'Fix generated and deployed.' : 'Automated analysis complete. Error signature captured.'}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
               <Activity className="w-6 h-6 animate-pulse opacity-50" />
               <span className="text-[10px] uppercase tracking-widest">Diagnosing...</span>
            </div>
          )}
        </div>

        {/* Context */}
        <div className={`border rounded-xl p-4 flex flex-col bg-white shadow-sm transition-all duration-500 ${step >= 3 ? 'border-blue-200' : 'border-gray-200 opacity-60 grayscale'}`}>
          <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold text-sm">
            <Database className="w-4 h-4" />
            Context
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-3 font-mono text-[10px] text-gray-600 overflow-hidden border border-gray-100 flex flex-col">
            {step >= 3 ? (
              <pre className="animate-in fade-in slide-in-from-bottom-2 duration-500">
{`{
  "incident_id": "${err.id}",
  "request": {
    "path": "/api",
    "method": "POST"
  },
  "status": ${isIdle ? '200' : err.status},
  "metrics": "${err.metric}"
}`}
              </pre>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                 <Database className="w-6 h-6 opacity-20" />
                 <span className="text-[10px] uppercase tracking-widest text-center">Waiting for<br/>Context...</span>
              </div>
            )}
          </div>
        </div>

        {/* Automated Resolution */}
        <div className={`border rounded-xl p-4 flex flex-col bg-white shadow-sm relative transition-all duration-500 ${(step >= 3 || nodeState === 'resolving') ? 'border-green-200' : 'border-gray-200 opacity-60 grayscale'}`}>
          <div className="flex items-center gap-2 mb-3 text-green-700 font-semibold text-sm">
            <Code className="w-4 h-4" />
            Resolution
          </div>
          
          {(step >= 3 || nodeState === 'resolving' || isHealed) ? (
            <>
              <div className="flex-1 bg-green-50/50 rounded-lg p-3 font-mono text-[10px] text-green-700 border border-green-100 mb-3 flex items-center text-center animate-in fade-in duration-500">
                {isHealed ? '// Resolution applied successfully.' : '// AI fix available.'}
              </div>
              <button 
                className={`w-full py-2.5 rounded-lg font-bold text-sm text-white shadow-md transition-all duration-300 ${isHealed ? 'bg-gray-400 shadow-none scale-95 opacity-80' : 'bg-[#00C2CB] hover:bg-[#00E5F0]'}`}
              >
                {isHealed ? 'Resolved' : 'Deploy'}
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
               <Shield className="w-6 h-6 opacity-20" />
               <span className="text-[10px] uppercase tracking-widest text-center">Awaiting<br/>Analysis...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
