import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Terminal, Zap, Power, Activity, Loader2, MousePointer2, Eye, Lock, ChevronDown } from 'lucide-react';
import { motion, useAnimationControls } from 'framer-motion';

export const GlobalOpsShowcase = () => {
  const [isLockdown, setIsLockdown] = useState(false);
  const [defcon, setDefcon] = useState(5);
  const [ghostMode, setGhostMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const mockUsers = [
    'Alex Chen', 'Emily Carter', 'Michael Ross', 'Priya Patel', 
    'Sarah Jenkins', 'David Kim', 'Jessica Day', 'Nick Miller', 
    'Winston Schmidt', 'Cece Parekh'
  ];

  const initialLogs = [
    { time: '21:55:00', type: '[SYS]', color: 'text-slate-400', msg: 'Starting global operations monitoring daemon...' },
    { time: '21:55:05', type: '[SYS]', color: 'text-green-400', msg: 'Connection to US-East data center established.' },
    { time: '21:55:06', type: '[SYS]', color: 'text-green-400', msg: 'Connection to EU-West data center established.' },
    { time: '21:58:12', type: '[INFO]', color: 'text-blue-400', msg: 'Scheduled database backup completed successfully.' },
    { time: '22:00:00', type: '[SYS]', color: 'text-slate-400', msg: 'Rotating access keys for primary vault...' },
    { time: '22:00:05', type: '[SUCCESS]', color: 'text-green-400', msg: 'Access keys rotated and securely stored.' },
    { time: '22:04:12', type: '[SYS]', color: 'text-green-400', msg: 'System initialized and actively monitoring.' },
    { time: '22:05:01', type: '[AUTH]', color: 'text-blue-400', msg: 'Admin logged in from IP 192.168.1.100' },
    { time: '22:05:30', type: '[WARN]', color: 'text-yellow-400', msg: 'High latency detected on Redis cluster.' }
  ];

  const [logs, setLogs] = useState(initialLogs);

  const containerRef = useRef<HTMLDivElement>(null);
  const ghostModeToggleRef = useRef<HTMLButtonElement>(null);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const targetUserRef = useRef<HTMLButtonElement>(null);
  const defcon1Ref = useRef<HTMLButtonElement>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const cursorControls = useAnimationControls();
  
  // Use a mutable ref for state so the async sequence can access the latest values
  const stateRef = useRef({ ghostMode, defcon, selectedUser, isDropdownOpen });
  useEffect(() => {
    stateRef.current = { ghostMode, defcon, selectedUser, isDropdownOpen };
  }, [ghostMode, defcon, selectedUser, isDropdownOpen]);

  // Auto-scroll terminal to bottom when new logs appear
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type: string, color: string, msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, type, color, msg }].slice(-25));
  };

  const toggleGhostMode = () => {
    const newState = !stateRef.current.ghostMode;
    const user = stateRef.current.selectedUser;
    if (newState && !user) return; // Prevent toggle if no user selected
    
    setGhostMode(newState);
    if (newState) {
      addLog('[AUTH]', 'text-purple-400', `Ghost Mode: Impersonating session for ${user}.`);
    } else {
      addLog('[AUTH]', 'text-purple-400', 'Ghost Mode deactivated. Session restored.');
    }
  };

  const handleDefconChange = (level: number) => {
    setDefcon(level);
    setIsLockdown(level === 1);
    
    if (level === 1) {
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
        setSelectedUser(null);
        setIsDropdownOpen(false);
        setLogs(initialLogs);
        
        cursorControls.set({ opacity: 0, top: "80%", left: "80%", scale: 1 });
        await sleep(1000, signal);
        
        cursorControls.set({ opacity: 1 });
        
        // 1. Open Dropdown
        await moveAndClick(dropdownTriggerRef, signal, () => setIsDropdownOpen(true));
        await sleep(800, signal);
        
        // Simulate scrolling inside the dropdown
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 80, behavior: 'smooth' });
        }
        await sleep(500, signal);

        // 2. Select Target User
        await moveAndClick(targetUserRef, signal, () => {
          setSelectedUser('Sarah Jenkins');
          setIsDropdownOpen(false);
        });
        await sleep(1000, signal);

        // 3. Toggle Ghost Mode
        await moveAndClick(ghostModeToggleRef, signal, toggleGhostMode);
        await sleep(2000, signal);
        
        // 4. Initiate Lockdown (DEFCON 1)
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
          className="absolute z-[9999] pointer-events-none drop-shadow-2xl"
          style={{ originX: 0, originY: 0 }}
        >
          <MousePointer2 className="w-8 h-8 text-black fill-white -rotate-12" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Box (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-8 pointer-events-none select-none">
            <div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                Global Operations
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed">
                A God-Mode DevOps Command Center. Complete visibility and control over your global infrastructure with state-based defense mechanisms.
              </p>
            </div>
            
            {/* Ghost Mode Toggle */}
            <div className={`backdrop-blur-md rounded-2xl border p-8 shadow-sm flex flex-col justify-center transition-colors duration-500 relative z-50 ${isLockdown ? 'bg-red-900/10 border-red-200' : 'bg-white/80 border-gray-200'}`}>
              {/* User Selection Dropdown */}
              <div className="mb-8 relative z-20">
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isLockdown ? 'text-red-500' : 'text-slate-400'}`}>Select Target User</p>
                <button
                  ref={dropdownTriggerRef}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    isDropdownOpen ? 'border-purple-400 ring-2 ring-purple-400/20 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {selectedUser ? (
                    <div className="flex items-center gap-2 text-slate-800">
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[10px] text-white">
                        {selectedUser.split(' ').map(n => n[0]).join('')}
                      </div>
                      {selectedUser}
                    </div>
                  ) : (
                    <span className="text-slate-400">Select a user to impersonate...</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-30">
                    <div ref={scrollContainerRef} className="max-h-48 overflow-y-auto p-2 scroll-smooth">
                      {mockUsers.map((user) => (
                        <button
                          key={user}
                          ref={user === 'Sarah Jenkins' ? targetUserRef : null}
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            selectedUser === user 
                              ? 'bg-purple-50 text-purple-700' 
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white ${selectedUser === user ? 'bg-purple-500' : 'bg-slate-300'}`}>
                            {user.split(' ').map(n => n[0]).join('')}
                          </div>
                          {user}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-extrabold tracking-widest uppercase ${isLockdown ? 'text-red-600' : 'text-slate-500'}`}>Ghost Mode</h3>
                  <div className="mt-1">
                    {ghostMode ? (
                      <span className="text-xs font-mono text-purple-600">SYS_OVERRIDE_ENABLED</span>
                    ) : (
                      <p className={`text-xs ${isLockdown ? 'text-red-400' : 'text-slate-400'}`}>Impersonate user sessions securely</p>
                    )}
                  </div>
                </div>
                <button 
                  ref={ghostModeToggleRef}
                  onClick={toggleGhostMode}
                  disabled={!selectedUser}
                  className={`w-16 h-8 rounded-full p-1 transition-all duration-300 relative ${ghostMode ? 'bg-purple-600 shadow-[0_0_12px_rgba(147,51,234,0.5)]' : 'bg-slate-300'} ${!selectedUser && 'opacity-50 cursor-not-allowed'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center transform transition-transform duration-300 ${ghostMode ? 'translate-x-8' : 'translate-x-0'}`}>
                    {ghostMode ? <Eye className="w-3.5 h-3.5 text-purple-600" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </button>
              </div>
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
              
              <div className="flex gap-2 rounded-xl p-2 transition-colors duration-500 bg-slate-100 border border-slate-200 shadow-inner">
                {[5, 3, 1].map((level) => (
                  <button
                    key={level}
                    ref={level === 1 ? defcon1Ref : null}
                    onClick={() => handleDefconChange(level)}
                    className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                      defcon === level 
                        ? (level === 1 
                            ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)] font-bold tracking-widest animate-pulse' 
                            : level === 3 
                            ? 'bg-amber-500 text-white shadow-md font-bold' 
                            : 'bg-emerald-500 text-white shadow-md font-bold')
                        : 'bg-transparent text-slate-500 hover:bg-slate-200 font-semibold'
                    }`}
                  >
                    {level === 1 ? 'DEFCON 1' : level === 3 ? 'DEFCON 3' : 'DEFCON 5'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Box (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-8 h-full">
            
            {/* Terminal */}
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl flex-grow min-h-[450px] flex flex-col overflow-hidden relative">
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
              
              <div 
                ref={terminalScrollRef}
                className="font-mono text-xs space-y-2 text-slate-300 flex-grow overflow-y-auto flex flex-col justify-start"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
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
