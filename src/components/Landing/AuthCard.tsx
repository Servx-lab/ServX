import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Github, 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    ArrowRight, 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from '@/lib/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";

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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                toast({
                    title: "Welcome back!",
                    description: "Successfully signed in to Orizons.",
                });
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                toast({
                    title: "Account created",
                    description: "Welcome to Orizons! Your account has been created.",
                });
            }
            navigate('/dashboard');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: error.message || "Something went wrong. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        try {
            const authProvider = provider === 'google' 
                ? new GoogleAuthProvider() 
                : new GithubAuthProvider();
            
            await signInWithPopup(auth, authProvider);
            toast({
                title: "Welcome back!",
                description: `Successfully signed in with ${provider}.`,
            });
            navigate('/dashboard');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: error.message || "Failed to sign in with social provider.",
            });
        }
    };

    return (
        <div className="w-full max-w-md mx-auto relative z-10">
            {/* Glassmorphism Card - Updated to Surface Dark #181C25 */}
            <div className="relative overflow-hidden rounded-2xl border border-orizons-border-inactive bg-orizons-card backdrop-blur-2xl shadow-2xl">
                {/* Auth content container */}
                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold tracking-tight text-orizons-text-high mb-2">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-sm text-orizons-text-low">
                            {isLogin 
                                ? 'Enter your credentials to access the console.' 
                                : 'Start your journey. No credit card required.'}
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <div className="relative bg-orizons-input p-1 rounded-lg mb-8 flex">
                        <motion.div 
                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-orizons-teal/10 rounded-md shadow-sm border border-orizons-teal/30"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            style={{ left: isLogin ? '4px' : 'calc(50% + 0px)' }}
                        />
                         <button 
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 relative z-10 text-sm font-medium py-2 rounded-md transition-colors duration-200 ${isLogin ? 'text-orizons-text-high' : 'text-orizons-text-low hover:text-orizons-text-high'}`}
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 relative z-10 text-sm font-medium py-2 rounded-md transition-colors duration-200 ${!isLogin ? 'text-orizons-text-high' : 'text-orizons-text-low hover:text-orizons-text-high'}`}
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
                            onSubmit={handleAuth}
                        >
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-orizons-text-low">Email Address</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-orizons-text-low group-focus-within:text-orizons-teal transition-colors" />
                                    <Input 
                                        type="email" 
                                        placeholder="dev@company.com" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="pl-9 bg-orizons-input border-orizons-border-inactive text-orizons-text-high placeholder:text-orizons-text-low/50 focus:border-orizons-teal focus:ring-orizons-teal/20 transition-all rounded-lg"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-medium text-orizons-text-low">Password</Label>
                                    {isLogin && <a href="#" className="text-xs text-orizons-teal hover:text-orizons-mint">Forgot?</a>}
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-orizons-text-low group-focus-within:text-orizons-teal transition-colors" />
                                    <Input 
                                        type={showPassword ? 'text' : 'password'} 
                                        placeholder="••••••••" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="pl-9 pr-9 bg-orizons-input border-orizons-border-inactive text-orizons-text-high placeholder:text-orizons-text-low/50 focus:border-orizons-teal focus:ring-orizons-teal/20 transition-all rounded-lg"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-orizons-text-low hover:text-orizons-text-high transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-orizons-teal hover:bg-orizons-mint text-orizons-text-high font-semibold py-5 rounded-lg shadow-[0_0_20px_rgba(0,194,203,0.3)] border border-transparent hover:border-orizons-mint/50 transition-all group"
                            >
                                {isLoading ? 'Processing...' : (isLogin ? 'Sign In to Console' : 'Create Free Account')}
                                {!isLoading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                            </Button>
                        </motion.form>
                    </AnimatePresence>

                    {/* Social Login */}
                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-orizons-border-inactive" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-orizons-card px-2 text-orizons-text-low">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <Button 
                                type="button"
                                onClick={() => handleSocialLogin('github')}
                                variant="outline" 
                                className="bg-orizons-input border-orizons-border-inactive hover:bg-white/5 hover:text-orizons-text-high text-orizons-text-low"
                            >
                                <Github className="mr-2 h-4 w-4" />
                                GitHub
                            </Button>
                            <Button 
                                type="button"
                                onClick={() => handleSocialLogin('google')}
                                variant="outline" 
                                className="bg-orizons-input border-orizons-border-inactive hover:bg-white/5 hover:text-orizons-text-high text-orizons-text-low"
                            >
                                <GoogleIcon />
                                <span className="ml-2">Google</span>
                            </Button>
                        </div>
                    </div>
                </div>
                
                {/* Bottom Highlight Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orizons-teal via-orizons-purple to-orizons-teal" />
            </div>

            {/* Background Glow Effects around the card */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-orizons-purple/20 rounded-full blur-[80px] -z-10" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-orizons-teal/20 rounded-full blur-[80px] -z-10" />
        </div>
    );
};

export default AuthCard;
