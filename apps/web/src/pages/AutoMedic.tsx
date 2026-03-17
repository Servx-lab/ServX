import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { AutoMedicPipeline } from '@/components/AutoMedicPipeline';

const AutoMedic = () => {
  const [searchParams] = useSearchParams();
  const deploymentId = searchParams.get('deploymentId');

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-white text-black font-sans">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-50 rounded-lg border border-red-200 shadow-sm">
                <Activity className="w-5 h-5 text-red-500 animate-pulse" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
                  Auto-Medic Incident Pipeline
                  <Badge variant="outline" className="ml-2 border-red-200 text-red-600 bg-red-50 text-[10px] uppercase tracking-wider">
                    Live Incident
                  </Badge>
                </h1>
                <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {deploymentId ? `DEP-${deploymentId.substring(0,8)}` : 'INC-2024-8972'} • SEV-1</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <span className="text-xs font-medium text-green-600">Monitoring Active</span>
            </div>
          </div>
        </header>

        {/* Pipeline Body */}
        <AutoMedicPipeline />
    </main>
  );
};

export default AutoMedic;
