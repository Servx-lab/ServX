import React from 'react';
import { motion } from 'framer-motion';
import { 
    Cpu, 
    Shield, 
    Activity, 
    Zap, 
    Globe, 
    Server, 
    CheckCircle,
    Star,
    ArrowRight
} from 'lucide-react';
import AuthCard from '@/components/Landing/AuthCard';
import { Button } from "@/components/ui/button";

// --- Components ---

const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white fill-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    SYNTRO
                </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors">Pricing</a>
                <a href="#docs" className="text-sm text-white/70 hover:text-white transition-colors">Documentation</a>
                <Button variant="ghost" className="text-white hover:text-cyan-400 hover:bg-white/5">
                    Sign In
                </Button>
            </div>
        </div>
    </nav>
);

const Hero = () => (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-cyan-900/10 rounded-full blur-[100px] -z-10" />
        
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
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span className="text-xs font-medium text-cyan-300 tracking-wide uppercase">v2.0 is live</span>
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                        Command Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                            Infrastructure
                        </span>
                    </h1>
                    
                    <p className="text-lg text-white/60 mb-8 max-w-lg leading-relaxed">
                        Orchestrate servers, databases, and microservices with God-Mode precision. 
                        Zero-config deployment for the modern stack.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button className="h-12 px-8 bg-white text-black hover:bg-gray-200 font-semibold text-base rounded-lg transition-transform hover:scale-105">
                            Start for Free
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="h-12 px-8 border-white/20 text-white hover:bg-white/10 font-medium text-base rounded-lg backdrop-blur-sm">
                            View Documentation
                        </Button>
                    </div>

                    <div className="mt-12 flex items-center gap-4 text-sm text-white/40">
                        <div className="flex -space-x-2">
                            {[1,2,3,4].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-black flex items-center justify-center text-[10px] text-white font-bold">
                                    {String.fromCharCode(64+i)}
                                </div>
                            ))}
                        </div>
                        <p>Trusted by 4,000+ developers</p>
                    </div>
                </motion.div>

                {/* Right Column: Auth Card */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-3xl blur-2xl -z-10" />
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
            icon: <Activity className="h-6 w-6 text-red-400" />,
            colSpan: "lg:col-span-2",
            bg: "bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20"
        },
        {
            title: "Global Edge Map",
            description: "Real-time visualization of your latency across 34 regions.",
            icon: <Globe className="h-6 w-6 text-cyan-400" />,
            colSpan: "lg:col-span-1",
            bg: "bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20"
        },
        {
            title: "Security Bouncer",
            description: "AI-driven DDoS protection that learns from attack patterns.",
            icon: <Shield className="h-6 w-6 text-emerald-400" />,
            colSpan: "lg:col-span-1",
            bg: "bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20"
        },
        {
            title: "Bare Metal Access",
            description: "Direct hardware access when you need raw performance.",
            icon: <Cpu className="h-6 w-6 text-purple-400" />,
            colSpan: "lg:col-span-2",
            bg: "bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20"
        }
    ];

    return (
        <section className="py-24 bg-black/40 relative" id="features">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Under The Hood</h2>
                    <p className="text-white/50 max-w-2xl mx-auto">
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
                            <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-white/60 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Reviews = () => {
    const reviews = [
        {
            name: "Sarah Jenkins",
            role: "CTO at TechFlow",
            content: "We migrated our entire K8s cluster to Syntro in a weekend. The 'Auto-Medic' feature saved us twice already.",
            stars: 5
        },
        {
            name: "Marcus Chen",
            role: "Indie Hacker",
            content: "Finally, a platform that doesn't need a PhD to configure. It just works, and the dark mode is gorgeous.",
            stars: 5
        },
        {
            name: "Alex V.",
            role: "DevOps Lead",
            content: "The latency map is not just eye candy—it actually helped us debug a regional routing issue in minutes.",
            stars: 5
        }
    ];

    return (
        <section className="py-24 relative overflow-hidden">
             {/* Decorative Elements */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="container mx-auto px-6 relative z-10">
                <h2 className="text-3xl font-bold text-center text-white mb-16">Community Feedback</h2>
                
                <div className="grid md:grid-cols-3 gap-8">
                    {reviews.map((review, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl relative"
                        >
                            <div className="flex gap-1 mb-4">
                                {[...Array(review.stars)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                ))}
                            </div>
                            <p className="text-white/80 mb-6 italic">"{review.content}"</p>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600" />
                                <div>
                                    <h4 className="text-sm font-semibold text-white">{review.name}</h4>
                                    <p className="text-xs text-white/40">{review.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Footer = () => (
    <footer className="border-t border-white/10 bg-black pt-16 pb-8">
        <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-6 w-6 text-cyan-400" />
                        <span className="text-xl font-bold text-white">SYNTRO</span>
                    </div>
                    <p className="text-white/40 max-w-sm">
                        The next-generation infrastructure platform for builders who move fast.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-4">Product</h4>
                    <ul className="space-y-2 text-sm text-white/50">
                        <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Docs</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-4">Legal</h4>
                    <ul className="space-y-2 text-sm text-white/50">
                        <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-white/30">© 2024 Syntro Inc. All rights reserved.</p>
                <div className="flex gap-4">
                    <a href="#" className="text-white/30 hover:text-white transition-colors"><span className="sr-only">Twitter</span>𝕏</a>
                    <a href="#" className="text-white/30 hover:text-white transition-colors">GitHub</a>
                    <a href="#" className="text-white/30 hover:text-white transition-colors">Discord</a>
                </div>
            </div>
        </div>
    </footer>
);

// --- Main Page Component ---

const Landing = () => {
    return (
        <div className="min-h-screen bg-[#0B0E14] text-white selection:bg-cyan-500/30">
            <Navbar />
            <Hero />
            <Features />
            <Reviews />
            <Footer />
        </div>
    );
};

export default Landing;
