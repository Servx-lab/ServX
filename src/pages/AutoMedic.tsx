import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { AutoMedicPipeline } from '@/components/AutoMedicPipeline';

const AutoMedic = () => {
  const [searchParams] = useSearchParams();
  const deploymentId = searchParams.get('deploymentId');

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0E14] text-white font-sans">
        {/* Header (Preserving styling from original, adapted to dark mode for cohesion) */}
        <header className="border-b border-[#222831] bg-[#181C25]/80 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#6C63FF]/10 rounded-lg border border-[#6C63FF]/20 shadow-sm">
                <Activity className="w-5 h-5 text-[#6C63FF] animate-pulse" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Auto-Medic Incident Pipeline
                  <Badge variant="outline" className="ml-2 border-[#6C63FF]/30 text-[#6C63FF] bg-[#6C63FF]/10 text-[10px] uppercase tracking-wider backdrop-blur-sm">
                    Live Incident
                  </Badge>
                </h1>
                <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {deploymentId ? `DEP-${deploymentId.substring(0,8)}` : 'INC-2024-8972'} • SEV-1</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181C25] border border-[#222831]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <span className="text-xs font-medium text-green-400 font-mono tracking-widest uppercase">Monitoring Active</span>
            </div>
          </div>
        </header>

        {/* Pipeline Body */}
        <AutoMedicPipeline />
    </main>
  );
};

export default AutoMedic;
