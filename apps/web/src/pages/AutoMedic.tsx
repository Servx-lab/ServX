import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Stethoscope, Activity, Settings, RefreshCw } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { AutoMedicPipeline } from '@/features/operations/AutoMedicPipeline';
import DiagnosticPipeline from '@/features/operations/components/AutoMedicPipeline';
import apiClient from '@/lib/apiClient';
import { PageLayout } from '@/components/layout/PageLayout';

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
      <PageLayout title="Auto-Medic Pipeline" fullWidth={true}>
        <div className="flex flex-col items-center justify-center py-32">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500 mt-4">Verifying deployment status...</p>
        </div>
      </PageLayout>
    );
  }

  if (hasDeployments === false) {
    return (
      <PageLayout title="Auto-Medic Pipeline">
        <div className="flex flex-col items-center justify-center py-20">
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
                onClick={() => navigate('/settings')} 
                className="bg-black hover:bg-gray-800 text-white font-medium shadow-sm transition-all rounded-xl h-12 px-6"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Connections
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')} 
                className="border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-xl h-12 px-6"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Auto-Medic Pipeline" 
      subtitle={`ID: ${deploymentId ? `DEP-${deploymentId.substring(0,8)}` : 'INC-2024-8972'} • SEV-1`}
      fullWidth={true}
      headerContent={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              <span className="text-xs font-medium text-green-600">Monitoring Active</span>
          </div>
          <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 text-[10px] uppercase tracking-wider">
            Live Incident
          </Badge>
        </div>
      }
    >
      <div className="flex-1 w-full">
          <AutoMedicPipeline onCheck={handleCheckClick} />
          
          {showDiagnostic && (
              <div ref={diagnosticRef} className="border-t border-gray-100 mt-12 pt-12 min-h-[600px] flex flex-col">
                  <DiagnosticPipeline />
              </div>
          )}
      </div>
    </PageLayout>
  );
};

export default AutoMedic;
