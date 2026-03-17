import React from 'react';
import { OnboardingModal } from '../components/OnboardingModal';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

const Onboarding = () => {
    const { user } = useAuth();
    const userName = user?.displayName?.split(' ')[0] || "Developer";

    return (
        <div className="min-h-screen w-full bg-orizons-void flex items-center justify-center p-4 relative overflow-hidden">
             {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orizons-teal/5 rounded-full blur-[120px] pointer-events-none" />
            
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10"
            >
                <OnboardingModal userName={userName} />
            </motion.div>
        </div>
    );
};

export default Onboarding;
