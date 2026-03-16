import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    Eye,
    EyeOff,
    Cloud
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ServXLogo from "@/components/ServXLogo";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center">
                <ServXLogo showTagline={false} size="sm" className="items-start" />
            </div>
            <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Core Modules</a>
                <a href="#security" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Security</a>
                <a href="#docs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Documentation</a>
                <Link to="/auth" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Sign In</Link>
            </div>
        </div>
    </nav>
);

const StaticAuth = () => {
    const { signInWithGitHub, signInWithGoogle } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                toast({ title: "Welcome back!", description: "Successfully signed in." });
            } else {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
                toast({ title: "Account created", description: "Welcome! Your account has been created." });
            }
            navigate('/dashboard');
        } catch (err: any) {
            toast({ variant: "destructive", title: "Authentication Error", description: err.message || "Something went wrong." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGitHub = async () => {
        setIsLoading(true);
        try {
            await signInWithGitHub();
            toast({ title: "Welcome aboard", description: "GitHub connected successfully." });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Login Failed", description: err.message || "Could not authenticate with GitHub." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogle = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Login Failed", description: err.message || "Could not authenticate with Google." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-xl">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
                <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Sign In
                </button>
                <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Create Account
                </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
            <p className="text-sm text-gray-500 mb-6">{isLogin ? 'Sign in to access your dashboard.' : 'Start your journey. No credit card required.'}</p>

            <form onSubmit={handleEmailAuth} className="space-y-4">
                {!isLogin && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Name</Label>
                        <Input
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                        />
                    </div>
                )}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            type="email"
                            placeholder="you@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pl-9 pr-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                {!isLogin && (
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="terms" className="text-sm text-gray-600">I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link></Label>
                    </div>
                )}
                <Button type="submit" disabled={isLoading || (!isLogin && !agreeTerms)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg">
                    {isLoading ? 'Processing...' : (isLogin ? 'Sign in to Console' : 'Create account')}
                </Button>
            </form>

            <div className="relative py-4 mt-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 font-medium tracking-wider">Or sign in with</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" disabled={isLoading} onClick={handleGitHub} className="border-gray-200 hover:bg-gray-50 text-gray-700">
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                </Button>
                <Button type="button" variant="outline" disabled={isLoading} onClick={handleGoogle} className="border-gray-200 hover:bg-gray-50 text-gray-700">
                    <GoogleIcon />
                    <span className="ml-2">Google</span>
                </Button>
            </div>
        </div>
    );
};

const Hero = () => (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-24 px-6 bg-white overflow-hidden">
        <div className="container mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                {/* Left Column: The Gate */}
                <div className="relative z-10 w-full flex justify-center lg:justify-start">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100 rounded-full blur-[100px] -z-10" />
                    <StaticAuth />
                </div>

                {/* Right Column: The Hook */}
                <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 mb-8">
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-xs font-bold tracking-wide uppercase">100% Open Source Command Center</span>
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6">
                        Your Infrastructure,<br />
                        <span className="text-blue-600">Mastered.</span>
                    </h1>
                    
                    <p className="text-lg text-gray-600 mb-10 max-w-xl leading-relaxed">
                        A God-Mode DevOps, CI/CD, and Security dashboard. Total visibility. Complete control. Zero compromises.
                    </p>
                </div>
            </div>
        </div>
    </section>
);

const FloatingUI = () => (
    <section className="relative py-24 overflow-hidden border-y border-gray-200 bg-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-50 pointer-events-none" />
        
        <div className="container mx-auto px-6 relative h-[600px] flex items-center justify-center">
            
            {/* Center: Auto-Medic (Now Light Theme) */}
            <div className="absolute z-30 w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-2xl p-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                    <div className="flex items-center gap-3 text-black">
                        <Activity className="w-5 h-5 text-red-500" />
                        <span className="font-bold text-sm tracking-wider uppercase">Auto-Medic Pipeline</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs text-gray-500 font-mono">SYSTEM_NOMINAL</span>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-mono text-gray-700">ERR_OOM_PRODUCTION_API - Memory Limit Exceeded</span>
                        </div>
                        <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200">RESOLVED</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                            <Terminal className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-mono text-gray-800">RESTART_CLUSTER (eu-west-1)</span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">1.2ms</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                        <Cpu className="w-4 h-4 text-blue-500" />
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="w-[34%] h-full bg-blue-500" />
                        </div>
                        <span className="text-xs text-gray-500 font-mono">34% LOAD</span>
                    </div>
                </div>
            </div>

            {/* Left/Back: Security War Room */}
            <div className="absolute z-20 left-4 lg:left-24 top-12 w-80 bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl p-5 shadow-xl hidden sm:block">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                    <Shield className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-gray-900 text-xs tracking-wider uppercase">Security War Room</span>
                </div>
                <div className="space-y-3">
                    <div className="text-xs text-gray-500 font-mono flex justify-between">
                        <span>ATTACK_VECTOR</span>
                        <span className="text-red-500 font-bold">BLOCKED</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mb-3">
                        <div className="h-full bg-red-500 w-[88%] rounded-full" />
                    </div>
                    <div className="text-xs text-gray-500 font-mono flex justify-between">
                        <span>RATE_LIMITER</span>
                        <span className="text-green-500 font-bold">ACTIVE</span>
                    </div>
                     <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-green-500 w-[100%] rounded-full" />
                    </div>
                </div>
            </div>

            {/* Right/Back: Remote Tasks */}
            <div className="absolute z-20 right-4 lg:right-24 bottom-12 w-80 bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl p-5 shadow-xl hidden sm:block">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-gray-900 text-xs tracking-wider uppercase">Remote Tasks</span>
                </div>
                <div className="font-mono text-xs text-gray-600 space-y-1.5">
                    <div><span className="text-blue-500">$</span> servx deploy --production</div>
                    <div>[+] Initializing cluster...</div>
                    <div>[+] Validating environment...</div>
                    <div className="text-green-600 font-bold">[✓] Deployment successful</div>
                </div>
            </div>

        </div>
    </section>
);

const BentoGrid = () => (
    <section className="py-24 container mx-auto px-6 bg-white">
        <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Three Steps to Total Control</h2>
            <p className="text-lg text-gray-600 max-w-xl">A unified workflow designed for engineers. Remove friction, maintain security, and automate resolution.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Card 1: Connect */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col min-h-[400px]">
                <h3 className="text-xl font-bold text-gray-900 mb-2">1. Connect</h3>
                <p className="text-sm text-gray-600 mb-8">Establish secure keys in the Connection Vault.</p>
                <div className="flex-1 bg-slate-50 rounded-xl border border-gray-200 p-5 flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative z-10">
                        <Key className="w-5 h-5 text-blue-500" />
                        <div>
                            <div className="text-xs font-bold text-gray-900">Vercel API Key</div>
                            <div className="text-[10px] text-gray-500 font-mono">vrc_***92X8</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative z-10">
                        <Server className="w-5 h-5 text-purple-500" />
                        <div>
                            <div className="text-xs font-bold text-gray-900">Render Instance URL</div>
                            <div className="text-[10px] text-gray-500 font-mono">api-***.onrender.com</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Monitor & Attack */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col min-h-[400px]">
                <h3 className="text-xl font-bold text-gray-900 mb-2">2. Monitor & Defend</h3>
                <p className="text-sm text-gray-600 mb-8">Attack Path radar and rate limiter active.</p>
                <div className="flex-1 bg-slate-50 rounded-xl border border-gray-200 p-5 flex items-center justify-center relative overflow-hidden">
                     {/* Radar static graphic */}
                     <div className="absolute w-64 h-64 border border-red-200 rounded-full flex items-center justify-center">
                         <div className="w-48 h-48 border border-red-300 rounded-full flex items-center justify-center">
                             <div className="w-32 h-32 border border-red-400/50 rounded-full flex items-center justify-center bg-red-50">
                                <Shield className="w-8 h-8 text-red-500 z-10" />
                             </div>
                         </div>
                     </div>
                     {/* Static Blips */}
                     <div className="absolute top-1/4 left-1/4 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                     <div className="absolute bottom-1/3 right-1/4 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
            </div>

            {/* Card 3: Auto-Heal */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col min-h-[400px]">
                <h3 className="text-xl font-bold text-gray-900 mb-2">3. Auto-Heal</h3>
                <p className="text-sm text-gray-600 mb-8">AI-generated fixes submitted as PRs instantly.</p>
                <div className="flex-1 bg-slate-50 rounded-xl border border-gray-200 p-5 flex flex-col justify-center">
                    <div className="bg-white border border-green-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                        <div className="flex items-center gap-2 mb-3">
                            <GitPullRequest className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 uppercase">PR #442</span>
                        </div>
                        <div className="text-[11px] font-mono text-gray-600 leading-relaxed">fix: handle unhandled promise rejection in auth middleware</div>
                        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-green-600 uppercase font-bold tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Auto-merged by Medic
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const FeatureDeepDives = () => (
    <section className="py-32 border-t border-gray-200 bg-white">
        <div className="container mx-auto px-6 space-y-32">
            
            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="w-12 h-12 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-6">
                        <Lock className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Granular Access Control</h3>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        Total command over your repository's security posture. Administrators can lock out GitHub contributors instantly, revoke external access tokens, and sandbox high-risk environments with a single immutable policy update.
                    </p>
                </div>
                {/* Mockup */}
                <div className="bg-slate-50 rounded-2xl border border-gray-200 p-6 shadow-xl relative">
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Contributors</span>
                            <span className="text-xs text-purple-700 bg-purple-100 border border-purple-200 font-bold px-2 py-1 rounded">2/25 Blocked</span>
                        </div>
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">DEV</div>
                                <div>
                                    <div className="text-sm text-gray-900 font-medium">backend_contractor</div>
                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: usr_892x</div>
                                </div>
                            </div>
                            <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider cursor-default">
                                Lock Access
                            </div>
                        </div>
                         <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">EXT</div>
                                <div>
                                    <div className="text-sm text-gray-400 font-medium line-through">frontend_intern</div>
                                    <div className="text-[10px] text-purple-600 font-mono mt-0.5">ACCESS_REVOKED</div>
                                </div>
                            </div>
                            <div className="border border-gray-200 bg-gray-50 text-gray-400 text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-wider cursor-default">
                                Locked
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                 {/* Mockup */}
                 <div className="bg-slate-50 rounded-2xl border border-gray-200 p-6 shadow-xl relative lg:order-1 order-2">
                    <div className="flex flex-col h-full relative z-10">
                        <div className="flex gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-gray-300" />
                            <div className="w-3 h-3 rounded-full bg-gray-300" />
                            <div className="w-3 h-3 rounded-full bg-gray-300" />
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 font-mono text-xs shadow-sm">
                            <div className="text-gray-600"><span className="text-blue-500 mr-2">→</span>Connecting to Vercel API...</div>
                            <div className="text-gray-600"><span className="text-blue-500 mr-2">→</span>Authenticated as <span className="text-black font-semibold">servx-system</span></div>
                            <div className="text-gray-600"><span className="text-blue-500 mr-2">→</span>Fetching latest build hash...</div>
                            <div className="text-green-700 bg-green-50 p-3 rounded mt-2 border-l-2 border-green-500 font-bold border-y border-r border-[#e5e7eb]">BUILD SUCCESS: e9f8a2c deployed globally</div>
                        </div>
                    </div>
                </div>

                <div className="lg:order-2 order-1">
                    <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center mb-6">
                        <Cloud className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Zero-Friction Deployments</h3>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        Natively integrated with Vercel and Render. Establish an immutable pipeline that links runtime telemetry directly with deployment triggers. Bypass generic dashboards and deploy through ServX's high-speed routing.
                    </p>
                </div>
            </div>

        </div>
    </section>
);

const Footer = () => (
    <footer className="bg-white py-12 border-t border-gray-200">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <ServXLogo showTagline={false} size="sm" />
            <p className="text-xs text-gray-500 font-mono">100% OPEN SOURCE INFRASTRUCTURE COMMAND</p>
            <div className="flex items-center gap-6">
                <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Terms of Service</Link>
                <a href="#" className="text-gray-500 hover:text-gray-900"><Github className="w-5 h-5" /></a>
            </div>
        </div>
    </footer>
);

// --- Main Page Component ---
const Landing = () => {
    return (
        <div className="min-h-screen bg-white text-gray-900 selection:bg-blue-200 font-sans">
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
