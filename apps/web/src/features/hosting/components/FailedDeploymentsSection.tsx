import React from 'react';
import { AlertCircle, Activity, ArrowRight, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';
import { DeploymentItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FailedDeploymentsSectionProps {
  deployments: DeploymentItem[];
  timeAgo: (ts: number) => string;
  getStateColor: (state: string) => string;
}

export const FailedDeploymentsSection: React.FC<FailedDeploymentsSectionProps> = ({
  deployments,
  timeAgo,
  getStateColor
}) => {
  const navigate = useNavigate();
  
  const failedDeployments = deployments.filter(dep => 
    ['ERROR', 'FAILED', 'CRASHED', 'DOWN', 'UNHEALTHY'].includes((dep.state || '').toUpperCase())
  ).slice(0, 5); // Show only top 5

  return (
    <div className="bg-white border border-red-100 rounded-xl overflow-hidden flex flex-col shadow-sm h-full">
      <div className="p-5 border-b border-red-50 bg-red-50/30 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-red-900 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500" /> Critical Failures
        </h4>
        <Badge className="bg-red-500 text-white border-none text-[10px]">{failedDeployments.length}</Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {failedDeployments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <Activity className="text-green-500 w-6 h-6" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">No Active Failures</p>
            <p className="text-[10px] text-gray-400 mt-1">Infrastructure is currently stable.</p>
          </div>
        ) : (
          failedDeployments.map((dep, idx) => (
            <motion.div 
              key={dep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 rounded-lg border border-red-100 bg-red-50/20 hover:bg-red-50/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-black truncate max-w-[150px]">{dep.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                    <GitBranch size={10} /> {dep.commit?.substring(0, 7) || 'N/A'}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter ${getStateColor(dep.state)}`}>
                  {dep.state}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-red-100/50 mt-2">
                <span className="text-[10px] text-gray-400">{timeAgo(dep.created)}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => navigate(`/auto-medic?deploymentId=${dep.id}`)}
                  className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-100 flex items-center gap-1 text-[10px] font-bold"
                >
                  RUN AUTO-MEDIC <Activity size={10} className="animate-pulse" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      {failedDeployments.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <Button 
            variant="outline" 
            className="w-full h-9 text-xs border-gray-200 hover:bg-white text-gray-600 font-medium"
          >
            Review All Incident Reports
          </Button>
        </div>
      )}
    </div>
  );
};
