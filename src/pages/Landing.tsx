import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Cpu, 
    Shield, 
    Activity, 
    Zap, 
    Globe, 
    ArrowRight,
    Check,
    Server,
    Database,
    Cloud,
    LayoutDashboard,
    Settings,
    ChevronRight,
    Star
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';

// --- Components ---

const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-orizons-void/80 backdrop-blur-md border-b border-orizons-border-inactive">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-br from-orizons-teal to-orizons-purple rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white fill-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-black/60">
                    ORIZONS
                </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
                <a href="#how-it-works" className="text-sm text-orizons-text-low hover:text-black transition-colors">Features</a>
                <a href="#docs" className="text-sm text-orizons-text-low hover:text-black transition-colors">Documentation</a>
                <Link to="/auth">
                    <Button variant="ghost" className="text-black hover:text-orizons-teal hover:bg-black/5">
                        Sign In
                    </Button>
                </Link>
            </div>
        </div>
    </nav>
);

const HeroDemo = () => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-4xl mx-auto mt-20"
        >
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-orizons-teal/20 via-orizons-purple/20 to-orizons-mint/10 rounded-full blur-[100px] -z-10" />

            {/* The App Window */}
            <div className="relative rounded-3xl border border-orizons-border-inactive bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden aspect-video flex">
                
                {/* Mock Sidebar */}
                <div className="w-64 border-r border-orizons-border-inactive bg-black/20 p-6 hidden md:flex flex-col gap-6">
                    <div className="flex items-center gap-3 text-orizons-text-low mb-4">
                        <LayoutDashboard className="w-5 h-5 text-orizons-teal" />
                        <span className="font-medium text-sm">Overview</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="text-xs font-bold text-orizons-text-low/50 uppercase tracking-wider mb-2">Infrastructure</div>
                        <div className="flex items-center gap-3 text-orizons-text-low hover:text-white cursor-pointer transition-colors p-2 rounded-lg hover:bg-white/5">
                            <Server className="w-4 h-4 text-orizons-purple" />
                            <span className="text-sm">Servers</span>
                        </div>
                        <div className="flex items-center gap-3 text-white bg-white/10 p-2 rounded-lg">
                            <Database className="w-4 h-4 text-orizons-mint" />
                            <span className="text-sm">Databases</span>
                            <div className="ml-auto w-2 h-2 rounded-full bg-orizons-mint animate-pulse" />
                        </div>
                        <div className="flex items-center gap-3 text-orizons-text-low hover:text-white cursor-pointer transition-colors p-2 rounded-lg hover:bg-white/5">
                            <Cloud className="w-4 h-4 text-orizons-teal" />
                            <span className="text-sm">Edge Network</span>
                        </div>
                    </div>
                </div>

                {/* Mock Main Area */}
                <div className="flex-1 p-8 flex flex-col gap-6">
                    {/* Header bar */}
                    <div className="flex justify-between items-center bg-black/30 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orizons-purple to-orizons-teal flex items-center justify-center text-white text-xs font-bold">
                                DB
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white">Production Cluster</div>
                                <div className="text-xs text-orizons-mint flex items-center gap-1">
                                    <Activity className="w-3 h-3" /> Healthy
                                </div>
                            </div>
                        </div>
                        <Button size="sm" className="bg-orizons-text-high text-orizons-void hover:bg-gray-200 h-8 text-xs rounded-lg">
                            Manage
                        </Button>
                    </div>

                    {/* Content List */}
                    <div className="flex flex-col gap-3">
                        {[
                            { name: "Users DB Snapshot", status: "Completed", time: "2m ago", color: "text-orizons-teal" },
                            { name: "Scale Replica Set", status: "In Progress", time: "Just now", color: "text-orizons-purple", active: true },
                            { name: "Security Audit", status: "Scheduled", time: "In 2 hours", color: "text-orizons-text-low" },
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + (i * 0.1) }}
                                className={`flex items-center justify-between p-4 rounded-xl border ${item.active ? 'bg-white/10 border-orizons-purple/50' : 'bg-black/20 border-white/5'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-orizons-purple animate-pulse' : 'bg-orizons-text-low/30'}`} />
                                    <span className={`text-sm ${item.active ? 'text-white' : 'text-orizons-text-low'}`}>{item.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xs ${item.color}`}>{item.status}</span>
                                    <span className="text-xs text-orizons-text-low/50">{item.time}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Floating elements for aesthetic */}
                    <motion.div 
                        animate={{ y: [0, -10, 0] }} 
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -right-12 top-20 bg-black/60 backdrop-blur-xl border border-orizons-teal/30 p-3 rounded-2xl shadow-xl flex items-center gap-3"
                    >
                        <div className="w-8 h-8 rounded-full bg-orizons-teal/20 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-orizons-teal" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white">Deploy Success</div>
                            <div className="text-[10px] text-orizons-text-low">0ms downtime</div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

const Hero = () => (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-24 overflow-hidden flex flex-col items-center text-center">
        <div className="container mx-auto px-6 relative z-10">
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-3xl mx-auto flex flex-col items-center"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orizons-mint opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orizons-teal"></span>
                    </span>
                    <span className="text-xs font-medium text-orizons-mint tracking-wide uppercase">v2.0 is live</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-black leading-[1.1] mb-6">
                    Your infrastructure,<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orizons-teal via-orizons-mint to-orizons-purple">
                        simplified
                    </span>
                </h1>
                
                <p className="text-lg text-orizons-text-low mb-10 max-w-xl leading-relaxed">
                    Create, manage, and conquer your deployments with ease. 
                    Zero-config infrastructure for the modern web stack.
                </p>

                <div className="flex flex-col items-center gap-4">
                    <Link to="/auth">
                        <Button className="h-12 px-8 bg-orizons-text-high text-orizons-void hover:bg-gray-200 font-semibold text-base rounded-full transition-transform hover:scale-105 shadow-[0_0_40px_rgba(45,212,191,0.3)]">
                            Get started for free
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <span className="text-xs text-orizons-text-low/60 uppercase tracking-wider font-medium">Free forever. No credit card required.</span>
                </div>
            </motion.div>

            <HeroDemo />

            {/* Trusted By Section */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mt-24 flex flex-col items-center gap-4"
            >
                <span className="text-sm font-medium text-orizons-text-low uppercase tracking-wider">
                    Trusted by over <strong className="text-black font-bold">50,000</strong> developers
                </span>
                <div className="flex -space-x-3">
                    {[
                        "bg-gradient-to-tr from-pink-500 to-orange-400",
                        "bg-gradient-to-tr from-blue-500 to-cyan-400",
                        "bg-gradient-to-tr from-green-500 to-emerald-400",
                        "bg-gradient-to-tr from-purple-500 to-indigo-400",
                        "bg-gradient-to-tr from-yellow-500 to-red-400"
                    ].map((bg, i) => (
                        <div key={i} className={`w-10 h-10 rounded-full border-2 border-orizons-void ${bg} shadow-sm`} />
                    ))}
                </div>
            </motion.div>
        </div>
    </section>
);

const HowItWorks = () => {
    const steps = [
        {
            num: "1",
            title: "Connect",
            desc: "Link your GitHub repository or docker image in one click.",
            mockup: (
                <div className="relative w-full h-32 bg-black/40 rounded-xl border border-white/5 p-4 overflow-hidden flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </div>
                </div>
            )
        },
        {
            num: "2",
            title: "Configure",
            desc: "Set environment variables and customize deployment rules.",
            mockup: (
                <div className="relative w-full h-32 bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col gap-2 justify-center">
                    <div className="h-2 w-1/3 bg-white/20 rounded-full" />
                    <div className="h-8 w-full bg-white/5 border border-white/10 rounded-lg flex items-center px-3">
                        <div className="h-2 w-1/2 bg-orizons-teal/50 rounded-full" />
                    </div>
                    <div className="h-8 w-full bg-white/5 border border-white/10 rounded-lg flex items-center px-3">
                        <div className="h-2 w-3/4 bg-orizons-purple/50 rounded-full" />
                    </div>
                </div>
            )
        },
        {
            num: "3",
            title: "Deploy",
            desc: "Push to main and watch the magic happen automatically.",
            mockup: (
                <div className="relative w-full h-32 bg-black/40 rounded-xl border border-white/5 p-4 flex items-center justify-center flex-col gap-3">
                    <div className="w-10 h-10 rounded-full bg-orizons-mint/20 border border-orizons-mint/50 flex items-center justify-center">
                        <Check className="w-5 h-5 text-orizons-mint" />
                    </div>
                    <div className="h-2 w-20 bg-white/30 rounded-full" />
                </div>
            )
        }
    ];

    return (
        <section className="py-24 bg-orizons-void relative" id="how-it-works">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <span className="text-xs font-bold tracking-widest text-orizons-text-low uppercase mb-4 block">How it works</span>
                    <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">Three simple steps to<br />organized bliss</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.15 }}
                            className="relative flex flex-col items-center"
                        >
                            <div className="w-8 h-8 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-sm font-bold text-black mb-4 z-10">
                                {step.num}
                            </div>
                            
                            <div className="w-full bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow group">
                                {step.mockup}
                                <h3 className="text-xl font-bold text-black mt-6 mb-2 group-hover:text-orizons-teal transition-colors">{step.title}</h3>
                                <p className="text-sm text-orizons-text-low leading-relaxed">{step.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};



const Footer = () => (
    <footer className="bg-orizons-void pt-16 pb-8">
        <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-6 w-6 bg-gradient-to-br from-orizons-teal to-orizons-purple rounded flex items-center justify-center">
                            <Zap className="h-3 w-3 text-white fill-white" />
                        </div>
                        <span className="text-xl font-bold text-black">ORIZONS</span>
                    </div>
                    <p className="text-orizons-text-low max-w-sm text-sm">
                        Create, manage, and conquer your deployments with ease.
                    </p>
                </div>
                <div>
                    <h4 className="text-black font-semibold mb-4">Product</h4>
                    <ul className="space-y-2 text-sm text-orizons-text-low/70">
                        <li><a href="#how-it-works" className="hover:text-black transition-colors">Features</a></li>
                        <li><a href="#" className="hover:text-black transition-colors">Changelog</a></li>
                        <li><a href="#" className="hover:text-black transition-colors">Docs</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-black font-semibold mb-4">Legal</h4>
                    <ul className="space-y-2 text-sm text-orizons-text-low/70">
                        <li><a href="#" className="hover:text-black transition-colors">Privacy</a></li>
                        <li><a href="#" className="hover:text-black transition-colors">Terms</a></li>
                        <li><a href="#" className="hover:text-black transition-colors">Security</a></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-black/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-orizons-text-low/50">© 2026 Orizons Inc. All rights reserved.</p>
                <div className="flex gap-4">
                    <a href="#" className="text-orizons-text-low/50 hover:text-black transition-colors"><span className="sr-only">Twitter</span>𝕏</a>
                    <a href="#" className="text-orizons-text-low/50 hover:text-black transition-colors">GitHub</a>
                    <a href="#" className="text-orizons-text-low/50 hover:text-black transition-colors">Discord</a>
                </div>
            </div>
        </div>
    </footer>
);

// --- Main Page Component ---

const Landing = () => {
    return (
        <div className="min-h-screen bg-[#FDFDFD] text-orizons-text-high selection:bg-orizons-teal/30 selection:text-black font-sans">
            <Navbar />
            <main>
                <Hero />
                <HowItWorks />
            </main>
            <Footer />
        </div>
    );
};

export default Landing;
