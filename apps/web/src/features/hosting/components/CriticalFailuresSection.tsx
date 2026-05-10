import React from 'react';
import { AlertCircle, Activity, Server, ExternalLink, ShieldAlert, Clock, Layout } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGlobalFailures } from '../hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CriticalFailuresSectionProps {
  timeAgo: (ts: number) => string;
  getStateColor: (state: string) => string;
}

export const CriticalFailuresSection: React.FC<CriticalFailuresSectionProps> = ({ 
  timeAgo, 
  getStateColor 
}) => {
  const navigate = useNavigate();
  const { data, isLoading } = useGlobalFailures();
  const failures = data?.history || [];

  return (
    <div className="bg-white border border-red-100 rounded-xl overflow-hidden flex flex-col shadow-sm h-full min-h-[500px]">
      <div className="p-5 border-b border-red-50 bg-red-50/30 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-red-900 flex items-center gap-2">
          <ShieldAlert size={14} className="text-red-500" /> Incident Records
        </h4>
        <Badge className="bg-red-500 text-white border-none text-[10px] font-bold shadow-sm">{failures.length}</Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
             <Activity className="animate-spin text-red-200 w-8 h-8" />
             <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Synchronizing History...</span>
          </div>
        ) : failures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <Activity className="text-green-500 w-8 h-8 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">All Systems Nominal</p>
            <p className="text-[10px] text-gray-400 mt-2 px-6 leading-relaxed">No historical critical incidents detected across connected providers.</p>
          </div>
        ) : (
          failures.map((fail, idx) => (
            <motion.div 
              key={fail.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 rounded-lg border border-red-100 bg-red-50/20 hover:bg-white hover:shadow-lg hover:border-red-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 rounded bg-white border border-gray-100 shadow-sm group-hover:border-red-100 transition-colors">
                      <Server className="w-3 h-3 text-gray-400 group-hover:text-red-400" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider leading-none">{fail.provider}</span>
                      <span className="text-[11px] font-extrabold text-black mt-1 uppercase tracking-tight">{fail.path?.split('/')[1] || fail.project_name || 'System Root'}</span>
                   </div>
                </div>
                <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 ${getStateColor(fail.severity || 'ERROR')}`}>
                  {fail.severity || 'CRITICAL'}
                </Badge>
              </div>

              <div className="bg-white/60 rounded p-2 mb-3 border border-red-50 group-hover:border-red-100 transition-colors">
                <p className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-relaxed italic">
                  "{fail.error_message}"
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-red-100/50">
                <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-mono">
                  <Clock size={10} /> {timeAgo(new Date(fail.timestamp).getTime())}
                </div>
                
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    {/* External Link Symbol */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={fail.deployment_url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-all"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-[10px]">Open Deployment URL</p></TooltipContent>
                    </Tooltip>

                    {/* Auto-Medic Symbol */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => navigate(`/auto-medic?deploymentId=${fail.id}`)}
                          className="w-8 h-8 rounded-full bg-red-500/10 border border-red-200 flex items-center justify-center text-red-600 hover:bg-red-500 hover:text-white transition-all p-0"
                        >
                          <Activity size={12} className="animate-pulse" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-[10px]">Open Auto-Medic Analysis</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      {failures.length > 0 && (
        <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex justify-center">
           <button className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-2">
              <Layout size={10} /> Full Security Audit Log
           </button>
        </div>
      )}
    </div>
  );
};
