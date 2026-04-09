import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    Download, 
    Monitor, 
    ArrowRight, 
    Check, 
    Terminal,
    Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";

interface OnboardingModalProps {
    userName?: string | null;
    authMethod?: 'github' | 'google' | null;
}

const WindowsIcon = () => (
    <svg viewBox="0 0 88 88" className="w-4 h-4 fill-current"><path d="M0 12.402l35.687-4.86.016 34.423-35.67.034L0 12.402zm35.67 33.529l.028 34.453L.028 75.48.028 45.966l35.642-.035zm4.323-39.757L88 0v41.527l-48.007.288V6.174zM88 46.216v41.61L39.993 81.71v-35.53L88 46.216z"/></svg>
);

const AppleIcon = () => (
    <svg viewBox="0 0 384 512" className="w-4 h-4 fill-current"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
);

const LinuxIcon = () => (
    <svg viewBox="0 0 448 512" className="w-4 h-4 fill-current"><path d="M220.6 65.3c13.9 14.3 9.1 28.1 7.1 34.6-1.5 5.1-4.8 14.1-3.1 20.7 15.6 15.6 34 22.9 43.1 49.1 12.6 36.2-7 65.5-20.1 77.2-12.7 11.4-23.7 11.5-23.7 11.5s5 15.1 1.6 24.3c-2.8 7.5-6.6 10.9-12.4 14.6.6 9.6-13.4 15.4-22.3 22.3 7 7.7 1.2 24.4-4.8 28-32.9 19.8-31 9.4-44.6 20.4-3.5 2.8-7.9 10.1-5.6 17.8 4.2 14.1 21.6 21.6 42.6 21.3 54 2.3 104.9-46.1 131.7-65.7 13.9-10.1 34.7-17.7 48.4-18.2 23.3-.8 48.1 18.5 48.4 24.1.6 11.4-25.7 39.8-59 51-51.4 17.3-100.3 32.5-163.6 33.1H183c-1.6 0-3 1.3-4.1 2.8-8.6 11.6-25 15.1-36.9 11-14.8-5.1-66.2-30.4-96-48.5-12.3-7.5-11.2-22.7-3.8-38.3 26-54.6 15.6-88.7 11.6-101.4-2.8-9 1-13.7 3.6-19.4 6.7-14.4 6.9-20.9 7.6-35.8.7-14.9 3.1-23.7 11.6-28.7 12.6-7.4 34.2-12.3 51.5-11.5 25.5 1.3 52.8 12.5 73.1 22.1 6.8 3.2 20.7 7.5 32.7 13.8 2.2-7.5 5.4-18.4 20-22.6 10.2-2.9 23-1.6 23-1.6z"/></svg>
);

export const OnboardingModal = ({ userName, authMethod = 'github' }: OnboardingModalProps) => {
    const navigate = useNavigate();

    const handleDownload = () => {
        // In a real scenario, this would trigger the download
        // For now, we simulate and continue
        window.open('https://servx.dev/download', '_blank');
        setTimeout(() => {
            navigate('/dashboard');
        }, 1000);
    };

    const handleSkip = () => {
        navigate('/dashboard');
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl bg-[#181C25]/80 backdrop-blur-xl border border-orizons-teal/40 rounded-2xl shadow-[0_0_50px_rgba(0,194,203,0.15)] overflow-hidden"
        >
            {/* Top decorative line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orizons-teal to-transparent opacity-50" />
            
            <div className="p-10 text-center relative z-10">
                
                {/* Header Icon */}
                <div className="mx-auto w-20 h-20 bg-orizons-void rounded-2xl border border-orizons-teal/20 flex items-center justify-center mb-6 shadow-xl relative group">
                    <Monitor className="w-10 h-10 text-orizons-teal" />
                    <div className="absolute inset-0 border border-orizons-teal/40 rounded-2xl animate-pulse-glow" />
                </div>

                {/* Welcome Text */}
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                    Your Workspace is Ready{userName ? `, ${userName}` : ''}!
                </h2>
                
                <p className="text-orizons-text-low text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                    To get the full power of the <span className="text-orizons-teal">Auto-Medic Pipeline</span> and local server monitoring, download the ServX-Lab desktop companion.
                </p>

                {/* Feature Highlights */}
                <div className="grid grid-cols-2 gap-4 mb-8 text-left max-w-lg mx-auto">
                    <div className="bg-orizons-void/50 p-4 rounded-xl border border-white/5 flex items-start gap-3">
                        <Terminal className="w-5 h-5 text-orizons-purple mt-0.5" />
                        <div>
                            <h4 className="text-white font-medium text-sm">Direct Repo Access</h4>
                            <p className="text-xs text-orizons-text-low mt-1">Zero-config git integration enabled.</p>
                        </div>
                    </div>
                    <div className="bg-orizons-void/50 p-4 rounded-xl border border-white/5 flex items-start gap-3">
                        <Activity className="w-5 h-5 text-orizons-mint mt-0.5" />
                        <div>
                            <h4 className="text-white font-medium text-sm">Real-time Metrics</h4>
                            <p className="text-xs text-orizons-text-low mt-1">Live CPU/Memory usage tracking.</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                    <Button 
                        onClick={handleDownload}
                        className="w-full max-w-md h-14 bg-orizons-teal hover:bg-orizons-mint text-white font-semibold text-lg rounded-xl shadow-[0_0_30px_rgba(0,194,203,0.3)] hover:shadow-[0_0_50px_rgba(0,194,203,0.5)] transition-all duration-300 relative overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            <span className="flex gap-2 items-center opacity-80 mr-2">
                                <WindowsIcon />
                                <AppleIcon />
                                <LinuxIcon />
                            </span>
                            Download ServX-Lab App
                        </span>
                        {/* Sparkle/Pulse effect inside button */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:animate-shine" />
                    </Button>

                    <button 
                        onClick={handleSkip}
                        className="text-orizons-text-low hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto pt-2"
                    >
                        Continue to Web Dashboard
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />
        </motion.div>
    );
};
