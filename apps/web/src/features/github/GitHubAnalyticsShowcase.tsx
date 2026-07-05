import React, { useState, useRef, useEffect } from 'react';
import { Search, Github, ExternalLink, Activity, Users, MousePointer2, Check, ArrowRight, Loader2, Code, Rocket, Star, GitPullRequest, Calendar, Box, Shield, X } from 'lucide-react';
import { motion, useAnimationControls, AnimatePresence, useInView } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import Spline from '@splinetool/react-spline';

type FlowState = 'idle' | 'clicking_authorize' | 'modal_open' | 'clicking_checkbox' | 'clicking_install' | 'loading' | 'dashboard_active' | 'access_panel_open';

const KpiCard = ({ icon: Icon, label, value, color, isText }: any) => (
  <div className="bg-white border border-slate-100 p-4 rounded-xl flex items-center gap-4 hover:border-blue-200 transition-colors shadow-sm">
      <div className={`p-3 rounded-lg bg-slate-50 border border-slate-100 ${color}`}>
          <Icon className="w-5 h-5" />
      </div>
      <div>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
          <p className={`font-black text-slate-900 ${isText ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      </div>
  </div>
);

export const GitHubAnalyticsShowcase = () => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [selectedRepoIndex, setSelectedRepoIndex] = useState(0);
  const [isToggleOn, setIsToggleOn] = useState(true);
  const [isSplineReady, setIsSplineReady] = useState(false);
  
  const cursorControls = useAnimationControls();
  const scrollControls = useAnimationControls();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.3 });
  
  const authBtnRef = useRef<HTMLButtonElement>(null);
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const installBtnRef = useRef<HTMLButtonElement>(null);
  const repoRef = useRef<HTMLDivElement>(null);
  const manageAccessBtnRef = useRef<HTMLButtonElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const splineRef = useRef<any>(null);

  const splineContainerRef = useRef<HTMLDivElement>(null);
  const isSplineInView = useInView(splineContainerRef, { once: true, margin: "200px" });

  const isBulbOnRef = useRef(true); // Spline initially loads in the ON state

  // Block manual 's'
  useEffect(() => {
    const blockManualS = (e: KeyboardEvent) => {
      if (!e.isTrusted) return;
      if (e.key === 's' || e.key === 'S') {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockManualS, true);
    document.addEventListener('keydown', blockManualS, true);
    return () => {
      window.removeEventListener('keydown', blockManualS, true);
      document.removeEventListener('keydown', blockManualS, true);
    };
  }, []);

  const triggerSplineEvent = () => {
    try {
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) {
          const eventParams = { key: 's', code: 'KeyS', keyCode: 83, which: 83, bubbles: true, cancelable: true };
          canvas.dispatchEvent(new KeyboardEvent('keydown', eventParams));
          canvas.dispatchEvent(new KeyboardEvent('keyup', eventParams));
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  const setBulbState = (turnOn: boolean) => {
    if (isBulbOnRef.current !== turnOn) {
      const success = triggerSplineEvent();
      if (success) {
        isBulbOnRef.current = turnOn;
      }
    }
  };

  const onLoad = (splineApp: any) => {
    splineRef.current = splineApp;
    try { splineApp.setZoom(0.5); } catch (e) {}
    setTimeout(() => { 
      setBulbState(false); 
      setIsSplineReady(true);
    }, 2000);
  };

  const getCoords = (target: React.RefObject<HTMLElement>, offset = { x: 0, y: 0 }) => {
    if (!target.current || !containerRef.current) return { top: "50%", left: "50%" };
    const parentRect = containerRef.current.getBoundingClientRect();
    const rect = target.current.getBoundingClientRect();
    return {
      left: `${rect.left - parentRect.left + (rect.width / 2) + offset.x}px`,
      top: `${rect.top - parentRect.top + (rect.height / 2) + offset.y}px`,
    };
  };

  const moveAndClick = async (targetRef: React.RefObject<HTMLElement>, action: () => void, delay = 800) => {
    if (!targetRef.current) return;
    const coords = getCoords(targetRef, { x: 10, y: 10 });
    await cursorControls.start({ top: coords.top, left: coords.left, transition: { duration: 0.8, ease: "easeInOut" } });
    await cursorControls.start({ scale: 0.9, transition: { duration: 0.1 } });
    action();
    await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
    await new Promise(resolve => setTimeout(resolve, delay));
  };

  useEffect(() => {
    if (!isInView || !isSplineReady) return;

    let mounted = true;
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    
    const sleep = (ms: number) => new Promise(r => {
      const t = setTimeout(r, ms);
      timeouts.push(t);
    });

    const runSequence = async () => {
      // Force reset to idle when sequence starts, just in case
      setFlowState('idle');
      
      while (mounted) {
        await sleep(2000);
        if (!mounted) return;

        setFlowState('clicking_authorize');
        await moveAndClick(authBtnRef, () => { if (mounted) setFlowState('modal_open'); }, 1000);
        if (!mounted) return;

        setFlowState('clicking_checkbox');
        await moveAndClick(checkboxRef, () => { if (mounted) setIsAppInstalled(true); }, 500);
        if (!mounted) return;

        setFlowState('clicking_install');
        await moveAndClick(installBtnRef, () => { if (mounted) setFlowState('loading'); }, 1000);
        if (!mounted) return;

        await new Promise(r => setTimeout(r, 2000)); 
        if (!mounted) return;
        setFlowState('dashboard_active');
        
        setBulbState(true);

        cursorControls.start({ top: "80%", left: "90%", opacity: 0, transition: { duration: 1, delay: 1 } });

        await new Promise(r => setTimeout(r, 1000));
        if (!mounted) return;

        if (!mounted) return;
        await scrollControls.start({ y: -100, transition: { duration: 1.5, ease: "easeInOut" } });
        await sleep(1000);
        if (!mounted) return;

        // Scroll back up
        await scrollControls.start({
          y: 0,
          transition: { duration: 2, ease: "easeInOut" }
        });

        // Bring cursor back
        await cursorControls.start({ opacity: 1, top: "50%", left: "50%", transition: { duration: 0.5 } });

        // Click a different repo
        await moveAndClick(repoRef, () => { if (mounted) setSelectedRepoIndex(1); }, 1000);
        if (!mounted) return;

        // Click Manage Access
        await moveAndClick(manageAccessBtnRef, () => { if (mounted) setFlowState('access_panel_open'); }, 1000);
        if (!mounted) return;

        // Click Toggle
        await moveAndClick(toggleBtnRef, () => { if (mounted) setIsToggleOn(false); }, 1000);
        if (!mounted) return;
        setFlowState('dashboard_active');
        await sleep(2000); 
        if (!mounted) return;

        // Reset
        scrollControls.set({ y: 0 });
        setFlowState('idle');
        setIsAppInstalled(false);
        setSelectedRepoIndex(0);
        setIsToggleOn(true);
        setBulbState(false); 
        cursorControls.set({ opacity: 1, top: "80%", left: "80%", scale: 1 });
      }
    };

    runSequence();

    return () => {
      mounted = false;
      timeouts.forEach(clearTimeout);
      setFlowState('idle'); // Force reset state if scrolled away
      setIsAppInstalled(false);
      setSelectedRepoIndex(0);
      setIsToggleOn(true);
      scrollControls.set({ y: 0 });
      setBulbState(false); // Force bulb OFF if scrolled away
    };
  }, [cursorControls, scrollControls, isInView, isSplineReady]);

  // Random Mock Data
  const repos = [
    { name: 'Orbit-API', active: selectedRepoIndex === 0, desc: 'Real-time sync engine', date: 'Jul 04' },
    { name: 'Nova-Client', active: selectedRepoIndex === 1, desc: 'React frontend portal', date: 'Jul 03' },
    { name: 'Nexus-Core', active: selectedRepoIndex === 2, desc: 'Go microservices cluster', date: 'Jul 01' },
    { name: 'Starlight-Docs', active: selectedRepoIndex === 3, desc: 'MDX documentation site', date: 'Jun 28' },
    { name: 'Aether-CLI', active: selectedRepoIndex === 4, desc: 'Developer terminal tools', date: 'Jun 15' },
  ];

  const bars = [
    { height: 30, delay: 0.1 }, { height: 50, delay: 0.2 }, { height: 100, delay: 0.3, active: true },
    { height: 60, delay: 0.4 }, { height: 40, delay: 0.5 },
  ];

  const languageData = [
    { name: 'JavaScript', bytes: 55000, fill: '#3B82F6' },
    { name: 'TypeScript', bytes: 42700, fill: '#A855F7' },
    { name: 'HTML', bytes: 1500, fill: '#EF4444' },
    { name: 'CSS', bytes: 400, fill: '#10B981' },
  ];
  const totalBytes = languageData.reduce((acc, curr) => acc + curr.bytes, 0);

  const deployments = [
    { id: 1, env: 'Preview', state: 'success', date: 'Jul 03', bot: 'vercel[bot]' },
    { id: 2, env: 'Production', state: 'success', date: 'Jul 02', bot: 'vercel[bot]' },
    { id: 3, env: 'Preview', state: 'pending', date: 'Jul 02', bot: 'vercel[bot]' },
  ];

  const pathVariants = { hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 1.5, ease: "easeInOut" } } };
  const fillVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1.5, ease: "easeInOut" } } };

  return (
    <section className="py-24 bg-slate-50 px-6 overflow-hidden pointer-events-none select-none">
      <div className="container max-w-[1400px] mx-auto mb-16 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Unleash Your <span className="text-blue-600">GitHub</span> Data
        </h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Instantly generate deep, actionable insights into your team's repositories, contributor velocity, and code architecture.
        </p>
      </div>

      <div ref={containerRef} className="container max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 items-center relative">
        
        {/* Animated Cursor */}
        <motion.div
          animate={cursorControls}
          initial={{ opacity: 1, top: "80%", left: "80%" }}
          className="absolute z-[9999] pointer-events-none drop-shadow-2xl"
          style={{ originX: 0, originY: 0 }}
        >
          <MousePointer2 className="w-8 h-8 text-black fill-white -rotate-12" />
        </motion.div>

        {/* Left Side: 3D Model */}
        <div ref={splineContainerRef} className="w-full lg:w-[22%] h-[500px] min-w-[100px] min-h-[500px] relative flex items-center justify-center overflow-hidden rounded-2xl bg-black/5 pointer-events-none">
          {isSplineInView && <Spline scene="/3D-model/bulb.splinecode" className="w-full h-full" onLoad={onLoad} />}
        </div>

        {/* Right Side: UI Card */}
        <div className="w-full lg:w-[78%] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col md:flex-row overflow-hidden h-[600px] relative">
          
          <AnimatePresence mode="wait">
            {flowState === 'idle' || flowState === 'clicking_authorize' ? (
              <motion.div key="pre-auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center justify-center p-12 text-center h-full absolute inset-0 bg-white z-10">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <Github className="w-10 h-10 text-slate-800" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Connect GitHub</h2>
                <p className="text-slate-500 max-w-md mb-8">Authorize Servx-Lab to access your repositories and instantly generate high-performance analytics dashboards.</p>
                <button ref={authBtnRef} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
                  <Github className="w-5 h-5" /> Authorize to GitHub
                </button>
              </motion.div>
            ) : flowState === 'modal_open' || flowState === 'clicking_checkbox' || flowState === 'clicking_install' ? (
              <motion.div key="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 w-full max-w-md mx-4">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold">SL</div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center"><Github className="w-6 h-6 text-slate-800" /></div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Install Servx-Lab</h3>
                  <p className="text-sm text-slate-500 mb-6">This app would like permission to access your repositories and commit history.</p>
                  
                  <div className="flex items-start gap-3 mb-8 bg-slate-50 p-4 rounded-xl">
                    <button ref={checkboxRef} className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors ${isAppInstalled ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {isAppInstalled && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Install Servx-Lab GitHub App</p>
                      <p className="text-xs text-slate-500 mt-1">Required for advanced commit tracking and contributor analytics.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">Cancel</button>
                    <button ref={installBtnRef} className={`flex-1 py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all ${isAppInstalled ? 'bg-green-600 shadow-lg shadow-green-600/20' : 'bg-slate-300'}`}>
                      Authorize
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : flowState === 'loading' ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center justify-center p-12 text-center absolute inset-0 bg-white z-10">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Analyzing Repositories...</h3>
                <p className="text-sm text-slate-500">Generating performance charts and metrics.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Underneath: The actual dashboard */}
          <motion.div 
            className="w-full h-full flex flex-col md:flex-row relative z-0"
            animate={{ opacity: (flowState === 'dashboard_active' || flowState === 'access_panel_open') ? 1 : 0 }}
            initial={{ opacity: 0 }}
          >
            {/* Left Sidebar */}
            <div className="w-full md:w-[28%] border-b md:border-b-0 md:border-r border-slate-100 bg-white p-6 flex flex-col flex-shrink-0">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-800">GitHub Analytics</h2>
                <p className="text-sm text-slate-500 mt-1">Manage and analyze your repositories.</p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Box className="w-4 h-4" /> REPOSITORIES
                </h3>
                <span className="text-[10px] text-red-500 uppercase tracking-tight font-bold">DISCONNECT</span>
              </div>
              
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search repositories..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                {repos.map((repo, i) => (
                  <div key={i} ref={i === 1 ? repoRef : null} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${repo.active ? 'bg-blue-50/50 border border-blue-100 shadow-sm' : 'border border-transparent'}`}>
                    <div className={`mt-0.5 p-1.5 rounded-md ${repo.active ? 'bg-blue-100/50 text-blue-600' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                       <Github className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`block font-semibold text-sm truncate ${repo.active ? 'text-blue-700' : 'text-slate-700'}`}>{repo.name}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 truncate">{repo.desc}</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">Updated {repo.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content Area (Scrollable Wrapper) */}
            <div className="w-full md:w-[72%] relative overflow-hidden h-full flex-shrink-0 bg-slate-50/30">
              <motion.div 
                animate={scrollControls}
                className="w-full p-6 md:p-8 flex flex-col gap-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-extrabold text-slate-900">{repos[selectedRepoIndex].name}</h1>
                      <span className="px-2.5 py-0.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 bg-white shadow-sm">Public</span>
                    </div>
                    <p className="text-slate-500">{repos[selectedRepoIndex].desc}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      ref={manageAccessBtnRef}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-100 shadow-sm transition-colors"
                    >
                      <Shield className="w-4 h-4" /> Manage Access
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                      <ExternalLink className="w-4 h-4" /> View on GitHub 
                    </button>
                  </div>
                </div>

                {/* Top Row Charts */}
                <div className="grid grid-cols-2 gap-6 mt-2">
                  {/* Chart 1 */}
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col h-56 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Commit Activity</h3>
                      </div>
                      <span className="text-xl font-black text-slate-900">214</span>
                    </div>
                    <div className="flex-1 flex items-end justify-between gap-3 pt-4">
                      {bars.map((bar, i) => (
                        <div key={i} className="w-full h-full flex items-end bg-slate-50 rounded-t-sm relative">
                          <motion.div 
                            initial={{ height: "0%" }}
                            animate={{ height: (flowState === 'dashboard_active' || flowState === 'access_panel_open') ? `${bar.height}%` : "0%" }}
                            transition={{ duration: 0.8, delay: bar.delay, ease: "easeOut" }}
                            className={`w-full rounded-t-sm ${bar.active ? 'bg-blue-500' : 'bg-slate-300'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chart 2 */}
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col h-56 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 z-10">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-red-500" /> Contributors</h3>
                      </div>
                      <span className="text-xl font-black text-slate-900">+4</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-32">
                      <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
                        <defs>
                          <linearGradient id="redFade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <motion.path d="M 0 20 L 60 20 L 60 50 L 130 50 L 130 80 L 200 80 L 200 100 L 0 100 Z" fill="url(#redFade)" variants={fillVariants} initial="hidden" animate={(flowState === 'dashboard_active' || flowState === 'access_panel_open') ? "visible" : "hidden"} />
                        <motion.path d="M 0 20 L 60 20 L 60 50 L 130 50 L 130 80 L 200 80" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={pathVariants} initial="hidden" animate={(flowState === 'dashboard_active' || flowState === 'access_panel_open') ? "visible" : "hidden"} />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Bottom Row Charts */}
                <div className="grid grid-cols-12 gap-6">
                  {/* Language Distribution */}
                  <div className="col-span-7 bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col h-64">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><Code className="w-4 h-4 text-green-500" /> Language Distribution</h3>
                    <div className="flex-1 flex gap-4">
                      {/* Radial */}
                      <div className="flex-[1] relative flex items-center justify-center border-r border-slate-100">
                         <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <RadialBarChart innerRadius="30%" outerRadius="100%" data={[...languageData].reverse()} startAngle={180} endAngle={-180}>
                                <RadialBar background dataKey="bytes" cornerRadius={10} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Bars */}
                      <div className="flex-[1.5] flex flex-col justify-center space-y-3 pl-2">
                        {languageData.map((entry, index) => (
                           <div key={entry.name} className="space-y-1">
                               <div className="flex justify-between text-xs">
                                   <span className="font-bold text-slate-700">{entry.name}</span>
                                   <span className="font-semibold text-slate-400">{((entry.bytes / totalBytes) * 100).toFixed(1)}%</span>
                               </div>
                               <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                   <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: (flowState === 'dashboard_active' || flowState === 'access_panel_open') ? `${(entry.bytes / totalBytes) * 100}%` : '0%' }}
                                       transition={{ duration: 1, delay: index * 0.1 }}
                                       className="h-full rounded-full"
                                       style={{ backgroundColor: entry.fill }}
                                   />
                               </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Deployments */}
                  <div className="col-span-5 bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col h-64">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><Rocket className="w-4 h-4 text-yellow-500" /> Deployments</h3>
                    <div className="space-y-2 flex-1">
                      {deployments.map(dep => (
                          <div key={dep.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                  <div className="min-w-0">
                                      <p className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-800">
                                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dep.state === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                          {dep.env}
                                      </p>
                                      <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-tighter">
                                          {dep.date} • {dep.bot}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-4 gap-4 pb-4">
                  <KpiCard icon={Star} label="Stars" value="48" color="text-yellow-500" />
                  <KpiCard icon={GitPullRequest} label="Forks" value="12" color="text-purple-500" />
                  <KpiCard icon={Activity} label="Issues" value="5" color="text-red-500" />
                  <KpiCard icon={Calendar} label="Created" value="Mar '25" color="text-blue-500" isText />
                </div>
              </motion.div>
            </div>
            
            {/* Sliding Access Control Panel */}
            <AnimatePresence>
              {flowState === 'access_panel_open' && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/40 backdrop-blur-sm z-40"
                  />
                  
                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute right-0 top-0 bottom-0 w-[400px] border-l border-slate-200 z-50 shadow-2xl bg-slate-50 flex flex-col"
                  >
                    <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" /> Access Control
                      </h3>
                      <button className="text-slate-400"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Contributor 1 */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=alex" alt="alex" className="w-10 h-10 rounded-full bg-blue-100" />
                          <div>
                            <p className="font-bold text-sm text-slate-900">alex-dev</p>
                            <p className="text-[11px] text-slate-500">142 contributions</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-slate-400" /> Write Access
                          </span>
                          <button 
                            ref={toggleBtnRef}
                            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${isToggleOn ? 'bg-blue-600' : 'bg-slate-300'}`}
                          >
                            <motion.div 
                              layout
                              animate={{ x: isToggleOn ? 20 : 0 }}
                              className="w-4 h-4 bg-white rounded-full shadow-sm"
                            />
                          </button>
                        </div>
                      </div>

                      {/* Contributor 2 */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=maya" alt="maya" className="w-10 h-10 rounded-full bg-purple-100" />
                          <div>
                            <p className="font-bold text-sm text-slate-900">maya-codes</p>
                            <p className="text-[11px] text-slate-500">89 contributions</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-slate-400" /> Write Access
                          </span>
                          <button className="w-11 h-6 rounded-full bg-blue-600 relative flex items-center px-1">
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm transform translate-x-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
