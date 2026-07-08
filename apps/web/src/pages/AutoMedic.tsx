import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Stethoscope, Activity, Settings, RefreshCw } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { AutoMedicPipeline } from '@/features/operations/AutoMedicPipeline';
import DiagnosticPipeline from '@/features/operations/components/AutoMedicPipeline';
import apiClient from '@/lib/apiClient';

const AutoMedic = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const deploymentId = searchParams.get('deploymentId');
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const diagnosticRef = useRef<HTMLDivElement>(null);
  
  const [hasDeployments, setHasDeployments] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkConnections = async () => {
      try {
        setChecking(true);
        const { data } = await apiClient.get('/connections');
        const active = data.some((c: any) => 
          c.provider && (c.provider.toLowerCase() === 'vercel' || c.provider.toLowerCase() === 'render')
        );
        setHasDeployments(active);
      } catch (err) {
        console.error('Failed to verify connections', err);
        setHasDeployments(false);
      } finally {
        setChecking(false);
      }
    };
    checkConnections();
  }, []);

  const handleCheckClick = () => {
    setShowDiagnostic(true);
    setTimeout(() => {
        diagnosticRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (checking) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center h-full bg-white text-black font-sans rounded-t-[2.5rem] border border-gray-200 shadow-2xl">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500 mt-4">Verifying deployment status...</p>
      </main>
    );
  }

  if (hasDeployments === false) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center h-full bg-white text-black font-sans rounded-t-[2.5rem] border border-gray-200 shadow-2xl p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shadow-sm">
            <Stethoscope className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">No Active Deployments Connected</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              The Auto-Medic Pipeline requires at least one active hosting provider deployment (Vercel or Render) to monitor infrastructure health and diagnose live server issues.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => navigate('/settings/connections')} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Connections
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')} 
              className="border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-white text-black font-sans rounded-t-[2.5rem] border-l border-r border-t border-gray-200 shadow-2xl">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10 shrink-0 rounded-t-[2.5rem]">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-50 rounded-lg border border-red-200 shadow-sm">
                <Stethoscope className="w-5 h-5 text-red-500 animate-pulse" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
                  Auto-Medic Pipeline
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
        <div className="flex-1 overflow-y-auto">
            <AutoMedicPipeline onCheck={handleCheckClick} />
            
            {showDiagnostic && (
                <div ref={diagnosticRef} className="border-t-4 border-gray-100 bg-white min-h-[600px] flex flex-col">
                    <div className="p-6 flex-1 bg-white">
                        <DiagnosticPipeline />
                    </div>
                </div>
            )}
        </div>
    </main>
  );
};

export default AutoMedic;
