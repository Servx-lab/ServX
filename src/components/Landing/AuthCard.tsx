import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Github, 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    ArrowRight, 
    CheckCircle2 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
);

const AuthCard = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="w-full max-w-md mx-auto relative z-10">
            {/* Glassmorphism Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl">
                {/* Auth content container */}
                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-sm text-white/50">
                            {isLogin 
                                ? 'Enter your credentials to access the console.' 
                                : 'Start your 14-day free trial. No credit card required.'}
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <div className="relative bg-white/5 p-1 rounded-lg mb-8 flex">
                        <motion.div 
                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-md shadow-sm border border-white/5"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            style={{ left: isLogin ? '4px' : 'calc(50% + 0px)' }}
                        />
                         <button 
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 relative z-10 text-sm font-medium py-2 rounded-md transition-colors duration-200 ${isLogin ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 relative z-10 text-sm font-medium py-2 rounded-md transition-colors duration-200 ${!isLogin ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                        >
                            Join Free
                        </button>
                    </div>

                    {/* Form Fields with AnimatePresence */}
                    <AnimatePresence mode="wait">
                        <motion.form 
                            key={isLogin ? 'login' : 'signup'}
                            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                            onSubmit={(e) => e.preventDefault()}
                        >
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-white/70">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                                    <Input 
                                        type="email" 
                                        placeholder="dev@company.com" 
                                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all rounded-lg"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-medium text-white/70">Password</Label>
                                    {isLogin && <a href="#" className="text-xs text-cyan-400 hover:text-cyan-300">Forgot?</a>}
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                                    <Input 
                                        type={showPassword ? 'text' : 'password'} 
                                        placeholder="••••••••" 
                                        className="pl-9 pr-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all rounded-lg"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-white/30 hover:text-white/70 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-5 rounded-lg shadow-lg shadow-cyan-500/20 border border-white/10 transition-all group">
                                {isLogin ? 'Sign In to Console' : 'Create Free Account'}
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </motion.form>
                    </AnimatePresence>

                    {/* Social Login */}
                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#12141C] px-2 text-white/40">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70">
                                <Github className="mr-2 h-4 w-4" />
                                GitHub
                            </Button>
                            <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70">
                                <GoogleIcon />
                                <span className="ml-2">Google</span>
                            </Button>
                        </div>
                    </div>
                </div>
                
                {/* Bottom Highlight Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500" />
            </div>

            {/* Background Glow Effects around the card */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/30 rounded-full blur-[80px] -z-10" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/30 rounded-full blur-[80px] -z-10" />
        </div>
    );
};

export default AuthCard;
