import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Github, 
    ArrowRight,
    Zap,
    AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";

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

const AuthPage = () => {
    const { signInWithGitHub, signInWithGoogle } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleGitHubLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGitHub();
            toast({
                title: "Welcome aboard",
                description: "GitHub connected successfully.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: error.message || "Could not authenticate with GitHub.",
            });
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: error.message || "Could not authenticate with Google.",
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-orizons-void flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orizons-teal/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orizons-teal to-orizons-purple mb-4 shadow-[0_0_30px_rgba(0,194,203,0.3)]">
                        <Zap className="h-6 w-6 text-white fill-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome to Orizon</h1>
                    <p className="text-orizons-text-low">
                        The developer-first infrastructure platform.
                    </p>
                </div>

                {/* Auth Card */}
                <div className="backdrop-blur-2xl bg-orizons-card/80 border border-orizons-teal rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                    
                    {/* Subtle border glow animation */}
                    <div className="absolute inset-0 border border-orizons-teal/20 rounded-2xl pointer-events-none" />
                    
                    <div className="space-y-4">
                        {/* Primary Action: GitHub */}
                        <Button 
                            onClick={handleGitHubLogin}
                            disabled={isLoading}
                            className="w-full h-14 bg-orizons-teal hover:bg-orizons-mint text-white font-semibold text-lg rounded-xl shadow-[0_4px_20px_rgba(0,194,203,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                <Github className="h-5 w-5" />
                                {isLoading ? 'Authenticating...' : 'Continue with GitHub'}
                            </span>
                            {/* Shine effect */}
                            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                        </Button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-orizons-card px-2 text-orizons-text-low/50 font-medium tracking-wider">Alternative</span>
                            </div>
                        </div>

                        {/* Secondary Action: Google */}
                        <Button 
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full h-12 bg-transparent border-orizons-teal/30 hover:bg-orizons-teal/5 text-orizons-teal hover:text-orizons-mint font-medium rounded-xl transition-all hover:border-orizons-teal/60"
                        >
                            <div className="flex items-center gap-3">
                                <GoogleIcon />
                                Sign in with Google
                            </div>
                        </Button>
                    </div>

                    {/* Security Note */}
                    <div className="mt-6 flex items-start gap-2 text-xs text-orizons-text-low/60 bg-black/20 p-3 rounded-lg border border-white/5">
                        <AlertCircle className="h-4 w-4 text-orizons-teal shrink-0 mt-0.5" />
                        <p>
                            We request <span className="text-orizons-text-low font-medium">read-only access</span> to your repositories initially. You can manage integration settings later.
                        </p>
                    </div>

                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-orizons-text-low/40">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthPage;
