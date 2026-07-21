import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import { MousePointer2, ChevronDown, Maximize, Shield, CheckCircle2, Circle } from 'lucide-react';

const Step = ({ title, desc, active, done, delay }: { title: string; desc: string; active: boolean; done: boolean; delay: number }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay * 0.5, duration: 0.5 }}
            className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
        >
            <div className="mt-1">
                {done ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                ) : active ? (
                    <div className="relative flex h-5 w-5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <Circle className="relative inline-flex rounded-full h-4 w-4 text-teal-500 fill-teal-50" />
                    </div>
                ) : (
                    <Circle className="w-5 h-5 text-gray-200 fill-gray-50" />
                )}
            </div>
            <div>
                <h4 className={`text-sm font-bold ${active || done ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h4>
                <p className={`text-xs ${active || done ? 'text-gray-600' : 'text-gray-400'}`}>{desc}</p>
            </div>
        </motion.div>
    );
};

export const AttackPathScene = () => {
    // Left UI Mockup states
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState("Choose what ServX may inspect");
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0); // 0 to 4 for steps
    
    // Animation sequence
    const cursorControls = useAnimation();
    const containerRef = useRef<HTMLDivElement>(null);
    const splineContainerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: false, amount: 0.5 });

    const triggerSplineAnimation = () => {
        try {
            const canvas = splineContainerRef.current?.querySelector('canvas');
            if (canvas) {
                console.log('[Spline] Dispatching synthetic "q" key event to Canvas');
                const eventParams = { key: 'q', code: 'KeyQ', keyCode: 81, which: 81, bubbles: true, cancelable: true };
                canvas.dispatchEvent(new KeyboardEvent('keydown', eventParams));
                canvas.dispatchEvent(new KeyboardEvent('keyup', eventParams));
            } else {
                console.warn('[Spline] Canvas not found for synthetic event');
            }
        } catch (e) {
            console.error('[Spline] triggerSplineAnimation failed:', e);
        }
    };

    useEffect(() => {
        if (!isInView) return;

        let isCancelled = false;

        const runSequence = async () => {
            while (!isCancelled) {
                // Reset
                setDropdownOpen(false);
                setSelectedRepo("Choose what ServX may inspect");
                setScanning(false);
                setScanProgress(0);
                
                // Cursor initial position (bottom right relative)
                await cursorControls.set({ left: "80%", top: "90%", opacity: 0 });
                await new Promise(r => setTimeout(r, 1000));
                if(isCancelled) break;

                // Fade in cursor
                await cursorControls.start({ opacity: 1, transition: { duration: 0.5 } });
                
                // Move to dropdown (approx left 25%, top 40%)
                await cursorControls.start({ left: "25%", top: "40%", transition: { duration: 1.5, ease: "easeInOut" } });
                if(isCancelled) break;
                
                // Click dropdown
                await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
                setDropdownOpen(true);
                await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
                if(isCancelled) break;
                
                // Wait a bit
                await new Promise(r => setTimeout(r, 500));
                
                // Move to second repo (approx left 25%, top 58%)
                await cursorControls.start({ left: "25%", top: "58%", transition: { duration: 0.8, ease: "easeInOut" } });
                if(isCancelled) break;
                
                // Click repo
                await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
                setSelectedRepo("Servx-lab/ServX");
                setDropdownOpen(false);
                await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
                if(isCancelled) break;
                
                // Wait a bit
                await new Promise(r => setTimeout(r, 500));
                
                // Move to Queue scan button (approx left 85%, top 40%)
                await cursorControls.start({ left: "85%", top: "40%", transition: { duration: 1.5, ease: "easeInOut" } });
                if(isCancelled) break;
                
                // Click Queue scan
                await cursorControls.start({ scale: 0.8, transition: { duration: 0.1 } });
                setScanning(true);
                triggerSplineAnimation();
                await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
                if(isCancelled) break;
                
                // Move cursor out of the way
                cursorControls.start({ left: "95%", top: "80%", opacity: 0, transition: { duration: 1.5 } });
                
                // Simulate scan progress
                for (let i = 1; i <= 4; i++) {
                    await new Promise(r => setTimeout(r, 1500));
                    if(isCancelled) break;
                    setScanProgress(i);
                }
                
                await new Promise(r => setTimeout(r, 4000)); // Hold at the end
            }
        };

        runSequence();

        return () => { isCancelled = true; };
    }, [cursorControls, isInView]);

    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-10 gap-8 h-[600px] font-sans">
            {/* Left: UI Simulation (7 cols) */}
            <div 
                ref={containerRef}
                className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 overflow-hidden relative shadow-lg flex flex-col w-full h-full"
            >
                {/* Scrollable Canvas */}
                <motion.div 
                    className="absolute inset-0 w-full"
                    animate={{ y: scanning ? -320 : 0 }}
                    transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                >
                    <div className="p-8 space-y-10">
                        {/* Header */}
                        <div>
                            <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">Security Evidence Workspace</div>
                            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Attack Paths</h2>
                            <p className="text-sm text-gray-500 max-w-xl">Queue a deep scan for a connected repository. ServX keeps the job state while the isolated executor collects evidence.</p>
                        </div>

                        {/* Action Area */}
                        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                            <div className="col-span-2 relative">
                                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">Owned Repository</div>
                                
                                {/* Dropdown Box */}
                                <div className={`p-3 border rounded-lg flex justify-between items-center bg-white ${dropdownOpen ? 'border-teal-500 shadow-sm ring-1 ring-teal-500' : 'border-gray-200'}`}>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${selectedRepo === "Choose what ServX may inspect" ? "text-gray-400" : "text-gray-900"}`}>{selectedRepo}</span>
                                        {selectedRepo !== "Choose what ServX may inspect" && <span className="text-xs text-gray-500">TypeScript</span>}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Dropdown Menu */}
                                <motion.div 
                                    initial={false}
                                    animate={{ opacity: dropdownOpen ? 1 : 0, y: dropdownOpen ? 0 : -10, pointerEvents: dropdownOpen ? 'auto' : 'none' }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2 space-y-1"
                                >
                                    <div className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <div className="text-sm font-medium text-gray-900">Kryptes-Vault/Kryptes</div>
                                        <div className="text-xs text-gray-500">TypeScript</div>
                                    </div>
                                    <div className="p-2 bg-teal-50/50 rounded cursor-pointer border border-teal-100">
                                        <div className="text-sm font-medium text-gray-900">Servx-lab/ServX</div>
                                        <div className="text-xs text-gray-500">TypeScript</div>
                                    </div>
                                    <div className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <div className="text-sm font-medium text-gray-900">Servx-lab/servx-attackpaths</div>
                                        <div className="text-xs text-gray-500">TypeScript</div>
                                    </div>
                                </motion.div>
                            </div>
                            
                            <div className="col-span-1 flex flex-col justify-end items-end pb-1">
                                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2 w-full text-left">Allowance</div>
                                <div className="text-xs text-gray-500 mb-2 w-full"><span className="font-bold text-gray-900 text-sm">3</span> remaining</div>
                                <button className={`px-4 py-2 rounded-lg text-sm font-bold w-full transition-colors flex items-center justify-center ${scanning ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-teal-700 hover:bg-teal-800 text-white'}`}>
                                    <Maximize className="w-4 h-4 mr-2" />
                                    {scanning ? 'Queued' : 'Queue scan'}
                                </button>
                            </div>
                        </div>

                        {/* Spacer before results */}
                        <div className="h-12"></div>

                        {/* Findings / Ledger */}
                        <div className="border-t border-gray-100 pt-8">
                            {!scanning ? (
                                <>
                                    <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">Results Desk</div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-8">Findings</h3>
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Shield className="w-8 h-8 text-gray-300 mb-4" />
                                        <div className="text-sm font-bold text-gray-900 mb-1">No scan evidence yet</div>
                                        <div className="text-xs text-gray-500">Select an owned repository and queue one deep scan to begin collecting evidence.</div>
                                    </div>
                                </>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    transition={{ duration: 0.5, delay: 0.5 }}
                                    className="w-full flex gap-8"
                                >
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Scan Ledger</div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">Evidence in progress</h3>
                                        
                                        <div className="space-y-2">
                                            <Step 
                                                title="Queue" 
                                                desc={scanProgress > 0 ? "Scan executor assigned." : "Waiting for the scan executor to become available..."} 
                                                active={scanProgress === 0} 
                                                done={scanProgress > 0} 
                                                delay={0} 
                                            />
                                            <Step 
                                                title="Repository" 
                                                desc={scanProgress > 1 ? "Authorized source prepared." : "Preparing the authorized source..."} 
                                                active={scanProgress === 1} 
                                                done={scanProgress > 1} 
                                                delay={0} 
                                            />
                                            <Step 
                                                title="Secrets" 
                                                desc={scanProgress > 2 ? "Source and history checked." : "Checking source and history..."} 
                                                active={scanProgress === 2} 
                                                done={scanProgress > 2} 
                                                delay={0} 
                                            />
                                            <Step 
                                                title="Code" 
                                                desc={scanProgress > 3 ? "Source-security rules applied." : "Applying source-security rules..."} 
                                                active={scanProgress === 3} 
                                                done={scanProgress > 3} 
                                                delay={0} 
                                            />
                                        </div>
                                    </div>
                                    <div className="w-64 shrink-0 bg-gray-50 p-6 rounded-xl border border-gray-100 self-start">
                                        <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Current State</div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-2">
                                            {scanProgress === 0 && "Waiting for executor..."}
                                            {scanProgress === 1 && "Cloning repository..."}
                                            {scanProgress === 2 && "Scanning secrets..."}
                                            {scanProgress === 3 && "Analyzing AST..."}
                                            {scanProgress >= 4 && "Finalizing report..."}
                                        </h4>
                                        <p className="text-xs text-gray-500 mb-6">
                                            Coverage includes GitHub alerts, source secrets, Semgrep rules, Trivy dependency checks.
                                        </p>
                                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 w-full">
                                            Cancel scan
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                    </div>
                </motion.div>

                {/* The Animated Cursor */}
                <motion.div 
                    animate={cursorControls}
                    initial={{ left: "80%", top: "90%", opacity: 0 }}
                    className="absolute z-50 pointer-events-none origin-top-left"
                >
                    <MousePointer2 className="w-8 h-8 text-black fill-black" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
                </motion.div>
            </div>

            {/* Right: Spline 3D (3 cols) */}
            <div ref={splineContainerRef} className="lg:col-span-3 rounded-2xl border border-gray-200 overflow-hidden flex flex-col justify-center items-center shadow-lg h-full relative group bg-black">
                <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.02)]" />
                <div className="w-full h-full pointer-events-none">
                    <Spline scene="/3D-model/rubix-cube.splinecode" className="w-full h-full object-cover scale-[1.2]" />
                </div>
            </div>
        </div>
    );
};
