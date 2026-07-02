import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimationControls, AnimatePresence } from 'framer-motion';
import { 
  Shield, Key, Copy, Check, Terminal, Activity, Code2, 
  Files, Search, GitBranch, Play, Settings, MousePointer2, 
  ChevronDown, ChevronRight, HelpCircle, Lock, Power,
  Bug, LayoutGrid, MessageSquare, Zap
} from 'lucide-react';

const FileIcon = ({ name }: { name: string }) => {
  if (name.endsWith('.json') || name.includes('.prettierrc')) {
    return <span className="text-[#cbcb41] font-bold text-[11px] w-4 text-center leading-none">{`{}`}</span>;
  }
  if (name.endsWith('.html')) {
    return <span className="text-[#e34f26] font-bold text-[10px] w-4 text-center leading-none">{`<>`}</span>;
  }
  if (name.endsWith('.js') || name.endsWith('.cjs')) {
    if (name.includes('eslint')) {
      return (
        <svg className="w-3.5 h-3.5 text-[#8080f2] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 13.5l-5-2.5v-5l5-2.5 5 2.5v5l-5 2.5z"/></svg>
      );
    }
    if (name.includes('babel')) {
      return <span className="text-[#f5da55] font-bold text-[12px] italic w-4 text-center leading-none">B</span>;
    }
    return <span className="text-[#f5da55] font-bold text-[10px] w-4 text-center leading-none">JS</span>;
  }
  if (name.endsWith('.ts')) {
    return <span className="text-[#3178c6] font-bold text-[10px] w-4 text-center leading-none">TS</span>;
  }
  if (name.endsWith('.yaml') || name.endsWith('.yml')) {
    return <span className="text-[#9658db] font-bold text-[12px] italic w-4 text-center leading-none">!</span>;
  }
  if (name.endsWith('.sh')) {
    return <span className="text-[#42b883] font-bold text-[12px] w-4 text-center leading-none">$</span>;
  }
  if (name.endsWith('.md')) {
    return <svg className="w-3.5 h-3.5 text-[#3a8ee6] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
  }
  if (name.includes('.gitignore')) {
    return <svg className="w-3.5 h-3.5 text-[#517a94] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 10.5l9-9c.6-.6 1.6-.6 2.1 0l9 9c.6.6.6 1.6 0 2.1l-9 9c-.6.6-1.6.6-2.1 0l-9-9c-.6-.6-.6-1.5 0-2.1z"/></svg>;
  }
  if (name.includes('.npmrc')) {
    return <svg className="w-3.5 h-3.5 text-[#cb3837] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/></svg>;
  }
  if (name.includes('LICENSE')) {
    return <svg className="w-3.5 h-3.5 text-[#d4c15e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="15" cy="9" r="4"></circle><path d="M12 12L3 21v3h3v-3h3v-3h3l1.5-1.5"></path></svg>;
  }
  if (name.endsWith('.key')) {
    return <svg className="w-3.5 h-3.5 text-[#42b883] shrink-0" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
  }
  if (name.includes('ignore') || name.includes('rules')) {
    return <svg className="w-3.5 h-3.5 text-[#858585] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>;
  }
  if (name.includes('.env') || name.includes('.editorconfig')) {
    return <Settings className="w-3.5 h-3.5 text-[#6d8086] shrink-0" strokeWidth={2} />;
  }
  return <Code2 className="w-3.5 h-3.5 text-[#858585] shrink-0" />;
};

export const VSCodeIntegrationShowcase = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorControls = useAnimationControls();
  
  const initBtnRef = useRef<HTMLButtonElement>(null);
  const copyEnvBtnRef = useRef<HTMLButtonElement>(null);
  const copyCliBtnRef = useRef<HTMLButtonElement>(null);
  const copySdkBtnRef = useRef<HTMLButtonElement>(null);
  const envSidebarRef = useRef<HTMLDivElement>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const filesIconRef = useRef<HTMLDivElement>(null);

  const [flowState, setFlowState] = useState('idle');
  const [e2eStep, setE2eStep] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [typedCommand, setTypedCommand] = useState("");
  
  const [activeFile, setActiveFile] = useState<'index.html' | '.env'>('index.html');
  const [envContent, setEnvContent] = useState("");

  const [copiedState, setCopiedState] = useState<'none'|'env'|'cli'|'sdk'>('none');

  const getCoords = (ref: React.RefObject<HTMLElement>, offset = { x: 0, y: 0 }) => {
    if (!ref.current || !containerRef.current) return { top: 0, left: 0 };
    const rect = ref.current.getBoundingClientRect();
    const parentRect = containerRef.current.getBoundingClientRect();
    return {
      left: `${rect.left - parentRect.left + (rect.width / 2) + offset.x}px`,
      top: `${rect.top - parentRect.top + (rect.height / 2) + offset.y}px`,
    };
  };

  const isVisibleRef = useRef(false);

  useEffect(() => {
    let abortController = new AbortController();

    const sleep = async (ms: number, signal: AbortSignal) => {
      let timePassed = 0;
      const interval = 20;
      while (timePassed < ms) {
        if (signal.aborted) throw new Error('aborted');
        if (isVisibleRef.current) {
          timePassed += interval;
        }
        await new Promise(r => setTimeout(r, interval));
      }
    };

    const waitUntilVisible = async (signal: AbortSignal) => {
      while (!isVisibleRef.current) {
        if (signal.aborted) throw new Error('aborted');
        await new Promise(r => setTimeout(r, 50));
      }
    };

    const moveAndClick = async (targetRef: React.RefObject<HTMLElement>, signal: AbortSignal, offset = { x: 0, y: 0 }, clickAction?: () => void) => {
      await waitUntilVisible(signal);
      if (signal.aborted) throw new Error('aborted');
      await cursorControls.start({ ...getCoords(targetRef, offset), transition: { duration: 0.8, ease: "easeInOut" } });
      await waitUntilVisible(signal);
      if (signal.aborted) throw new Error('aborted');
      await cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } });
      if (signal.aborted) throw new Error('aborted');
      if (clickAction) clickAction();
    };

    const pasteCommand = async (cmd: string, signal: AbortSignal, setter: (val: string) => void) => {
      await sleep(150, signal); // brief pause before paste
      if (signal.aborted) throw new Error('aborted');
      setter(cmd);
    };

    const runSequence = async (signal: AbortSignal) => {
      try {
        // Reset
        setFlowState('idle');
        setTerminalLines([]);
        setTypedCommand("");
        setCopiedState('none');
        setActiveFile('index.html');
        setEnvContent("");
        setIsSidebarOpen(false);
        setE2eStep(0);
        cursorControls.set({ opacity: 0, top: "80%", left: "50%", scale: 1 });
        
        await sleep(1500, signal);
        cursorControls.set({ opacity: 1 });
        
        // 0. Click Initialize Kill Switch
        await moveAndClick(initBtnRef, signal, { x: 0, y: 0 }, () => setFlowState('generating'));
        await sleep(1000, signal);
        setFlowState('connected');
        await sleep(800, signal);
        
        // 1. REACT SDK INSTALL
        await moveAndClick(copySdkBtnRef, signal, { x: 0, y: 0 }, () => setCopiedState('sdk'));
        await sleep(500, signal);
        await moveAndClick(terminalRef, signal, { x: 0, y: 0 });
        await pasteCommand("npm install @servx/react", signal, setTypedCommand);
        await sleep(300, signal);
        setTypedCommand("");
        setTerminalLines([
          "> npm install @servx/react",
          "added 1 package, and audited 254 packages in 2s",
          "found 0 vulnerabilities"
        ]);
        await sleep(800, signal);

        // 2. ENV CONFIGURATION
        await moveAndClick(copyEnvBtnRef, signal, { x: 0, y: 0 }, () => setCopiedState('env'));
        await sleep(500, signal);
        await moveAndClick(filesIconRef, signal, { x: 0, y: 0 }, () => setIsSidebarOpen(true));
        await sleep(500, signal);
        await moveAndClick(envSidebarRef, signal, { x: 0, y: 0 }, () => setActiveFile('.env'));
        await sleep(500, signal);
        await moveAndClick(editorBodyRef, signal, { x: -50, y: -50 });
        await pasteCommand("SERVX_GLOBAL=svx_3f4716250325ba3ca9070b5c", signal, setEnvContent);
        await sleep(800, signal);

        // 3. CLI INITIALIZE
        await moveAndClick(copyCliBtnRef, signal, { x: 0, y: 0 }, () => setCopiedState('cli'));
        await sleep(500, signal);
        await moveAndClick(terminalRef, signal, { x: 0, y: 0 });
        await pasteCommand("npx @servx/cli init --key=svx_3f4716250325ba3ca9070b5c", signal, setTypedCommand);
        await sleep(300, signal);
        setTypedCommand("");
        
        const outputs = [
          { msg: "> npx @servx/cli init --key=svx_3f4716250325ba3ca9070b5c", delay: 0, step: 0 },
          { msg: "[+] Authenticating with ServX Control Plane...", delay: 1000, step: 1 },
          { msg: "[+] Scanning environment variables...", delay: 1200, step: 2 },
          { msg: "[+] Linking local repository...", delay: 1200, step: 2 },
          { msg: "[✓] Success! Persistent E2E link established.", color: "text-green-400", delay: 800, step: 3 }
        ];

        let currentLines: string[] = [...terminalLines];
        for (const out of outputs) {
          await sleep(out.delay, signal);
          currentLines = [...currentLines, out.color ? `<span class="${out.color}">${out.msg}</span>` : out.msg];
          setTerminalLines(currentLines);
          if (out.step > 0) setE2eStep(out.step);
        }
        
        await sleep(500, signal);
        setFlowState('e2e_complete');
        
        await sleep(6000, signal);
        
        // Loop
        if (!signal.aborted) runSequence(signal);
      } catch (e) {
        // Aborted
      }
    };

    const observer = new IntersectionObserver((entries) => {
      isVisibleRef.current = entries[0].isIntersecting;
    }, { threshold: 0.3 });
    
    if (containerRef.current) observer.observe(containerRef.current);
    
    runSequence(abortController.signal);

    return () => {
      observer.disconnect();
      abortController.abort();
    };
  }, [cursorControls]);

  const isConnected = flowState === 'connected' || flowState === 'e2e_complete';

  return (
    <section className="py-24 bg-slate-50 border-y border-gray-200">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">Local-to-Cloud Sync</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Initialize the kill switch locally in your repository to establish a secure, remote management link instantly.</p>
        </div>
        
        <div ref={containerRef} className="w-full relative flex flex-col lg:flex-row gap-6 h-auto lg:h-[680px]">
          
          {/* Framer Motion Cursor */}
          <motion.div
            animate={cursorControls}
            initial={{ opacity: 0, top: "80%", left: "50%" }}
            className="absolute z-[100] pointer-events-none drop-shadow-2xl"
            style={{ originX: 0, originY: 0 }}
          >
            <MousePointer2 className="w-8 h-8 text-black fill-white -rotate-12" />
          </motion.div>

          {/* Left Panel: ServX Dashboard (1/3 width) */}
          <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col p-5 overflow-hidden relative">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">System Operations</span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Repository Control & Maintenance</h3>
            
            <div className="mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Target Repository</label>
              <div className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 flex items-center justify-between shadow-sm cursor-pointer">
                <span className="font-semibold text-gray-900 text-[13px]">NovaCoreHQ/NovaCore</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.div 
                  key="unsecured"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-yellow-600" />
                    <h4 className="font-bold text-yellow-900 text-sm">Unsecured Repository</h4>
                  </div>
                  <p className="text-xs text-yellow-800/80 mb-4 leading-relaxed">
                    This repository is not yet bound to the ServX Control Plane. Initialize the Kill Switch to securely generate a PIN and enable remote SDK maintenance controls.
                  </p>
                  <button 
                    ref={initBtnRef}
                    className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Key className="w-4 h-4" /> Initialize Kill Switch
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="secured"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 shadow-sm transition-colors duration-500"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Power className="w-4 h-4 text-green-600" />
                      <h4 className="font-bold text-green-900 text-[13px]">SYSTEM OPERATIONAL</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Master Toggle</span>
                      <div className="w-8 h-4 bg-green-500 rounded-full p-0.5 cursor-pointer">
                        <div className="w-3 h-3 bg-white rounded-full translate-x-4" />
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-green-800/80 mb-3">
                    SDK instances running on client devices will run normally.
                  </p>

                  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 w-max mb-3">
                    <Key className="w-3 h-3" />
                    <span className="text-[11px] font-mono font-bold">PIN: svx_3f471625...</span>
                  </div>

                  <div className="space-y-2">
                    {/* ENV CONFIGURATION */}
                    <div className="bg-white border border-gray-200 rounded-lg p-2 flex flex-col justify-center">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">ENV CONFIGURATION</label>
                      <div className="flex items-center justify-between">
                        <code className="text-[10px] text-gray-800 font-mono font-bold truncate pr-2">
                          SERVX_GLOBAL=svx_3f47...
                        </code>
                        <button ref={copyEnvBtnRef} className="text-gray-400 shrink-0">
                          {copiedState === 'env' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* CLI INITIALIZE */}
                    <div className="bg-white border border-gray-200 rounded-lg p-2 flex flex-col justify-center">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">CLI INITIALIZE</label>
                      <div className="flex items-center justify-between">
                        <code className="text-[10px] text-gray-800 font-mono font-bold truncate pr-2">
                          npx @servx/cli init...
                        </code>
                        <button ref={copyCliBtnRef} className="text-gray-400 shrink-0">
                          {copiedState === 'cli' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* REACT SDK INSTALL */}
                    <div className="bg-white border border-gray-200 rounded-lg p-2 flex flex-col justify-center">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">REACT SDK INSTALL</label>
                      <div className="flex items-center justify-between">
                        <code className="text-[10px] text-gray-800 font-mono font-bold">
                          npm install @servx/react
                        </code>
                        <button ref={copySdkBtnRef} className="text-gray-400 shrink-0">
                          {copiedState === 'sdk' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* E2E Verification Status */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">E2E Verification Status</h4>
              <div className="space-y-2.5">
                {[
                  { label: "CLI Authenticated", active: e2eStep >= 1 },
                  { label: "Environment Scanned", active: e2eStep >= 2 },
                  { label: "Persistent Link Active", active: e2eStep >= 3 }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${item.active ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-transparent'}`}>
                      {item.active && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-xs font-medium transition-colors duration-300 ${item.active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: VSCode Replica (2/3 width) */}
          <div className="w-full lg:w-2/3 bg-[#1e1e1e] rounded-2xl shadow-xl border border-[#333] flex flex-col h-full font-sans overflow-hidden pointer-events-none select-none">
            
            {/* VSCode Top Bar */}
            <div className="h-9 bg-[#323233] flex items-center justify-between px-4 select-none shrink-0 border-b border-[#1e1e1e] relative">
              <div className="flex gap-4 items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4">
                  <title>file_type_vscode</title>
                  <path d="M29.01,5.03,23.244,2.254a1.742,1.742,0,0,0-1.989.338L2.38,19.8A1.166,1.166,0,0,0,2.3,21.447c.025.027.05.053.077.077l1.541,1.4a1.165,1.165,0,0,0,1.489.066L28.142,5.75A1.158,1.158,0,0,1,30,6.672V6.605A1.748,1.748,0,0,0,29.01,5.03Z" fill="#0065a9" />
                  <path d="M29.01,26.97l-5.766,2.777a1.745,1.745,0,0,1-1.989-.338L2.38,12.2A1.166,1.166,0,0,1,2.3,10.553c.025-.027.05-.053.077-.077l1.541-1.4A1.165,1.165,0,0,1,5.41,9.01L28.142,26.25A1.158,1.158,0,0,0,30,25.328V25.4A1.749,1.749,0,0,1,29.01,26.97Z" fill="#007acc" />
                  <path d="M23.244,29.747a1.745,1.745,0,0,1-1.989-.338A1.025,1.025,0,0,0,23,28.684V3.316a1.024,1.024,0,0,0-1.749-.724,1.744,1.744,0,0,1,1.989-.339l5.765,2.772A1.748,1.748,0,0,1,30,6.6V25.4a1.748,1.748,0,0,1-.991,1.576Z" fill="#1f9cf0" />
                </svg>
                <div className="hidden lg:flex gap-4 text-[11px] text-[#cccccc] font-medium">
                  <span className="hover:text-white cursor-pointer">File</span>
                  <span className="hover:text-white cursor-pointer">Edit</span>
                  <span className="hover:text-white cursor-pointer">Selection</span>
                  <span className="hover:text-white cursor-pointer">View</span>
                  <span className="hover:text-white cursor-pointer">Go</span>
                  <span className="hover:text-white cursor-pointer">Run</span>
                  <span className="hover:text-white cursor-pointer">Terminal</span>
                  <span className="hover:text-white cursor-pointer">Help</span>
                </div>
              </div>
              <div className="text-[11px] text-[#cccccc] font-medium absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                {activeFile} - NovaCore
              </div>
              <div className="flex gap-3 text-[#cccccc]">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
            </div>

            {/* VSCode Main Layout */}
            <div className="flex flex-grow overflow-hidden">
              
              {/* Activity Bar */}
              <div className="w-12 bg-[#333333] flex flex-col items-center py-2 shrink-0 border-r border-[#1e1e1e]">
                <div ref={filesIconRef} className={`w-full flex justify-center py-3 cursor-pointer border-l-[3px] ${isSidebarOpen ? 'border-white' : 'border-transparent'}`}>
                  <Files className={`w-6 h-6 ${isSidebarOpen ? 'text-white' : 'text-[#858585] hover:text-white'}`} strokeWidth={1.5} />
                </div>
                <div className="w-full flex justify-center py-3 cursor-pointer border-l-[3px] border-transparent">
                  <Search className="w-6 h-6 text-[#858585] hover:text-white" strokeWidth={1.5} />
                </div>
                <div className="w-full flex justify-center py-3 cursor-pointer border-l-[3px] border-transparent relative">
                  <GitBranch className="w-6 h-6 text-[#858585] hover:text-white" strokeWidth={1.5} />
                  <div className="absolute bottom-2 right-1.5 bg-[#007acc] text-white text-[9px] font-bold px-1 rounded-full flex items-center justify-center">123</div>
                </div>
                <div className="w-full flex justify-center py-3 cursor-pointer border-l-[3px] border-transparent">
                  <Bug className="w-6 h-6 text-[#858585] hover:text-white" strokeWidth={1.5} />
                </div>
                <div className="w-full flex justify-center py-3 cursor-pointer border-l-[3px] border-transparent">
                  <LayoutGrid className="w-6 h-6 text-[#858585] hover:text-white" strokeWidth={1.5} />
                </div>
                <div className="w-full flex justify-center py-3 cursor-pointer border-l-[3px] border-transparent">
                  <MessageSquare className="w-6 h-6 text-[#858585] hover:text-white" strokeWidth={1.5} />
                </div>
                <div className="w-full flex justify-center py-3 cursor-pointer border-l-[3px] border-transparent">
                  <Zap className="w-6 h-6 text-[#858585] hover:text-white" strokeWidth={1.5} />
                </div>
                <div className="mt-auto w-full flex justify-center py-3 cursor-pointer border-l-[3px] border-transparent relative">
                  <Settings className="w-6 h-6 text-[#858585] hover:text-white" strokeWidth={1.5} />
                  <div className="absolute bottom-2 right-2 bg-[#007acc] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">1</div>
                </div>
              </div>

              {/* Sidebar Explorer */}
              {isSidebarOpen && (
                <div className="w-56 bg-[#252526] flex flex-col shrink-0 hidden md:flex border-r border-[#1e1e1e]">
                  <div className="h-9 px-4 flex items-center text-[11px] font-semibold text-[#cccccc] uppercase tracking-wider">
                    Explorer
                  </div>
                  <div className="px-4 py-1 text-[11px] font-bold text-[#cccccc] flex items-center gap-1 cursor-pointer">
                    <ChevronDown className="w-3 h-3" /> NOVACORE
                  </div>
                  <div className="flex flex-col text-[13px] text-[#cccccc] mt-1 pl-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> .github</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> .husky</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> app-clients</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> backend</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> dist</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> docs</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> infrastructure</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> node_modules</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> scripts</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> src</div>
                    <div className="flex items-center gap-1.5 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /> tests</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name=".editorconfig" /> .editorconfig</div>
                    <div ref={envSidebarRef} className={`flex items-center gap-2 py-1 px-4 cursor-pointer ${activeFile === '.env' ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e]'}`}>
                      <FileIcon name=".env" /> .env
                    </div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name=".gitignore" /> .gitignore</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name=".npmrc" /> .npmrc</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name=".prettierignore" /> .prettierignore</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name=".prettierrc.json" /> .prettierrc.json</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="babel.config.cjs" /> babel.config.cjs</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="coderabbit.yaml" /> coderabbit.yaml</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="components.json" /> components.json</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="cors.json" /> cors.json</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="deploy.sh" /> deploy.sh</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="eslint.config.js" /> eslint.config.js</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="firestore.rules" /> firestore.rules</div>
                    <div className={`flex items-center gap-2 py-1 px-4 cursor-pointer ${activeFile === 'index.html' ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e]'}`}>
                      <FileIcon name="index.html" /> index.html
                    </div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="jest.config.cjs" /> jest.config.cjs</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="LICENSE" /> LICENSE</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="package-lock.json" /> package-lock.json</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="package.json" /> package.json</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="playwright.config.ts" /> playwright.config.ts</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="postcss.config.js" /> postcss.config.js</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="README.md" /> README.md</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="render.yaml" /> render.yaml</div>
                    <div className="flex items-center gap-2 py-1 px-4 cursor-pointer hover:bg-[#2a2d2e]"><FileIcon name="ssh-key-2026-03-05.key" /> ssh-key-2026-03-05.key</div>
                  </div>
                </div>
              )}

              {/* Editor & Terminal Area */}
              <div className="flex flex-col flex-grow bg-[#1e1e1e] min-w-0">
                
                {/* Editor Tabs */}
                <div className="h-9 bg-[#2d2d2d] flex items-end shrink-0 overflow-x-auto no-scrollbar">
                  <div className={`h-full px-4 border-t-2 ${activeFile === 'index.html' ? 'bg-[#1e1e1e] border-[#007acc] text-[#cccccc]' : 'bg-[#2d2d2d] border-transparent text-[#969696] hover:bg-[#1e1e1e]'} flex items-center gap-2 text-[13px] min-w-max cursor-pointer border-r border-[#252526]`}>
                    <FileIcon name="index.html" /> index.html
                  </div>
                  <div className={`h-full px-4 border-t-2 ${activeFile === '.env' ? 'bg-[#1e1e1e] border-[#007acc] text-[#cccccc]' : 'bg-[#2d2d2d] border-transparent text-[#969696] hover:bg-[#1e1e1e]'} flex items-center gap-2 text-[13px] min-w-max cursor-pointer border-r border-[#252526]`}>
                    <FileIcon name=".env" /> .env
                  </div>
                </div>

                {/* Editor Content */}
                <div ref={editorBodyRef} className="flex-grow p-4 font-mono text-[13px] leading-relaxed overflow-y-auto text-[#d4d4d4] bg-[#1e1e1e] relative">
                  {activeFile === 'index.html' ? (
                    <>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">1</span><span className="text-[#808080]">&lt;!DOCTYPE html&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">2</span><span className="text-[#808080]">&lt;</span><span className="text-[#569cd6]">html</span> <span className="text-[#9cdcfe]">lang</span>=<span className="text-[#ce9178]">"en"</span><span className="text-[#808080]">&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">3</span><span className="pl-4 text-[#808080]">&lt;</span><span className="text-[#569cd6]">head</span><span className="text-[#808080]">&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">4</span><span className="pl-8 text-[#808080]">&lt;</span><span className="text-[#569cd6]">meta</span> <span className="text-[#9cdcfe]">name</span>=<span className="text-[#ce9178]">"viewport"</span> <span className="text-[#9cdcfe]">content</span>=<span className="text-[#ce9178]">"width=device-width, initial-scale=1.0"</span> <span className="text-[#808080]">/&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">5</span><span className="pl-8 text-[#808080]">&lt;</span><span className="text-[#569cd6]">title</span><span className="text-[#808080]">&gt;</span>NovaCore - Modern Platform<span className="text-[#808080]">&lt;/</span><span className="text-[#569cd6]">title</span><span className="text-[#808080]">&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">6</span><span className="pl-4 text-[#808080]">&lt;/</span><span className="text-[#569cd6]">head</span><span className="text-[#808080]">&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">7</span><span className="pl-4 text-[#808080]">&lt;</span><span className="text-[#569cd6]">body</span><span className="text-[#808080]">&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">8</span><span className="pl-8 text-[#808080]">&lt;</span><span className="text-[#569cd6]">div</span> <span className="text-[#9cdcfe]">id</span>=<span className="text-[#ce9178]">"root"</span><span className="text-[#808080]">&gt;&lt;/</span><span className="text-[#569cd6]">div</span><span className="text-[#808080]">&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">9</span><span className="pl-4 text-[#808080]">&lt;/</span><span className="text-[#569cd6]">body</span><span className="text-[#808080]">&gt;</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">10</span><span className="text-[#808080]">&lt;/</span><span className="text-[#569cd6]">html</span><span className="text-[#808080]">&gt;</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">1</span><span className="text-[#569cd6]">NODE_ENV</span>=<span className="text-[#ce9178]">development</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">2</span><span className="text-[#569cd6]">PORT</span>=<span className="text-[#b5cea8]">3000</span></div>
                      <div className="flex"><span className="text-[#858585] w-6 inline-block text-right pr-2">3</span><span className="text-[#9cdcfe]">{envContent}</span><span className="w-2 h-4 bg-[#cccccc] ml-1 animate-pulse inline-block align-middle" /></div>
                    </>
                  )}
                </div>

                {/* Terminal Panel */}
                <div ref={terminalRef} className="h-48 bg-[#1e1e1e] border-t border-[#333] flex flex-col shrink-0 font-mono text-[12px] p-2">
                  <div className="flex gap-4 text-[#858585] text-[11px] mb-2 px-2 uppercase font-semibold">
                    <span>Problems</span>
                    <span>Output</span>
                    <span>Debug Console</span>
                    <span className="text-[#cccccc] border-b border-[#cccccc] pb-1">Terminal</span>
                  </div>
                  <div className="flex-grow overflow-y-auto px-2 pb-2 text-[#cccccc]">
                    <div className="mb-2">Windows PowerShell<br/>Copyright (C) Microsoft Corporation. All rights reserved.</div>
                    
                    {terminalLines.map((line, idx) => (
                      <div key={idx} className="mt-1" dangerouslySetInnerHTML={{ __html: line }} />
                    ))}
                    
                    <div className="flex items-center mt-1">
                      <span className="text-[#23d18b] mr-2 shrink-0">PS C:\PROJECTS\NovaCore&gt;</span>
                      <span className="break-all">{typedCommand}</span>
                      <span className="w-2 h-4 bg-[#cccccc] ml-1 animate-pulse shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* VSCode Status Bar */}
            <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-2 text-[10.5px] font-medium shrink-0">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1.5 rounded"><GitBranch className="w-3 h-3" /> main*</span>
                <span className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1.5 rounded">0 ⚠ 0</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="cursor-pointer hover:bg-white/20 px-1.5 rounded hidden sm:block">UTF-8</span>
                <span className="cursor-pointer hover:bg-white/20 px-1.5 rounded hidden sm:block">CRLF</span>
                <span className="cursor-pointer hover:bg-white/20 px-1.5 rounded">{activeFile === 'index.html' ? 'HTML' : 'Properties'}</span>
                <span className="cursor-pointer hover:bg-white/20 px-1.5 rounded hidden md:block">Prettier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VSCodeIntegrationShowcase;
