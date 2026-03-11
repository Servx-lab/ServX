import React from 'react';
import { motion } from 'framer-motion';
import { 
    Cpu, 
    Shield, 
    Activity, 
    Zap, 
    Globe, 
    ArrowRight
} from 'lucide-react';
import AuthCard from '@/components/Landing/AuthCard';
import { Button } from "@/components/ui/button";

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
                <a href="#features" className="text-sm text-orizons-text-low hover:text-black transition-colors">Features</a>
                <a href="#pricing" className="text-sm text-orizons-text-low hover:text-black transition-colors">Pricing</a>
                <a href="#docs" className="text-sm text-orizons-text-low hover:text-black transition-colors">Documentation</a>
                <Button variant="ghost" className="text-black hover:text-orizons-teal hover:bg-black/5">
                    Sign In
                </Button>
            </div>
        </div>
    </nav>
);

const Hero = () => (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-orizons-purple/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-orizons-teal/10 rounded-full blur-[100px] -z-10" />
        
        <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                
                {/* Left Column: Copy */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orizons-mint opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orizons-teal"></span>
                        </span>
                        <span className="text-xs font-medium text-orizons-mint tracking-wide uppercase">v2.0 is live</span>
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-black leading-[1.1] mb-6">
                        Command Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orizons-teal via-orizons-mint to-orizons-purple">
                            Infrastructure
                        </span>
                    </h1>
                    
                    <p className="text-lg text-orizons-text-low mb-8 max-w-lg leading-relaxed">
                        Orchestrate servers, databases, and microservices with God-Mode precision. 
                        Zero-config deployment for the modern stack.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button className="h-12 px-8 bg-orizons-text-high text-orizons-void hover:bg-gray-200 font-semibold text-base rounded-lg transition-transform hover:scale-105">
                            Start for Free
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="h-12 px-8 border-orizons-border-inactive text-orizons-text-high hover:bg-white/10 font-medium text-base rounded-lg backdrop-blur-sm">
                            View Documentation
                        </Button>
                    </div>
                </motion.div>

                {/* Right Column: Auth Card */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-orizons-teal/20 to-orizons-purple/20 rounded-3xl blur-2xl -z-10" />
                    <AuthCard />
                </motion.div>
            </div>
        </div>
    </section>
);

const Features = () => {
    const features = [
        {
            title: "Auto-Medic System",
            description: "Self-healing infrastructure that detects crash loops and automatically redeploys healthy instances.",
            icon: <Activity className="h-6 w-6 text-orizons-purple" />,
            colSpan: "lg:col-span-2",
            bg: "bg-gradient-to-br from-orizons-purple/10 to-transparent border-orizons-purple/20"
        },
        {
            title: "Global Edge Map",
            description: "Real-time visualization of your latency across 34 regions.",
            icon: <Globe className="h-6 w-6 text-orizons-teal" />,
            colSpan: "lg:col-span-1",
            bg: "bg-gradient-to-br from-orizons-teal/10 to-transparent border-orizons-teal/20"
        },
        {
            title: "Security Bouncer",
            description: "AI-driven DDoS protection that learns from attack patterns.",
            icon: <Shield className="h-6 w-6 text-orizons-mint" />,
            colSpan: "lg:col-span-1",
            bg: "bg-gradient-to-br from-orizons-mint/10 to-transparent border-orizons-mint/20"
        },
        {
            title: "Bare Metal Access",
            description: "Direct hardware access when you need raw performance.",
            icon: <Cpu className="h-6 w-6 text-orizons-purple" />, // Keeping purple as secondary
            colSpan: "lg:col-span-2",
            bg: "bg-gradient-to-br from-orizons-purple/10 to-transparent border-orizons-purple/20"
        }
    ];

    return (
        <section className="py-24 bg-orizons-void relative" id="features">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-orizons-text-high mb-4">Under The Hood</h2>
                    <p className="text-orizons-text-low max-w-2xl mx-auto">
                        Built for scale, designed for speed. Our architecture handles the heavy lifting so you don't have to.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-8 rounded-3xl border backdrop-blur-sm hover:bg-white/5 transition-colors group ${feature.colSpan} ${feature.bg}`}
                        >
                            <div className="h-12 w-12 rounded-xl bg-orizons-card border border-orizons-border-inactive flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-black mb-3">{feature.title}</h3>
                            <p className="text-orizons-text-low leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Footer = () => (
    <footer className="border-t border-orizons-border-inactive bg-orizons-void pt-16 pb-8">
        <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-6 w-6 text-orizons-teal" />
                        <span className="text-xl font-bold text-black">ORIZONS</span>
                    </div>
                    <p className="text-orizons-text-low max-w-sm">
                        The next-generation infrastructure platform for builders who move fast.
                    </p>
                </div>
                <div>
                    <h4 className="text-black font-semibold mb-4">Product</h4>
                    <ul className="space-y-2 text-sm text-orizons-text-low/70">
                        <li><a href="#" className="hover:text-black transition-colors">Features</a></li>
                        <li><a href="#" className="hover:text-black transition-colors">Pricing</a></li>
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
            <div className="border-t border-orizons-border-inactive pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
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
        <div className="min-h-screen bg-orizons-void text-orizons-text-high selection:bg-orizons-teal/30 selection:text-black">
            <Navbar />
            <Hero />
            <Features />
            <Footer />
        </div>
    );
};

export default Landing;
