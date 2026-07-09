import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Monitor, ShieldCheck, Lock, CheckCircle2, User } from 'lucide-react';

export const HowItWorksAnimation = () => {
    // Total animation loop duration
    const LOOP_DURATION = 6; 

    return (
        <div className="mt-8 w-full pr-8 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-8 h-px bg-slate-200" />
                    How it works
                    <span className="w-8 h-px bg-slate-200" />
                </h4>
            </div>
            
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-start mt-8" style={{ gap: '111px' }}>
                
                {/* 1. LAPTOP MOCKUP (Left) */}
                <div 
                    className="relative bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200 flex flex-col overflow-hidden shrink-0"
                    style={{ width: '601px', height: '366px' }}
                >
                    {/* Browser Header */}
                    <div className="h-6 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-1.5 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                    </div>
                    
                    <div className="relative flex-1 bg-slate-50 overflow-hidden flex items-center justify-center">
                        
                        {/* Laptop State A: Login Form */}
                        <motion.div 
                            className="absolute inset-0 flex flex-col items-center justify-center px-6"
                            animate={{ opacity: [1, 1, 0, 0, 0, 1] }}
                            transition={{ duration: LOOP_DURATION, times: [0, 0.14, 0.16, 0.85, 0.95, 1], repeat: Infinity, ease: "linear" }}
                        >
                            <div className="w-8 h-8 rounded-md bg-blue-600 mb-4 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                            <div className="w-full h-6 rounded bg-white border border-slate-200 mb-2 flex items-center px-2">
                                <div className="w-3/4 h-2 rounded bg-slate-200" />
                            </div>
                            <div className="w-full h-6 rounded bg-white border border-slate-200 mb-4 flex items-center px-2">
                                <div className="w-1/2 h-2 rounded bg-slate-200" />
                            </div>
                            <div className="w-full h-7 rounded bg-slate-900 flex items-center justify-center">
                                <div className="w-12 h-2 rounded bg-slate-500" />
                            </div>
                        </motion.div>

                        {/* Laptop State B: Waiting Spinner */}
                        <motion.div 
                            className="absolute inset-0 flex flex-col items-center justify-center"
                            animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
                            transition={{ duration: LOOP_DURATION, times: [0, 0.16, 0.18, 0.40, 0.42, 1], repeat: Infinity, ease: "linear" }}
                        >
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full mb-3"
                            />
                            <div className="w-24 h-2 rounded bg-slate-300 mb-1" />
                            <div className="w-16 h-2 rounded bg-slate-200" />
                        </motion.div>

                        {/* Laptop State C: Dashboard / Unlocked */}
                        <motion.div 
                            className="absolute inset-0 flex flex-col"
                            animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
                            transition={{ duration: LOOP_DURATION, times: [0, 0.40, 0.42, 0.45, 0.85, 1], repeat: Infinity, ease: "linear" }}
                        >
                            <div className="h-10 border-b border-slate-200 flex items-center px-4 justify-between bg-white">
                                <div className="w-16 h-3 rounded bg-slate-200" />
                                <div className="flex gap-2">
                                    <div className="w-4 h-4 rounded-full bg-slate-200" />
                                    <div className="w-4 h-4 rounded-full bg-slate-200" />
                                </div>
                            </div>
                            <div className="flex-1 p-4 flex gap-4 bg-slate-50">
                                <div className="w-1/3 h-full bg-white rounded border border-slate-200" />
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="w-full h-1/2 bg-white rounded border border-slate-200" />
                                    <div className="w-full flex-1 bg-white rounded border border-slate-200" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Simulated Laptop Mouse Cursor */}
                        <motion.div 
                            className="absolute z-50 pointer-events-none left-1/2 top-1/2"
                            animate={{ 
                                x: [120, 0, 0, 120], 
                                y: [120, 60, 60, 120], 
                                scale: [1, 1, 0.8, 1], // Click effect at 15%
                                opacity: [0, 1, 1, 0] 
                            }}
                            transition={{ 
                                duration: LOOP_DURATION, 
                                times: [0, 0.12, 0.15, 0.25], 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                            }}
                            style={{ filter: 'drop-shadow(0px 3px 3px rgba(0,0,0,0.3))' }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.5 3L18.5 10.5L12 13.5L15 21L11.5 22.5L8.5 15L4 18.5V3Z" fill="black" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                            </svg>
                        </motion.div>

                    </div>
                </div>


                {/* 2. MOBILE MOCKUP (Right) */}
                <div 
                    className="relative bg-slate-900 rounded-[32px] shadow-2xl border-[8px] border-slate-800 flex flex-col overflow-hidden shrink-0 hidden md:flex"
                    style={{ 
                        width: '248px', 
                        height: '481px',
                        transform: 'translate(-41px, -106px)'
                    }}
                >
                    
                    {/* Dynamic Island / Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-b-xl z-20" />

                    {/* Mobile Screen Content */}
                    <div className="relative flex-1 bg-slate-900 overflow-hidden">
                        
                        {/* Mobile Background (Wallpaper) */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 opacity-50" />
                        <div className="absolute top-10 w-full flex justify-center">
                            <div className="w-16 h-2 rounded-full bg-slate-700/50" />
                        </div>

                        {/* Approval Drawer Notification sliding up */}
                        <motion.div 
                            className="absolute bottom-0 left-0 w-full bg-white rounded-t-2xl p-4 flex flex-col shadow-2xl"
                            initial={{ y: 200 }}
                            animate={{ y: [200, 200, 0, 0, 200, 200] }}
                            transition={{ duration: LOOP_DURATION, times: [0, 0.17, 0.22, 0.55, 0.60, 1], repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-3 mx-auto">
                                <ShieldCheck className="w-4 h-4 text-blue-600" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 text-center mb-2">Login Request</h4>
                            
                            <div className="bg-slate-50 rounded-lg border border-slate-100 p-2.5 mb-4 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Monitor className="w-3.5 h-3.5 text-slate-400" />
                                    <div className="w-16 h-1.5 rounded bg-slate-300" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <div className="w-12 h-1.5 rounded bg-slate-300" />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1 h-8 rounded bg-slate-100 border border-slate-200" />
                                
                                {/* Approve Button (Changes color on click) */}
                                <motion.div 
                                    className="flex-1 h-8 rounded flex items-center justify-center relative overflow-hidden"
                                    animate={{ backgroundColor: ["#2563eb", "#2563eb", "#16a34a", "#16a34a"] }}
                                    transition={{ duration: LOOP_DURATION, times: [0, 0.38, 0.40, 1], repeat: Infinity, ease: "linear" }}
                                >
                                    <motion.div
                                        animate={{ opacity: [1, 1, 0, 0] }}
                                        transition={{ duration: LOOP_DURATION, times: [0, 0.38, 0.40, 1], repeat: Infinity, ease: "linear" }}
                                    >
                                        <div className="w-8 h-1.5 rounded bg-blue-200" />
                                    </motion.div>
                                    <motion.div
                                        className="absolute inset-0 flex items-center justify-center"
                                        animate={{ opacity: [0, 0, 1, 1] }}
                                        transition={{ duration: LOOP_DURATION, times: [0, 0.38, 0.40, 1], repeat: Infinity, ease: "linear" }}
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </motion.div>
                                </motion.div>
                            </div>
                        </motion.div>
                        
                        {/* Simulated Thumb Tap (Pulse effect) */}
                        <motion.div 
                            className="absolute z-50 mix-blend-screen"
                            animate={{ opacity: [0, 0, 1, 0, 0], scale: [0.5, 0.5, 1.5, 0.5, 0.5] }}
                            transition={{ duration: LOOP_DURATION, times: [0, 0.37, 0.39, 0.42, 1], repeat: Infinity, ease: "easeOut" }}
                            style={{ 
                                bottom: '2px', 
                                right: '38px',
                                width: '60px', 
                                height: '60px',
                                backgroundColor: 'rgba(255,255,255,0.4)',
                                borderRadius: '50%',
                                filter: 'blur(4px)'
                            }}
                        />

                    </div>
                </div>

            </div>
        </div>
    );
};
