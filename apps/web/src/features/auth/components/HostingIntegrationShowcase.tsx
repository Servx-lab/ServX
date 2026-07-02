import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { motion, useAnimationControls, AnimatePresence } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import * as THREE from 'three';
import { easing } from 'maath';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { MousePointer2, ExternalLink, CheckCircle2, Activity, Server, ArrowRight, Copy, Triangle, Cloud, Zap, RefreshCw, LogOut, Settings, Box, HeartPulse, Shield, Plus, X, Search, ChevronDown, Check, MoreHorizontal } from 'lucide-react';

const mockDeploymentsData = [
  { name: 'Jun 23', deployments: 4 },
  { name: 'Jun 24', deployments: 8 },
  { name: 'Jun 25', deployments: 12 },
  { name: 'Jun 26', deployments: 5 },
  { name: 'Jun 27', deployments: 9 },
  { name: 'Jun 28', deployments: 14 },
  { name: 'Jun 29', deployments: 16 },
];

const mockServiceStatusData = [
  { name: 'READY', count: 16 }
];

type FlowState = 'idle' | 'clicking_render' | 'step_1' | 'clicking_open' | 'render_mock_enter' | 'render_mock_scroll' | 'render_mock_click_create' | 'render_mock_modal_name' | 'render_mock_typing' | 'render_mock_click_submit' | 'render_mock_modal_key' | 'render_mock_copy' | 'render_mock_done' | 'step_2' | 'typing_key' | 'clicking_connect' | 'connected' | 'connected_scroll';

const SplineScene = ({ flowState }: { flowState: FlowState }) => {
  const isConnected = flowState === 'connected' || flowState === 'connected_scroll';
  const splineRef = useRef<any>(null);
  const hasShatteredRef = useRef(false);
  const hasReassembledRef = useRef(false);

  // Block ALL manual 'a' key presses so the user cannot control the cube
  useEffect(() => {
    const blockManualA = (e: KeyboardEvent) => {
      // Allow synthetic events to pass through
      if (!e.isTrusted) return;
      
      if ((e.key === 'a' || e.key === 'A')) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockManualA, true);
    document.addEventListener('keydown', blockManualA, true);
    return () => {
      window.removeEventListener('keydown', blockManualA, true);
      document.removeEventListener('keydown', blockManualA, true);
    };
  }, []);

  const triggerCanvasEvent = () => {
    try {
      // Spline attaches its listeners directly to the canvas element
      const canvas = document.querySelector('canvas');
      if (canvas) {
        console.log('[Spline] Dispatching synthetic KeyboardEvent to Canvas');
        const eventParams = { key: 'a', code: 'KeyA', keyCode: 65, which: 65, bubbles: true, cancelable: true };
        canvas.dispatchEvent(new KeyboardEvent('keydown', eventParams));
        canvas.dispatchEvent(new KeyboardEvent('keyup', eventParams));
      } else {
        console.warn('[Spline] Canvas not found for synthetic event');
      }
    } catch (e) {
      console.error('[Spline] triggerCanvasEvent failed:', e);
    }
  };

  const onLoad = (splineApp: any) => {
    splineRef.current = splineApp;
    
    // Attempt to programmatically force the Spline scene background to black/transparent
    // as a fallback in case it isn't set in the editor.
    try {
      if (splineApp._scene) splineApp._scene.background = null;
      if (typeof splineApp.setBackgroundColor === 'function') splineApp.setBackgroundColor('#000000');
    } catch (e) {}

    // Hidden behind opacity: 0 for 2s.
    // Delay 1000ms ensures Spline's internal physics/state engine is fully initialized
    setTimeout(() => {
      triggerCanvasEvent();
      hasShatteredRef.current = true;
      console.log('[Spline] Initial shatter triggered');
    }, 1000);
  };

  useEffect(() => {
    // When API Key connects, trigger the synthetic event AGAIN to reassemble.
    if (isConnected && splineRef.current && hasShatteredRef.current && !hasReassembledRef.current) {
      hasReassembledRef.current = true;
      setTimeout(() => {
        triggerCanvasEvent();
        console.log('[Spline] Reassemble triggered');
      }, 300);
    } else if (!isConnected && splineRef.current && hasReassembledRef.current) {
      // When the cycle resets (isConnected becomes false), shatter it again.
      hasReassembledRef.current = false;
      setTimeout(() => {
        triggerCanvasEvent();
        console.log('[Spline] Shatter triggered (cycle reset)');
      }, 300);
    }
  }, [isConnected]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2, duration: 1 }}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <Spline
          scene="/3D-model/shattered-cube.splinecode"
          onLoad={onLoad}
        />
      </motion.div>
  );
};

export const HostingIntegrationShowcase = () => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [apiKey, setApiKey] = useState("");
  const [apiName, setApiName] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const cursorControls = useAnimationControls();
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ServX UI Refs
  const renderSidebarRef = useRef<HTMLDivElement>(null);
  const openCredsRef = useRef<HTMLButtonElement>(null);
  const pasteInputRef = useRef<HTMLInputElement>(null);
  const connectRef = useRef<HTMLButtonElement>(null);

  // Render Mock Refs
  const createApiKeyBtnRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const copyIconRef = useRef<HTMLButtonElement>(null);
  const doneBtnRef = useRef<HTMLButtonElement>(null);

  const getCoords = (target: React.RefObject<HTMLElement>, offset = { x: 0, y: 0 }) => {
    if (!target.current || !containerRef.current) return { top: "50%", left: "50%" };
    const parentRect = containerRef.current.getBoundingClientRect();
    const rect = target.current.getBoundingClientRect();
    return {
      left: `${rect.left - parentRect.left + (rect.width / 2) + offset.x}px`,
      top: `${rect.top - parentRect.top + (rect.height / 2) + offset.y}px`,
    };
  };

  const hasStarted = useRef(false);
  const isPausedRef = useRef(true);

  useEffect(() => {
    let abortController = new AbortController();

    const sleep = (ms: number, signal: AbortSignal) => 
      new Promise<void>((resolve, reject) => {
        if (signal.aborted) return reject(new Error('aborted'));
        
        let remaining = ms;
        let lastTick = performance.now();
        let frameId: number;

        const tick = (now: number) => {
          if (signal.aborted) {
            cancelAnimationFrame(frameId);
            return reject(new Error('aborted'));
          }

          const delta = now - lastTick;
          lastTick = now;

          if (!isPausedRef.current) {
            remaining -= delta;
          }

          if (remaining <= 0) {
            resolve();
          } else {
            frameId = requestAnimationFrame(tick);
          }
        };
        frameId = requestAnimationFrame(tick);

        signal.addEventListener('abort', () => {
          cancelAnimationFrame(frameId);
          reject(new Error('aborted'));
        });
      });

    const moveCursor = async (targetRef: React.RefObject<HTMLElement>, duration: number, signal: AbortSignal, offset = { x: 0, y: 0 }) => {
      if (signal.aborted) throw new Error('aborted');
      
      // Wait if paused before starting movement
      while (isPausedRef.current && !signal.aborted) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (signal.aborted) throw new Error('aborted');
      
      await cursorControls.start({ ...getCoords(targetRef, offset), transition: { duration, ease: "easeInOut" } });
      if (signal.aborted) throw new Error('aborted');
      
      // Wait if paused before clicking
      while (isPausedRef.current && !signal.aborted) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (signal.aborted) throw new Error('aborted');
      
      await cursorControls.start({ scale: [1, 0.8, 1], transition: { duration: 0.2 } });
      if (signal.aborted) throw new Error('aborted');
    };

    const runAnimationSequence = async (signal: AbortSignal) => {
      try {
        cursorControls.set({ opacity: 0, top: "80%", left: "80%", scale: 1 });
        setApiKey("");
        setApiName("");
        setIsCopied(false);
        setFlowState('step_1');
        
        await sleep(800, signal);
        
        // Open creds
        cursorControls.set({ opacity: 1 }); // ensure visible
        await moveCursor(openCredsRef, 1, signal);
        setFlowState('clicking_open');
        
        await sleep(1000, signal);
        setFlowState('render_mock_enter');
        cursorControls.set({ top: "50%", left: "70%" });
        
        await sleep(500, signal);
        setFlowState('render_mock_scroll');
        
        await sleep(1200, signal);
        setFlowState('render_mock_click_create');
        await moveCursor(createApiKeyBtnRef, 1, signal);
        setFlowState('render_mock_modal_name');
        
        await sleep(500, signal);
        await moveCursor(nameInputRef, 0.6, signal);
        setFlowState('render_mock_typing');
        
        const keyName = "ServX";
        for (let i = 1; i <= keyName.length; i++) {
          await sleep(100, signal);
          setApiName(keyName.slice(0, i));
        }
        
        await sleep(300, signal);
        await moveCursor(submitBtnRef, 0.8, signal);
        setFlowState('render_mock_click_submit');
        
        await sleep(300, signal);
        setFlowState('render_mock_modal_key');
        
        await sleep(500, signal);
        await moveCursor(copyIconRef, 0.8, signal);
        setFlowState('render_mock_copy');
        setIsCopied(true);
        
        await sleep(800, signal);
        await moveCursor(doneBtnRef, 0.6, signal);
        setFlowState('render_mock_done');
        
        await sleep(500, signal);
        setFlowState('step_2');
        cursorControls.set({ top: "50%", left: "70%" });
        
        await sleep(800, signal);
        await moveCursor(pasteInputRef, 0.8, signal, { x: 50, y: 0 });
        setFlowState('typing_key');
        
        const key = "rnd_zeHvwutQCDoNRl4U4kBXHUiq9rLj";
        setApiKey(key);
        
        await sleep(600, signal);
        await moveCursor(connectRef, 0.8, signal);
        setFlowState('clicking_connect');
        
        await sleep(500, signal);
        setFlowState('connected');
        
        await sleep(2000, signal);
        setFlowState('connected_scroll');
        
        await sleep(8000, signal);
        setFlowState('idle');
        
        await sleep(1000, signal);
        // loop
        if (!signal.aborted) runAnimationSequence(signal);

      } catch (e) {
        // Aborted gracefully
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          isPausedRef.current = false;
          if (!hasStarted.current) {
            hasStarted.current = true;
            abortController = new AbortController();
            runAnimationSequence(abortController.signal);
          }
        } else {
          isPausedRef.current = true;
        }
      },
      { threshold: 0.3 }
    );
    
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      abortController.abort();
    };
  }, [cursorControls]);

  const viewState = 
    (flowState.startsWith('render_mock')) ? 'render' :
    (flowState === 'idle' || flowState === 'clicking_render' || flowState === 'step_1' || flowState === 'clicking_open') ? 1 : 
    (flowState === 'step_2' || flowState === 'typing_key' || flowState === 'clicking_connect') ? 2 : 3;

  return (
    <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full h-[750px] relative overflow-hidden">
      
      <motion.div
        animate={cursorControls}
        initial={{ opacity: 0, top: "80%", left: "80%" }}
        className="absolute z-50 pointer-events-none drop-shadow-2xl"
        style={{ originX: 0, originY: 0 }}
      >
        <MousePointer2 className="w-8 h-8 text-black fill-white -rotate-12" />
      </motion.div>

      {/* Left Column: UI Panel (Takes up 2 columns) */}
      <div className="col-span-1 lg:col-span-2 flex h-full relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
        
        <AnimatePresence mode="wait">
          {viewState === 'render' && (
            <motion.div 
              key="renderMock"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-40 bg-[#0e0e11] text-white flex overflow-hidden font-sans"
            >
              {/* Render Main Content */}
              <div className="flex-grow flex flex-col relative overflow-hidden bg-[#0e0e11]">
                <div className="h-14 border-b border-[#262633] flex items-center justify-between px-6 shrink-0 bg-[#0e0e11] z-20">
                  <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                    <Settings className="w-4 h-4" /> Account settings
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a24] rounded border border-[#262633] text-xs text-gray-400"><Search className="w-3 h-3" /> Search <span className="px-1 py-0.5 bg-[#262633] rounded text-[10px]">K</span></div>
                    <button className="px-3 py-1.5 border border-[#262633] rounded text-xs text-white flex items-center gap-1 hover:bg-[#1a1a24]"><Plus className="w-3 h-3" /> New</button>
                  </div>
                </div>
                
                <div className="flex-grow flex relative">
                  <motion.div 
                    animate={{ y: ['render_mock_scroll', 'render_mock_click_create', 'render_mock_modal_name', 'render_mock_typing', 'render_mock_click_submit', 'render_mock_modal_key', 'render_mock_copy', 'render_mock_done'].includes(flowState) ? -350 : 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="flex-grow p-8 pr-64 h-[1200px]"
                  >
                    <h1 className="text-3xl font-semibold mb-8 text-white">Account settings</h1>
                    
                    <div className="border border-[#262633] rounded-lg p-6 mb-8 bg-[#13131a]">
                      <h3 className="text-lg font-semibold mb-6">Profile</h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-sm font-semibold text-gray-300">Full Name</div>
                          <div className="col-span-2">
                            <div className="px-4 py-2 bg-[#1a1a24] border border-[#3f3f4e] rounded text-sm text-gray-300">Chitkul Lakshya</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-sm font-semibold text-gray-300">Email</div>
                          <div className="col-span-2">
                            <div className="px-4 py-2 bg-[#1a1a24] border border-[#3f3f4e] rounded text-sm text-gray-300">chitkullakshya@gmail.com</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-[#262633] rounded-lg p-6 mb-8 bg-[#13131a]">
                      <h3 className="text-lg font-semibold mb-6">Appearance</h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-sm font-semibold text-gray-300">Dashboard Theme</div>
                          <div className="col-span-2">
                            <div className="px-4 py-2 bg-[#1a1a24] border border-[#3f3f4e] rounded text-sm text-gray-300 flex justify-between items-center">
                              System (Default) <ChevronDown className="w-4 h-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-[#262633] mb-8">
                      <div className="p-6 pb-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white">API Keys</h3>
                          <button ref={createApiKeyBtnRef} className={`px-3 py-1.5 text-xs text-gray-300 border border-[#3f3f4e] rounded flex items-center gap-1 transition-colors ${flowState === 'render_mock_click_create' ? 'bg-[#262633]' : 'hover:bg-[#262633]'}`}>
                            <Plus className="w-3 h-3" /> Create API Key
                          </button>
                        </div>
                        <p className="text-sm text-gray-400 mt-2 mb-8">Authenticate your requests to the Render API. <span className="text-[#6366f1] cursor-pointer hover:underline">Learn more.</span></p>
                        
                        <table className="w-full text-left text-sm text-gray-400">
                          <thead className="text-[10px] font-bold tracking-wider border-b border-[#262633]">
                            <tr>
                              <th className="pb-3 font-semibold uppercase flex items-center gap-2">Name <span className="bg-[#262633] text-gray-300 px-1.5 rounded">1</span></th>
                              <th className="pb-3 font-semibold uppercase">Key</th>
                              <th className="pb-3 font-semibold uppercase">Created</th>
                              <th className="pb-3 font-semibold uppercase flex items-center gap-1">Last Used <ChevronDown className="w-3 h-3" /></th>
                              <th className="pb-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-[#262633]">
                              <td className="py-4 font-medium text-gray-200">production-api-key</td>
                              <td className="py-4 font-mono text-gray-200">rnd_9Er7UR...</td>
                              <td className="py-4 text-gray-300">2mo</td>
                              <td className="py-4 text-gray-300">45min</td>
                              <td className="py-4 text-right"><MoreHorizontal className="w-4 h-4 text-gray-500 inline-block cursor-pointer hover:text-gray-300" /></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border border-[#262633]">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-white">SSH Public Keys</h3>
                          <button className="px-3 py-1.5 text-xs text-gray-300 border border-[#3f3f4e] rounded flex items-center gap-1 transition-colors hover:bg-[#262633]">
                            <Plus className="w-3 h-3" /> Add SSH Public Key
                          </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-8">Connect to your services remotely by authorizing SSH keys for your account.</p>
                        <p className="text-sm text-gray-200">No authorized SSH keys.</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Right Page Navigation */}
                  <div className="w-48 pt-8 absolute right-0 top-14 h-full border-l border-[#262633] bg-[#0e0e11] px-4 hidden md:block z-30">
                    <div className="flex flex-col gap-3 text-sm font-medium text-gray-400">
                      <div className="hover:text-white cursor-pointer">Profile</div>
                      <div className="hover:text-white cursor-pointer">Appearance</div>
                      <div className="hover:text-white cursor-pointer">Account Security</div>
                      <div className="hover:text-white cursor-pointer">CLI Tokens</div>
                      <div className="text-white border-l-2 border-[#6366f1] -ml-4 pl-4 cursor-pointer">API Keys</div>
                      <div className="hover:text-white cursor-pointer">SSH Public Keys</div>
                    </div>
                  </div>
                </div>

                {/* Render Modal Overlay */}
                <AnimatePresence>
                  {['render_mock_modal_name', 'render_mock_typing', 'render_mock_click_submit', 'render_mock_modal_key', 'render_mock_copy', 'render_mock_done'].includes(flowState) && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-[2px]"
                    >
                      <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        className="w-[500px] bg-[#1a1a24] border border-[#3f3f4e] rounded-lg shadow-2xl flex flex-col"
                      >
                        <div className="flex items-center justify-between p-5 border-b border-[#262633]">
                          <h2 className="text-xl font-bold text-white">Create API Key</h2>
                          <X className="w-5 h-5 text-gray-500 cursor-pointer hover:text-white" />
                        </div>
                        
                        <div className="flex items-center gap-6 px-6 py-4 border-b border-[#262633]">
                          <div className={`flex items-center gap-2 text-sm font-semibold ${['render_mock_modal_name', 'render_mock_typing', 'render_mock_click_submit'].includes(flowState) ? 'text-white' : 'text-gray-500'}`}>
                            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                              {['render_mock_modal_key', 'render_mock_copy', 'render_mock_done'].includes(flowState) && <div className="w-2 h-2 bg-current rounded-full" />}
                            </div> Choose Name
                          </div>
                          <div className={`flex items-center gap-2 text-sm font-semibold ${['render_mock_modal_key', 'render_mock_copy', 'render_mock_done'].includes(flowState) ? 'text-white' : 'text-gray-500'}`}>
                            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                              <div className={`w-2 h-2 ${['render_mock_modal_key', 'render_mock_copy', 'render_mock_done'].includes(flowState) ? 'bg-[#6366f1]' : 'bg-transparent'} rounded-full`} />
                            </div> Copy API Key
                          </div>
                        </div>

                        {['render_mock_modal_name', 'render_mock_typing', 'render_mock_click_submit'].includes(flowState) ? (
                          <div className="p-6">
                            <p className="text-sm text-gray-400 mb-4">Give your API key a unique name, like <span className="font-mono text-gray-300 bg-[#262633] px-1 rounded">agent</span> or <span className="font-mono text-gray-300 bg-[#262633] px-1 rounded">laptop</span>. Optional</p>
                            <input 
                              ref={nameInputRef}
                              type="text" 
                              value={apiName}
                              readOnly
                              placeholder="Name" 
                              className="w-full px-3 py-2 bg-[#13131a] border border-[#6366f1] rounded text-sm text-white outline-none shadow-[0_0_0_1px_rgba(99,102,241,0.5)]"
                            />
                            <div className="mt-8 flex items-center justify-between">
                              <button className="px-4 py-2 text-sm font-semibold text-gray-400 border border-[#3f3f4e] rounded hover:bg-[#262633]">Close</button>
                              <button ref={submitBtnRef} className={`px-4 py-2 bg-white text-black text-sm font-bold rounded ${flowState === 'render_mock_click_submit' ? 'bg-gray-200' : 'hover:bg-gray-200'}`}>Create API Key</button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6">
                            <p className="text-sm text-gray-400 mb-4">Please copy the key now and store it with the rest of your application secrets. This is the only time it will be displayed in full.</p>
                            <div className="relative">
                              <input 
                                type="text" 
                                value="rnd_zeHvwutQCDoNRl4U4kBXHUiq9rLj"
                                readOnly
                                className="w-full pl-3 pr-10 py-2 bg-[#262633] border border-[#3f3f4e] rounded text-sm font-mono text-gray-300 outline-none"
                              />
                              <button ref={copyIconRef} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors ${flowState === 'render_mock_copy' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                            <div className="mt-8 flex justify-end">
                              <button ref={doneBtnRef} className={`px-4 py-2 border border-[#3f3f4e] text-white text-sm font-bold rounded ${flowState === 'render_mock_done' ? 'bg-[#262633]' : 'hover:bg-[#262633]'}`}>Done</button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {viewState !== 'render' && (
            <>
              {/* Main Content Area */}
              <div className="flex-grow relative overflow-hidden bg-white">
                <motion.div 
                  className="p-8 flex flex-col min-h-full"
                  animate={{ y: flowState === 'connected_scroll' ? -600 : 0 }}
                  transition={{ duration: flowState === 'connected_scroll' ? 6 : 0, ease: "linear" }}
                >
                  <div className="mb-8 flex-shrink-0">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hosting Integration</h1>
                    <p className="text-slate-500 text-sm mt-1">Connect your cloud hosting providers to manage deployments.</p>
                  </div>

                <AnimatePresence mode="wait">
                  {viewState === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="flex-grow flex flex-col"
                    >
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 text-slate-800 flex items-center justify-center rounded-lg border border-slate-200">
                            <Server className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">Connect Render Account</h3>
                            <p className="text-xs text-slate-500">Step-by-step connection wizard</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <div className="px-3 py-1.5 bg-blue-600 text-white rounded-full">1 Get Credentials</div>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                          <div className="px-3 py-1.5 text-slate-400">2 Enter API Key</div>
                        </div>
                      </div>

                      <div className="flex-grow">
                        <p className="text-xs font-bold text-blue-600 tracking-wider mb-2 uppercase">Step 1 of 2</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">How to generate your Render credentials</h2>
                        <p className="text-sm text-slate-500 mb-8">Follow these steps to create API Keys from the Render Dashboard settings.</p>

                        <div className="flex items-center gap-4 mb-8">
                          <button ref={openCredsRef} className={`px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors shadow-sm ${flowState === 'clicking_open' ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                            Open Render Security Credentials <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          {[
                            { num: 1, title: 'Open Account Settings', desc: 'Sign in to Render and navigate to Account Settings > API Keys.' },
                            { num: 2, title: 'Create API Key', desc: 'Click the "+ Create API Key" button and choose a memorable name.' },
                            { num: 3, title: 'Copy Credentials', desc: 'Copy the generated key. Paste it in the next step.' }
                          ].map(item => (
                            <div key={item.num} className="flex gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                              <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">{item.num}</div>
                              <div>
                                <h4 className="font-semibold text-slate-800 text-sm mb-1">{item.title}</h4>
                                <p className="text-xs text-slate-500">{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {viewState === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="flex-grow flex flex-col"
                    >
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 text-slate-800 flex items-center justify-center rounded-lg border border-slate-200">
                            <Server className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">Connect Render Account</h3>
                            <p className="text-xs text-slate-500">Step-by-step connection wizard</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <div className="px-3 py-1.5 text-slate-400">1 Get Credentials</div>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                          <div className="px-3 py-1.5 bg-blue-600 text-white rounded-full">2 Enter API Key</div>
                        </div>
                      </div>

                      <div className="flex-grow">
                        <p className="text-xs font-bold text-blue-600 tracking-wider mb-2 uppercase">Step 2 of 2</p>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Paste Credentials & Connect</h2>
                        <p className="text-sm text-slate-500 mb-8">Enter the generated token below to establish a secure, AES-256 encrypted link with your Render account.</p>

                        <div className="space-y-6">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">RENDER API KEY</label>
                            <div className="relative">
                              <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                ref={pasteInputRef}
                                type="text" 
                                value={apiKey}
                                readOnly
                                placeholder="rnd_..." 
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-blue-500 ring-4 ring-transparent focus:ring-blue-50 transition-all shadow-sm font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex items-center justify-between">
                        <button className="px-6 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors">
                          &larr; Back
                        </button>
                        <button ref={connectRef} className={`flex-grow sm:flex-grow-0 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-md shadow-blue-200 transition-all ${flowState === 'clicking_connect' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}>
                          Connect Account
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {viewState === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex-grow flex flex-col pb-20 pt-4"
                    >
                      <div className="w-[117.64%] origin-top-left scale-[0.85] flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-50 text-slate-800 flex items-center justify-center rounded-xl border border-slate-200">
                            <Server className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-2xl font-bold text-slate-900">Render</h2>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Connected</span>
                            </div>
                            <p className="text-sm text-slate-500">acme-workspace</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-600 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Sync Now</button>
                          <button className="px-3 py-1.5 border border-red-200 bg-red-50 rounded text-xs font-semibold text-red-600 flex items-center gap-1"><LogOut className="w-3 h-3" /> Disconnect</button>
                          <button className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-600 flex items-center gap-1"><Settings className="w-3 h-3" /> API Settings</button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        {[
                          { icon: Box, label: 'Active Services', val: '13', color: 'text-blue-500' },
                          { icon: Zap, label: 'Total Deploys', val: '15', color: 'text-yellow-500' },
                          { icon: HeartPulse, label: 'Healthy Nodes', val: '28', color: 'text-green-500' },
                          { icon: Shield, label: 'Uptime Score', val: '100%', color: 'text-purple-500' }
                        ].map((stat, i) => (
                          <div key={i} className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-white shadow-sm">
                            <div className="flex items-center gap-1 mb-2">
                              <stat.icon className={`w-4 h-4 ${stat.color}`} />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                            </div>
                            <span className="text-2xl font-black text-slate-900">{stat.val}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-6 flex-shrink-0 mb-6">
                        <div className="col-span-1 border border-slate-200 rounded-xl p-4 flex flex-col">
                          <h4 className="text-xs font-bold text-slate-700 mb-4">Deployments Over Time</h4>
                          <div className="flex-grow w-full -ml-4 h-32">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={mockDeploymentsData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={5} />
                                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area type="monotone" dataKey="deployments" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.1} fill="#3b82f6" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        <div className="col-span-1 border border-slate-200 rounded-xl p-4 flex flex-col">
                          <h4 className="text-xs font-bold text-slate-700 mb-4">Service Status</h4>
                          <div className="flex-grow w-full h-32">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={mockServiceStatusData} barSize={60}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={5} />
                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="col-span-1 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center relative h-full">
                          <h4 className="text-xs font-bold text-slate-700 absolute top-4 left-4">Health Overview</h4>
                          <div className="w-24 h-24 mt-4 rounded-full border-[10px] border-green-400 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-slate-900 leading-none">28</span>
                          </div>
                        </div>
                      </div>

                      {/* NEW MOCK CONTENT FOR SCROLLING */}
                      <div className="grid grid-cols-3 gap-6 flex-shrink-0">
                        <div className="col-span-2 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col">
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Box className="w-4 h-4 text-blue-600" />
                              <h3 className="font-bold text-slate-800 text-sm">Services / Projects</h3>
                            </div>
                            <span className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">Show all &rarr;</span>
                          </div>
                          <div className="p-0">
                            <table className="w-full text-left text-sm text-slate-600">
                              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                                <tr>
                                  <th className="px-4 py-3">Service Name</th>
                                  <th className="px-4 py-3">Type</th>
                                  <th className="px-4 py-3">Last Updated</th>
                                  <th className="px-4 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {['Payments API', 'Frontend Client', 'Auth Service', 'Worker Node'].map((svc, i) => (
                                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="px-4 py-3 font-semibold text-slate-800">{svc}</td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">Web_service</td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">2d ago</td>
                                    <td className="px-4 py-3 flex items-center gap-2">
                                      <span className="px-2 py-0.5 border border-blue-200 text-blue-700 text-[10px] font-bold rounded flex items-center gap-1"><Box className="w-3 h-3" /> Env</span>
                                      <span className="px-2 py-0.5 border border-slate-200 text-slate-500 text-[10px] font-bold rounded">suspended</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="col-span-1 border border-red-100 rounded-xl bg-red-50/30 flex flex-col items-center justify-center p-6 text-center shadow-sm">
                           <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                             <Activity className="w-8 h-8" />
                           </div>
                           <h3 className="font-black text-slate-800 mb-2">ALL SYSTEMS NOMINAL</h3>
                           <p className="text-xs text-slate-500">No historical critical incidents detected across connected providers.</p>
                        </div>
                      </div>

                      <div className="mt-6 border border-slate-200 rounded-xl bg-white shadow-sm p-4 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <h3 className="font-bold text-slate-800 text-sm">Recent Deployments</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                          {[
                            { name: 'Frontend Client', msg: 'Merge pull request #142 from core/ui', time: '2m ago', status: 'sync' },
                            { name: 'Auth Service', msg: 'fix(auth): resolve JWT token expiry bug', time: '15m ago', status: 'success' },
                            { name: 'Payment Gateway', msg: 'feat: implement Stripe webhooks', time: '1h ago', status: 'success' },
                            { name: 'Worker Node', msg: 'chore: update node dependencies', time: '3h ago', status: 'success' },
                            { name: 'GraphQL API', msg: 'perf: resolve N+1 query in users resolver', time: '5h ago', status: 'success' },
                            { name: 'Redis Cache Layer', msg: 'fix: connection pool timeout', time: '1d ago', status: 'success' },
                            { name: 'Admin Dashboard', msg: 'Merge branch "main" into production', time: '2d ago', status: 'success' },
                            { name: 'Email Service', msg: 'feat: add welcome email templates', time: '3d ago', status: 'success' }
                          ].map((dep, i) => (
                             <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                               <span className="font-semibold text-slate-800 text-sm w-40 truncate">{dep.name}</span>
                               <span className="text-xs text-slate-500 flex items-center gap-2 font-mono flex-grow px-4 truncate">
                                 {dep.status === 'sync' ? <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-green-500" />}
                                 {dep.msg}
                               </span>
                               <span className="text-xs text-slate-400 w-16 text-right shrink-0">{dep.time}</span>
                             </div>
                          ))}
                        </div>
                      </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>

        {/* Right Column: 3D R3F Canvas */}
        <div className="col-span-1 flex items-center justify-center h-full">
          <div className="w-full h-[500px] bg-black relative rounded-2xl overflow-hidden shadow-2xl">
            <SplineScene flowState={flowState} />
          </div>
        </div>
      </div>
  );
};

const ProviderItem = ({ icon: Icon, name, color = "text-slate-700" }: { icon: any, name: string, color?: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
    <Icon className={`w-5 h-5 ${color}`} />
    <span className="font-medium text-sm text-slate-600">{name}</span>
  </div>
);

const KeyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
  </svg>
);
