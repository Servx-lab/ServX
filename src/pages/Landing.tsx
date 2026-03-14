import React from 'react';
import { 
    Zap, 
    Shield, 
    Activity, 
    Terminal, 
    Key, 
    GitPullRequest, 
    Lock,
    Cpu,
    Server,
    CheckCircle2,
    AlertTriangle,
    Github,
    Mail,
    Cloud
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-[#181C25]">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-br from-[#00C2CB] to-[#6C63FF] rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white fill-white" />
                </div>
                <span className="text-xl font-bold text-white tracking-wider">
                    ORIZON
                </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm font-medium text-[#A4ADB3]">Core Modules</a>
                <a href="#security" className="text-sm font-medium text-[#A4ADB3]">Security</a>
                <a href="#docs" className="text-sm font-medium text-[#A4ADB3]">Documentation</a>
            </div>
        </div>
    </nav>
);

const StaticAuth = () => (
    <div className="w-full max-w-sm mx-auto bg-[#181C25]/80 backdrop-blur-xl border border-[#00C2CB] rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Access Grid</h2>
            <p className="text-sm text-[#A4ADB3]">Authenticate to establish secure connection.</p>
        </div>
        
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A4ADB3] uppercase tracking-wider">Identity Locator (Email)</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[#A4ADB3]" />
                    <input 
                        type="email" 
                        placeholder="admin@orizon.dev" 
                        className="w-full pl-9 pr-4 py-2 bg-[#0B0E14] border border-[#181C25] text-white placeholder:text-[#A4ADB3]/50 focus:border-[#00C2CB] focus:outline-none rounded-lg text-sm"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A4ADB3] uppercase tracking-wider">Encryption Key (Password)</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-[#A4ADB3]" />
                    <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full pl-9 pr-4 py-2 bg-[#0B0E14] border border-[#181C25] text-white placeholder:text-[#A4ADB3]/50 focus:border-[#00C2CB] focus:outline-none rounded-lg text-sm"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" className="w-4 h-4 rounded border-[#181C25] bg-[#0B0E14] checked:bg-[#00C2CB]" />
                <span className="text-xs text-[#A4ADB3]">Establish persistent session</span>
            </div>
            <button className="w-full bg-[#00C2CB] text-[#0B0E14] font-bold py-3 rounded-lg mt-4 text-sm uppercase tracking-wider">
                Initialize Connection
            </button>
        </div>
        
        <div className="mt-6 border-t border-[#181C25] pt-6 flex flex-col gap-3">
            <button className="w-full bg-[#181C25] border border-[#181C25] text-[#A4ADB3] py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
                <Github className="w-4 h-4 text-white" />
                Authenticate via GitHub
            </button>
        </div>
    </div>
);

const Hero = () => (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden px-6">
        <div className="container mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                {/* Left Column: The Gate */}
                <div className="relative z-10 w-full flex justify-center lg:justify-start">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00C2CB]/10 rounded-full blur-[120px] -z-10" />
                    <StaticAuth />
                </div>

                {/* Right Column: The Hook */}
                <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#181C25]/80 border border-[#00C2CB]/30 mb-8 backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-[#00C2CB]" />
                        <span className="text-xs font-bold text-[#FFFFFF] tracking-widest uppercase">100% Open Source Command Center</span>
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-[#FFFFFF] leading-[1.1] mb-6">
                        Your Infrastructure,<br />
                        <span className="text-[#00C2CB]">Mastered.</span>
                    </h1>
                    
                    <p className="text-lg text-[#A4ADB3] mb-10 max-w-xl leading-relaxed">
                        A God-Mode DevOps, CI/CD, and Security dashboard. Total visibility. Complete control. Zero compromises.
                    </p>
                </div>
            </div>
        </div>
    </section>
);

const FloatingUI = () => (
    <section className="relative py-24 overflow-hidden border-y border-[#181C25] bg-[#0B0E14]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00C2CB]/10 md:from-[#00C2CB]/15 to-[#0B0E14] pointer-events-none" />
        
        <div className="container mx-auto px-6 relative h-[600px] flex items-center justify-center">
            
            {/* Center: Auto-Medic */}
            <div className="absolute z-30 w-full max-w-2xl bg-[#181C25]/90 backdrop-blur-xl border border-[#181C25] rounded-xl shadow-2xl p-6">
                <div className="flex items-center justify-between border-b border-[#0B0E14] pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-[#6C63FF]" />
                        <span className="font-bold text-white text-sm tracking-wider uppercase">Auto-Medic Pipeline</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#00C2CB] rounded-full" />
                        <span className="text-xs text-[#A4ADB3] font-mono">SYSTEM_NOMINAL</span>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#0B0E14] rounded-lg border border-[#181C25]">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 text-[#6C63FF]" />
                            <span className="text-sm font-mono text-[#A4ADB3]">ERR_OOM_PRODUCTION_API - Memory Limit Exceeded</span>
                        </div>
                        <span className="px-2 py-1 bg-[#181C25] text-[#00C2CB] text-xs font-bold rounded border border-[#00C2CB]/20">RESOLVED</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#0B0E14] rounded-lg border border-[#181C25]">
                        <div className="flex items-center gap-3">
                            <Terminal className="w-4 h-4 text-[#A4ADB3]" />
                            <span className="text-sm font-mono text-white">RESTART_CLUSTER (eu-west-1)</span>
                        </div>
                        <span className="text-xs text-[#A4ADB3] font-mono">1.2ms</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#0B0E14]">
                        <Cpu className="w-4 h-4 text-[#A4ADB3]" />
                        <div className="flex-1 h-1.5 bg-[#0B0E14] rounded-full overflow-hidden">
                            <div className="w-[34%] h-full bg-[#00C2CB]" />
                        </div>
                        <span className="text-xs text-[#A4ADB3] font-mono">34% LOAD</span>
                    </div>
                </div>
            </div>

            {/* Left/Back: Security War Room */}
            <div className="absolute z-20 left-4 lg:left-24 top-12 w-80 bg-[#181C25]/60 backdrop-blur-sm border border-[#181C25] rounded-xl p-5 shadow-xl hidden sm:block">
                <div className="flex items-center gap-2 mb-4 border-b border-[#0B0E14] pb-3">
                    <Shield className="w-4 h-4 text-[#6C63FF]" />
                    <span className="font-bold text-white text-xs tracking-wider uppercase">Security War Room</span>
                </div>
                <div className="space-y-2">
                    <div className="text-xs text-[#A4ADB3] font-mono flex justify-between">
                        <span>ATTACK_VECTOR</span>
                        <span className="text-[#6C63FF]">BLOCKED</span>
                    </div>
                    <div className="h-1 bg-[#0B0E14] rounded-full mb-3">
                        <div className="h-full bg-[#6C63FF] w-[88%]" />
                    </div>
                    <div className="text-xs text-[#A4ADB3] font-mono flex justify-between">
                        <span>RATE_LIMITER</span>
                        <span className="text-[#00C2CB]">ACTIVE</span>
                    </div>
                     <div className="h-1 bg-[#0B0E14] rounded-full">
                        <div className="h-full bg-[#00C2CB] w-[100%]" />
                    </div>
                </div>
            </div>

            {/* Right/Back: Remote Tasks */}
            <div className="absolute z-20 right-4 lg:right-24 bottom-12 w-80 bg-[#181C25]/60 backdrop-blur-sm border border-[#181C25] rounded-xl p-5 shadow-xl hidden sm:block">
                <div className="flex items-center gap-2 mb-4 border-b border-[#0B0E14] pb-3">
                    <Terminal className="w-4 h-4 text-[#00C2CB]" />
                    <span className="font-bold text-white text-xs tracking-wider uppercase">Remote Tasks</span>
                </div>
                <div className="font-mono text-xs text-[#A4ADB3] space-y-1">
                    <div><span className="text-[#00C2CB]">$</span> orizon deploy --production</div>
                    <div>[+] Initializing cluster...</div>
                    <div>[+] Validating environment...</div>
                    <div className="text-[#00C2CB] font-bold">[✓] Deployment successful</div>
                </div>
            </div>

        </div>
    </section>
);

const BentoGrid = () => (
    <section className="py-24 container mx-auto px-6">
        <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-wider">Three Steps to Total Control</h2>
            <p className="text-[#A4ADB3] max-w-xl">A unified workflow designed for engineers. Remove friction, maintain security, and automate resolution.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Card 1: Connect */}
            <div className="bg-[#181C25] rounded-2xl p-8 border border-[#181C25] flex flex-col min-h-[400px]">
                <h3 className="text-xl font-bold text-white mb-2">1. Connect</h3>
                <p className="text-sm text-[#A4ADB3] mb-8">Establish secure keys in the Connection Vault.</p>
                <div className="flex-1 bg-[#0B0E14] rounded-xl border border-[#181C25] p-5 flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00C2CB]/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3 bg-[#181C25] p-3 rounded-lg border border-[#181C25] shadow-md relative z-10">
                        <Key className="w-5 h-5 text-[#00C2CB]" />
                        <div>
                            <div className="text-xs font-bold text-white">Vercel API Key</div>
                            <div className="text-[10px] text-[#A4ADB3] font-mono">vrc_***92X8</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#181C25] p-3 rounded-lg border border-[#181C25] shadow-md relative z-10">
                        <Server className="w-5 h-5 text-[#6C63FF]" />
                        <div>
                            <div className="text-xs font-bold text-white">Render Instance URL</div>
                            <div className="text-[10px] text-[#A4ADB3] font-mono">api-***.onrender.com</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Monitor & Attack */}
            <div className="bg-[#181C25] rounded-2xl p-8 border border-[#181C25] flex flex-col min-h-[400px]">
                <h3 className="text-xl font-bold text-white mb-2">2. Monitor & Defend</h3>
                <p className="text-sm text-[#A4ADB3] mb-8">Attack Path radar and rate limiter active.</p>
                <div className="flex-1 bg-[#0B0E14] rounded-xl border border-[#181C25] p-5 flex items-center justify-center relative overflow-hidden">
                     {/* Radar static graphic */}
                     <div className="absolute w-64 h-64 border border-[#6C63FF]/10 rounded-full flex items-center justify-center">
                         <div className="w-48 h-48 border border-[#6C63FF]/20 rounded-full flex items-center justify-center">
                             <div className="w-32 h-32 border border-[#6C63FF]/30 rounded-full shadow-[inset_0_0_20px_rgba(108,99,255,0.1)] flex items-center justify-center">
                                <Shield className="w-8 h-8 text-[#6C63FF] z-10 drop-shadow-[0_0_15px_rgba(108,99,255,1)]" />
                             </div>
                         </div>
                     </div>
                     {/* Static Blips */}
                     <div className="absolute top-1/4 left-1/4 w-2.5 h-2.5 bg-[#6C63FF] rounded-full shadow-[0_0_15px_#6C63FF]" />
                     <div className="absolute bottom-1/3 right-1/4 w-2.5 h-2.5 bg-[#00C2CB] rounded-full shadow-[0_0_15px_#00C2CB]" />
                </div>
            </div>

            {/* Card 3: Auto-Heal */}
            <div className="bg-[#181C25] rounded-2xl p-8 border border-[#181C25] flex flex-col min-h-[400px]">
                <h3 className="text-xl font-bold text-white mb-2">3. Auto-Heal</h3>
                <p className="text-sm text-[#A4ADB3] mb-8">AI-generated fixes submitted as PRs instantly.</p>
                <div className="flex-1 bg-[#0B0E14] rounded-xl border border-[#181C25] p-5 flex flex-col justify-center">
                    <div className="bg-[#181C25] border border-[#00C2CB]/30 rounded-lg p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00C2CB]" />
                        <div className="flex items-center gap-2 mb-3">
                            <GitPullRequest className="w-4 h-4 text-[#00C2CB]" />
                            <span className="text-xs font-bold text-white bg-[#0B0E14] px-2 py-0.5 rounded border border-[#181C25] uppercase">PR #442</span>
                        </div>
                        <div className="text-[11px] font-mono text-[#A4ADB3] leading-relaxed">fix: handle unhandled promise rejection in auth middleware</div>
                        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-[#00C2CB] uppercase font-bold tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Auto-merged by Medic
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const FeatureDeepDives = () => (
    <section className="py-32 border-t border-[#181C25] overflow-hidden bg-[#0B0E14]">
        <div className="container mx-auto px-6 space-y-32">
            
            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="w-12 h-12 bg-[#181C25] border border-[#6C63FF]/30 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                        <Lock className="w-6 h-6 text-[#6C63FF]" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Granular Access Control</h3>
                    <p className="text-lg text-[#A4ADB3] leading-relaxed">
                        Total command over your repository's security posture. Administrators can lock out GitHub contributors instantly, revoke external access tokens, and sandbox high-risk environments with a single immutable policy update.
                    </p>
                </div>
                {/* Mockup */}
                <div className="bg-[#181C25] rounded-2xl border border-[#181C25] p-6 shadow-2xl relative">
                    <div className="absolute inset-0 bg-[#6C63FF]/5 rounded-2xl pointer-events-none" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center justify-between border-b border-[#0B0E14] pb-3">
                            <span className="text-xs text-[#A4ADB3] font-bold uppercase tracking-wider">Active Contributors</span>
                            <span className="text-xs text-[#6C63FF] bg-[#6C63FF]/10 font-bold px-2 py-1 rounded">2/25 Blocked</span>
                        </div>
                        <div className="flex items-center justify-between bg-[#0B0E14] p-3 rounded-lg border border-[#181C25]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-[#181C25] flex items-center justify-center text-[10px] font-bold text-[#A4ADB3]">DEV</div>
                                <div>
                                    <div className="text-sm text-white font-medium">backend_contractor</div>
                                    <div className="text-[10px] text-[#A4ADB3] font-mono mt-0.5">ID: usr_892x</div>
                                </div>
                            </div>
                            <div className="bg-[#6C63FF] text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider cursor-default">
                                Lock Access
                            </div>
                        </div>
                         <div className="flex items-center justify-between bg-[#0B0E14] p-3 rounded-lg border border-[#6C63FF]/30">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-[#181C25] flex items-center justify-center text-[10px] font-bold text-[#A4ADB3]">EXT</div>
                                <div>
                                    <div className="text-sm text-[#A4ADB3] font-medium line-through">frontend_intern</div>
                                    <div className="text-[10px] text-[#6C63FF] font-mono mt-0.5">ACCESS_REVOKED</div>
                                </div>
                            </div>
                            <div className="border border-[#181C25] text-[#A4ADB3] text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-wider opacity-50">
                                Locked
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                 {/* Mockup */}
                 <div className="bg-[#181C25] rounded-2xl border border-[#181C25] p-6 shadow-2xl relative lg:order-1 order-2">
                    <div className="absolute inset-0 bg-[#00C2CB]/5 rounded-2xl pointer-events-none" />
                    <div className="flex flex-col h-full relative z-10">
                        <div className="flex gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-[#333A4A]" />
                            <div className="w-3 h-3 rounded-full bg-[#333A4A]" />
                            <div className="w-3 h-3 rounded-full bg-[#333A4A]" />
                        </div>
                        <div className="flex-1 bg-[#0B0E14] rounded-xl border border-[#181C25] p-5 flex flex-col gap-3 font-mono text-xs">
                            <div className="text-[#A4ADB3]"><span className="text-[#00C2CB] mr-2">→</span>Connecting to Vercel API...</div>
                            <div className="text-[#A4ADB3]"><span className="text-[#00C2CB] mr-2">→</span>Authenticated as <span className="text-white">orizon-system</span></div>
                            <div className="text-[#A4ADB3]"><span className="text-[#00C2CB] mr-2">→</span>Fetching latest build hash...</div>
                            <div className="text-[#00C2CB] bg-[#181C25] p-3 rounded mt-2 border-l-2 border-[#00C2CB] font-bold">BUILD SUCCESS: e9f8a2c deployed globally</div>
                        </div>
                    </div>
                </div>

                <div className="lg:order-2 order-1">
                    <div className="w-12 h-12 bg-[#181C25] border border-[#00C2CB]/30 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                        <Cloud className="w-6 h-6 text-[#00C2CB]" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Zero-Friction Deployments</h3>
                    <p className="text-lg text-[#A4ADB3] leading-relaxed">
                        Natively integrated with Vercel and Render. Establish an immutable pipeline that links runtime telemetry directly with deployment triggers. Bypass generic dashboards and deploy through Orizon's high-speed routing.
                    </p>
                </div>
            </div>

        </div>
    </section>
);

const Footer = () => (
    <footer className="bg-[#0B0E14] py-12 border-t border-[#181C25]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-gradient-to-br from-[#00C2CB] to-[#6C63FF] rounded flex items-center justify-center text-[10px] font-bold text-white">
                    O
                </div>
                <span className="text-sm font-bold text-white tracking-widest">ORIZON</span>
            </div>
            <p className="text-xs text-[#A4ADB3] font-mono">100% OPEN SOURCE INFRASTRUCTURE COMMAND</p>
            <div className="flex gap-4">
                <a href="#" className="text-[#A4ADB3] hover:text-white"><Github className="w-5 h-5" /></a>
            </div>
        </div>
    </footer>
);

// --- Main Page Component ---
const Landing = () => {
    return (
        <div className="min-h-screen bg-[#0B0E14] text-white selection:bg-[#00C2CB]/30 font-sans">
            <Navbar />
            <main>
                <Hero />
                <FloatingUI />
                <BentoGrid />
                <FeatureDeepDives />
            </main>
            <Footer />
        </div>
    );
};

export default Landing;
