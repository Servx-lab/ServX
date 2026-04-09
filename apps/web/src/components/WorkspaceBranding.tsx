import React from "react";
import { motion } from "framer-motion";

interface WorkspaceBrandingProps {
  ownerName: string;
  logoUrl?: string;
}

const WorkspaceBranding: React.FC<WorkspaceBrandingProps> = ({ ownerName, logoUrl }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 mb-6 px-3 py-4 bg-[#151921]/50 rounded-xl border border-[#00C2CB]/10 shadow-[0_0_15px_rgba(0,194,203,0.05)]"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#00C2CB] shadow-[0_0_10px_#00C2CB55] p-1">
          {logoUrl ? (
            <img src={logoUrl} alt="Workspace Logo" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full bg-[#0B0E14] flex items-center justify-center text-[#00C2CB] font-bold text-xl uppercase">
              {ownerName[0]}
            </div>
          )}
        </div>
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full border-2 border-[#00C2CB] blur-sm -z-10" 
        />
      </div>
      
      <div className="text-center">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Viewing Workspace</p>
        <p className="text-sm font-bold text-[#00C2CB] truncate max-w-[140px] drop-shadow-[0_0_5px_rgba(0,194,203,0.3)]">
          {ownerName}
        </p>
      </div>
    </motion.div>
  );
};

export default WorkspaceBranding;
