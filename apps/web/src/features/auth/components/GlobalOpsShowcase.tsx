import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Terminal, Zap, Power, Activity, Loader2, MousePointer2 } from 'lucide-react';
import { motion, useAnimationControls } from 'framer-motion';

export const GlobalOpsShowcase = () => {
  const [isLockdown, setIsLockdown] = useState(false);
  const [defcon, setDefcon] = useState(5);
  const [ghostMode, setGhostMode] = useState(false);

  const [circuits, setCircuits] = useState<Record<string, 'online' | 'loading' | 'offline'>>({
    OpenAI: 'online',
    Resend: 'online',
    Vercel: 'online'
  });

  const initialLogs = [
    { time: '22:04:12', type: '[SYS]', color: 'text-green-400', msg: 'Circuit OpenAI restored to closed state.' },
    { time: '22:05:01', type: '[AUTH]', color: 'text-blue-400', msg: 'Admin logged in from IP 192.168.1.100' },
    { time: '22:05:30', type: '[WARN]', color: 'text-yellow-400', msg: 'High latency detected on Redis cluster.' }
  ];

  const [logs, setLogs] = useState(initialLogs);

  const containerRef = useRef<HTMLDivElement>(null);
  const openAIButtonRef = useRef<HTMLButtonElement>(null);
  const ghostModeToggleRef = useRef<HTMLButtonElement>(null);
  const defcon1Ref = useRef<HTMLButtonElement>(null);
  const cursorControls = useAnimationControls();
  
  // Use a mutable ref for state so the async sequence can access the latest values
  const stateRef = useRef({ circuits, ghostMode, defcon });
  useEffect(() => {
    stateRef.current = { circuits, ghostMode, defcon };
  }, [circuits, ghostMode, defcon]);

  const addLog = (type: string, color: string, msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, type, color, msg }].slice(-8));
  };

  const handleTripCircuit = (name: string) => {
    if (stateRef.current.circuits[name] !== 'online') return;
    
    setCircuits(prev => ({ ...prev, [name]: 'loading' }));
    
    setTimeout(() => {
      setCircuits(prev => ({ ...prev, [name]: 'offline' }));
      addLog('[SYS]', 'text-red-400', `${name} Circuit Tripped. Using local fallback.`);
    }, 1000);
  };

  const toggleGhostMode = () => {
    const newState = !stateRef.current.ghostMode;
    setGhostMode(newState);
    if (newState) {
      addLog('[AUTH]', 'text-purple-400', 'Ghost Mode: Impersonating User session.');
    } else {
      addLog('[AUTH]', 'text-purple-400', 'Ghost Mode deactivated. Session restored.');
    }
  };

  const handleDefconChange = (level: number) => {
    setDefcon(level);
    setIsLockdown(level === 1);
    
    if (level === 1) {
      setCircuits({ OpenAI: 'offline', Resend: 'offline', Vercel: 'offline' });
      addLog('[CRITICAL]', 'text-red-500', 'SYSTEM LOCKDOWN INITIATED.');
      
      let count = 0;
      const floodInterval = setInterval(() => {
        const fakeIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        addLog('[CRITICAL]', 'text-red-500', `IP BANNED: ${fakeIp}`);
        count++;
        if (count >= 4) clearInterval(floodInterval);
      }, 300);
    } else if (level === 5 && stateRef.current.defcon === 1) {
      addLog('[SYS]', 'text-green-400', 'Lockdown lifted. Returning to normal operations.');
    }
  };

  const getCoords = (target: React.RefObject<HTMLElement>) => {
    if (!target.current || !containerRef.current) return { top: "50%", left: "50%" };
    const parentRect = containerRef.current.getBoundingClientRect();
    const rect = target.current.getBoundingClientRect();
    return {
      left: `${rect.left - parentRect.left + (rect.width / 2)}px`,
      top: `${rect.top - parentRect.top + (rect.height / 2)}px`,
    };
  };

  useEffect(() => {
    let abortController = new AbortController();

    const sleep = (ms: number, signal: AbortSignal) => 
      new Promise<void>((resolve, reject) => {
        if (signal.aborted) return reject(new Error('aborted'));
        const timeout = setTimeout(() => resolve(), ms);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('aborted'));
        });
      });

    const moveAndClick = async (targetRef: React.RefObject<HTMLElement>, signal: AbortSignal, clickAction: () => void) => {
      if (signal.aborted) throw new Error('aborted');
      
      await cursorControls.start({ ...getCoords(targetRef), transition: { duration: 1, ease: "easeInOut" } });
      if (signal.aborted) throw new Error('aborted');
      
      await cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } });
      if (signal.aborted) throw new Error('aborted');
      
      clickAction();
    };

    const runSequence = async (signal: AbortSignal) => {
      try {
        // Reset State
        setDefcon(5);
        setIsLockdown(false);
        setGhostMode(false);
        setCircuits({ OpenAI: 'online', Resend: 'online', Vercel: 'online' });
        setLogs(initialLogs);
        
        cursorControls.set({ opacity: 0, top: "80%", left: "80%", scale: 1 });
        await sleep(1000, signal);
        
        cursorControls.set({ opacity: 1 });
        
        // 1. Trip OpenAI Circuit
        await moveAndClick(openAIButtonRef, signal, () => handleTripCircuit('OpenAI'));
        await sleep(2500, signal);
        
        // 2. Toggle Ghost Mode
        await moveAndClick(ghostModeToggleRef, signal, toggleGhostMode);
        await sleep(2000, signal);
        
        // 3. Initiate Lockdown (DEFCON 1)
        await moveAndClick(defcon1Ref, signal, () => handleDefconChange(1));
        await sleep(6000, signal);
        
        // Loop
        if (!signal.aborted) runSequence(signal);
      } catch (e) {
        // Aborted
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        abortController = new AbortController();
        runSequence(abortController.signal);
      } else {
        abortController.abort();
      }
    }, { threshold: 0.3 });
    
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      abortController.abort();
    };
  }, [cursorControls]);

  return (
    <section className={`py-24 transition-colors duration-1000 ${isLockdown ? 'bg-red-50/50' : 'bg-slate-50'}`}>
      <div ref={containerRef} className="container max-w-7xl mx-auto px-6 relative">
        
        <motion.div
          animate={cursorControls}
          initial={{ opacity: 0, top: "80%", left: "80%" }}
          className="absolute z-50 pointer-events-none drop-shadow-2xl"
          style={{ originX: 0, originY: 0 }}
        >
          <MousePointer2 className="w-8 h-8 text-black fill-white -rotate-12" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Box (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                Global Operations
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed">
                A God-Mode DevOps Command Center. Complete visibility and control over your global infrastructure with state-based defense mechanisms.
              </p>
            </div>
            
            {/* DEFCON Switch */}
            <div className={`backdrop-blur-md rounded-2xl border p-8 shadow-sm h-48 flex flex-col justify-center transition-colors duration-500 ${isLockdown ? 'bg-red-900/10 border-red-200' : 'bg-white/80 border-gray-200'}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-sm font-extrabold tracking-widest uppercase flex items-center gap-2 ${isLockdown ? 'text-red-600' : 'text-slate-500'}`}>
                  <ShieldAlert className="w-4 h-4" /> DEFCON Level
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  defcon === 1 ? 'bg-red-100 text-red-700 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : defcon === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}>
                  {defcon === 1 ? 'Lockdown' : defcon === 3 ? 'Elevated' : 'Normal'}
                </span>
              </div>
              
              <div className={`flex rounded-lg p-1 transition-colors duration-500 ${isLockdown ? 'bg-red-100/50' : 'bg-slate-100'}`}>
                {[5, 3, 1].map((level) => (
                  <button
                    key={level}
                    ref={level === 1 ? defcon1Ref : null}
                    onClick={() => handleDefconChange(level)}
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                      defcon === level 
                        ? (level === 1 ? 'bg-red-500 text-white shadow-md shadow-red-500/50' : level === 3 ? 'bg-yellow-500 text-white shadow-md' : 'bg-green-500 text-white shadow-md')
                        : `text-slate-500 hover:text-slate-700 ${isLockdown ? 'hover:bg-red-200/50' : 'hover:bg-slate-200/50'}`
                    }`}
                  >
                    {level === 1 ? 'DEFCON 1' : level === 3 ? 'DEFCON 3' : 'DEFCON 5'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Ghost Mode Toggle */}
            <div className={`backdrop-blur-md rounded-2xl border p-8 shadow-sm h-32 flex items-center justify-between transition-colors duration-500 ${isLockdown ? 'bg-red-900/10 border-red-200' : 'bg-white/80 border-gray-200'}`}>
              <div>
                <h3 className={`text-sm font-extrabold tracking-widest uppercase ${isLockdown ? 'text-red-600' : 'text-slate-500'}`}>Ghost Mode</h3>
                <p className={`text-xs mt-1 ${isLockdown ? 'text-red-400' : 'text-slate-400'}`}>Impersonate user sessions securely</p>
              </div>
              <button 
                ref={ghostModeToggleRef}
                onClick={toggleGhostMode}
                className={`w-14 h-8 rounded-full p-1 transition-colors ${ghostMode ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-slate-300'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${ghostMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          
          {/* Right Box (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-8 h-full">
            
            {/* Top half: Circuit Breakers Grid (3 cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'OpenAI', icon: Activity },
                { name: 'Resend', icon: Zap },
                { name: 'Vercel', icon: Power }
              ].map((breaker) => {
                const status = circuits[breaker.name];
                return (
                  <div key={breaker.name} className={`backdrop-blur-md rounded-2xl border p-6 shadow-sm h-36 flex flex-col justify-between transition-colors duration-500 ${isLockdown ? 'bg-red-900/10 border-red-200' : 'bg-white/80 border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div className={`flex items-center gap-2 font-bold text-sm ${isLockdown ? 'text-red-700' : 'text-slate-700'}`}>
                        <breaker.icon className={`w-4 h-4 ${isLockdown ? 'text-red-400' : 'text-slate-400'}`} />
                        {breaker.name}
                      </div>
                      
                      {status === 'online' && (
                        <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-600 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                        </span>
                      )}
                      {status === 'loading' && (
                        <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-600 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Calc...
                        </span>
                      )}
                      {status === 'offline' && (
                        <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Offline
                        </span>
                      )}
                    </div>
                    
                    <button 
                      ref={breaker.name === 'OpenAI' ? openAIButtonRef : null}
                      onClick={() => handleTripCircuit(breaker.name)}
                      disabled={status !== 'online'}
                      className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${
                        status === 'online'
                          ? 'bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600'
                          : status === 'loading'
                          ? 'bg-yellow-50 border border-yellow-200 text-yellow-600 cursor-not-allowed'
                          : 'bg-red-50 border border-red-200 text-red-600 cursor-not-allowed opacity-75'
                      }`}
                    >
                      {status === 'online' ? 'Trip Circuit' : status === 'loading' ? 'Assessing...' : 'Circuit Tripped'}
                    </button>
                  </div>
                );
              })}
            </div>
            
            {/* Bottom half: Terminal Placeholder */}
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl flex-grow min-h-[300px] flex flex-col overflow-hidden relative">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <Terminal className="w-4 h-4" /> Live Audit Stream
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
              </div>
              
              <div className="font-mono text-xs space-y-2 text-slate-300 flex-grow overflow-hidden flex flex-col justify-end">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <span className="text-slate-500 shrink-0">{log.time}</span>
                    <span className={`${log.color} shrink-0`}>{log.type}</span>
                    <span className="break-all">{log.msg}</span>
                  </div>
                ))}
                <div className="flex gap-3 mt-4">
                  <span className="text-slate-500 shrink-0">{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className="text-slate-400"> TERMINAL ACTIVE <span className="animate-pulse font-black text-white">_</span></span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
};
