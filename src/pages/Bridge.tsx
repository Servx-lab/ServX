import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Github, 
    Link2,
    Shield,
    LogOut,
    CheckCircle2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";

const Bridge = () => {
    const { linkGithub, currentUser, logout } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleLinkGitHub = async () => {
        setIsLoading(true);
        try {
            await linkGithub();
            toast({
                title: "Account Linked",
                description: "Your GitHub account has been successfully connected.",
            });
            // The AuthContext will automatically redirect to dashboard upon successful linking
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Linking Failed",
                description: error.message || "Could not link GitHub account.",
            });
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to logout", error);
        }
    };

    return (
        <div className="min-h-screen w-full bg-orizons-void flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orizons-purple/10 rounded-full blur-[100px] pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg relative z-10"
            >
                {/* Bridge Card */}
                <div className="bg-orizons-card border border-orizons-teal/20 rounded-2xl shadow-2xl overflow-hidden">
                    
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-orizons-card to-orizons-input p-8 text-center border-b border-white/5">
                        <div className="flex items-center justify-center gap-4 mb-6 relative">
                            {/* Avatar 1: Google User */}
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-2 border-orizons-teal/50 overflow-hidden shadow-lg bg-orizons-void">
                                    {currentUser?.photoURL ? (
                                        <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-orizons-teal text-white text-xl font-bold">
                                            {currentUser?.email?.[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border-2 border-orizons-void">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-500" />
                                </div>
                            </div>

                            {/* Link Icon */}
                            <div className="w-10 h-10 rounded-full bg-orizons-void border border-orizons-teal/20 flex items-center justify-center -mx-2 z-10 shadow-xl">
                                <Link2 className="w-5 h-5 text-orizons-text-low" />
                            </div>

                            {/* Avatar 2: GitHub Placeholder */}
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-orizons-text-low/30 flex items-center justify-center bg-orizons-card/50">
                                    <Github className="w-8 h-8 text-orizons-text-low/50" />
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">Connect GitHub</h2>
                        <p className="text-orizons-text-low max-w-sm mx-auto">
                            To create deployments and manage repositories, Orizon requires a GitHub connection.
                        </p>
                    </div>

                    {/* Action Section */}
                    <div className="p-8 space-y-6">
                        
                        <div className="bg-orizons-card/50 rounded-xl p-4 border border-orizons-teal/10">
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-sm text-orizons-text-low">
                                    <Shield className="w-5 h-5 text-orizons-teal shrink-0" />
                                    <span>
                                        This will link your Google account <span className="text-white font-medium">{currentUser?.email}</span> with your GitHub profile.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <Button 
                            onClick={handleLinkGitHub}
                            disabled={isLoading}
                            className="w-full h-12 bg-orizons-teal hover:bg-orizons-mint text-white font-semibold rounded-xl text-md shadow-lg shadow-orizons-teal/20 transition-all hover:scale-[1.01]"
                        >
                            <Github className="w-5 h-5 mr-2" />
                            {isLoading ? 'Connecting...' : 'Link GitHub Account'}
                        </Button>

                        <div className="text-center">
                            <button 
                                onClick={handleLogout}
                                className="text-xs text-orizons-text-low hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
                            >
                                <LogOut className="w-3 h-3" />
                                Sign out and try a different account
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Bridge;
