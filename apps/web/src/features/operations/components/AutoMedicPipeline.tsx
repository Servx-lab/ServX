import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Activity, ShieldAlert, Database, Cpu, Terminal, CheckCircle } from 'lucide-react';

type Phase = 'IDLE' | 'DETECTING' | 'SEARCHING' | 'DIAGNOSING' | 'EXECUTING' | 'RESOLVED';

const STEPS = [
    { 
        id: 1, 
        title: 'Telemetry Stream (Detection)', 
        idleText: 'Awaiting fault injection...', 
        activeText: '[CRITICAL] Error: ENOMEM Heap limit exceeded', 
        icon: ShieldAlert 
    },
    { 
        id: 2, 
        title: 'Vector RAG Search (Context)', 
        idleText: 'Standing by.', 
        activeText: 'Searching Pinecone for similar incidents... Found: 1 match.', 
        icon: Database 
    },
    { 
        id: 3, 
        title: 'LLM Diagnostics (Brain)', 
        idleText: 'Standing by.', 
        activeText: 'Generating JSON Action Plan: { action: "RESTART_NODE" }', 
        icon: Cpu 
    },
    { 
        id: 4, 
        title: 'Execution Engine (Router)', 
        idleText: 'Standing by.', 
        activeText: '[DRY RUN] Executing: docker restart api-v1', 
        icon: Terminal 
    },
    { 
        id: 5, 
        title: 'System Resolution (Verification)', 
        idleText: 'Standing by.', 
        activeText: 'Health checks passed. Systems nominal.', 
        icon: CheckCircle 
    },
];

const AutoMedicPipeline = () => {
    const [phase, setPhase] = useState<Phase>('IDLE');
    const timerRefs = useRef<NodeJS.Timeout[]>([]);

    useEffect(() => {
        // Auto-trigger fault simulation on component mount (when user clicks Check)
        triggerFault();

        // CRITICAL RULE: Cleanup function to prevent memory leaks if component unmounts mid-sequence
        return () => {
            timerRefs.current.forEach(clearTimeout);
        };
    }, []);

    const triggerFault = () => {
        // Clear any existing timers first
        timerRefs.current.forEach(clearTimeout);
        timerRefs.current = [];

        // T=0s
        setPhase('DETECTING');

        // T=1.5s
        const t1 = setTimeout(() => {
            setPhase('SEARCHING');
        }, 1500);

        // T=3.0s
        const t2 = setTimeout(() => {
            setPhase('DIAGNOSING');
        }, 3000);

        // T=4.5s
        const t3 = setTimeout(() => {
            setPhase('EXECUTING');
        }, 4500);

        // T=6.0s
        const t4 = setTimeout(() => {
            setPhase('RESOLVED');
        }, 6000);

        timerRefs.current.push(t1, t2, t3, t4);
    };

    const getStepState = (stepNum: number): 'idle' | 'active' | 'completed' => {
        if (phase === 'IDLE') return 'idle';
        const states = ['IDLE', 'DETECTING', 'SEARCHING', 'DIAGNOSING', 'EXECUTING', 'RESOLVED'];
        const currentIndex = states.indexOf(phase);
        
        if (stepNum < currentIndex) return 'completed';
        if (stepNum > currentIndex) return 'idle';
        
        // If stepNum === currentIndex
        if (phase === 'RESOLVED') return 'completed'; // Everything is green in RESOLVED
        return 'active';
    };

    const getCircleStyle = (state: 'idle' | 'active' | 'completed', stepId: number) => {
        if (state === 'completed') {
            if (stepId === 1) return 'bg-red-500 border-2 border-red-500 text-white shadow-sm';
            if (stepId === 2) return 'bg-purple-500 border-2 border-purple-500 text-white shadow-sm';
            if (stepId === 3) return 'bg-blue-500 border-2 border-blue-500 text-white shadow-sm';
            return 'bg-emerald-500 border-2 border-emerald-500 text-white shadow-sm';
        }
        if (state === 'active') {
            if (stepId === 1) return 'bg-white border-2 border-red-500 text-red-500 ring-[6px] ring-red-100 z-10';
            if (stepId === 2) return 'bg-white border-2 border-purple-500 text-purple-500 ring-[6px] ring-purple-100 z-10';
            if (stepId === 3) return 'bg-white border-2 border-blue-500 text-blue-500 ring-[6px] ring-blue-100 z-10';
            return 'bg-white border-2 border-emerald-500 text-emerald-500 ring-[6px] ring-emerald-100 z-10';
        }
        return 'bg-white border-2 border-gray-300 text-gray-900';
    };

    const getLineColor = (state: 'idle' | 'active' | 'completed', stepId: number) => {
        if (state !== 'completed') return 'bg-gray-200';
        if (stepId === 1) return 'bg-red-500';
        if (stepId === 2) return 'bg-purple-500';
        if (stepId === 3) return 'bg-blue-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto p-4">
            {/* Left side: Spline Placeholder */}
            <div className="w-full aspect-square bg-gray-50 rounded-3xl overflow-hidden relative flex flex-col items-center justify-center border border-gray-200">
                <span className="text-gray-400 font-mono text-sm tracking-widest uppercase opacity-50">3D Asset Space</span>
                <span className="text-gray-500 text-xs mt-2">Spline integration pending</span>
            </div>

            {/* Right side: 5-Step Pipeline UI */}
            <div className="flex flex-col gap-8">
                
                <div className="flex flex-col relative px-4">
                    {STEPS.map((step, index) => {
                        const isLast = index === STEPS.length - 1;
                        const state = getStepState(step.id);
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="relative flex group min-h-[90px]">
                                {/* Connecting Line */}
                                {!isLast && (
                                    <div 
                                        className={`absolute top-10 left-[15px] w-[2px] h-[calc(100%-10px)] transition-colors duration-500 z-0 ${getLineColor(state, step.id)}`} 
                                    />
                                )}

                                <div className="flex gap-6 w-full p-2 -ml-2 rounded-2xl group-hover:bg-gray-50/80 transition-colors cursor-default z-10">
                                    {/* Circle */}
                                    <div className="relative shrink-0 mt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${getCircleStyle(state, step.id)}`}>
                                            <Icon className="w-4 h-4" strokeWidth={state === 'completed' ? 2.5 : 2} />
                                        </div>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className={`flex flex-col pt-1 transition-opacity duration-500 ${state === 'idle' ? 'opacity-80' : 'opacity-100'}`}>
                                        <h3 className={`text-lg font-bold tracking-tight transition-colors duration-500 text-gray-900`}>
                                            {step.title}
                                        </h3>
                                        <p className={`text-sm mt-0.5 leading-relaxed font-mono ${state === 'idle' ? 'text-gray-600' : 'text-gray-500'}`}>
                                            {state === 'idle' ? step.idleText : step.activeText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AutoMedicPipeline;
