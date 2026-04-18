import React from 'react';
import { Zap, ArrowRight, GitBranch, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { DeploymentItem } from '../types';
import { useNavigate } from 'react-router-dom';

interface DeploymentsTableProps {
  deployments: DeploymentItem[];
  timeAgo: (ts: number) => string;
  getStateColor: (state: string) => string;
}

export const DeploymentsTable: React.FC<DeploymentsTableProps> = ({
  deployments,
  timeAgo,
  getStateColor
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-black flex items-center gap-2">
          <Zap size={14} className="text-yellow-500" /> Recent Deployments
        </h4>
        <button className="text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1">
          Show all <ArrowRight size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-auto max-h-[400px]">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-gray-400 bg-gray-50">
            <tr>
              <th className="px-5 py-3 font-medium">Deployment</th>
              <th className="px-5 py-3 font-medium">Commit</th>
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-5 py-3 font-medium text-right">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deployments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-xs text-gray-400">No deployments found</td>
              </tr>
            ) : deployments.map(dep => (
              <tr key={dep.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black truncate max-w-[120px]">{dep.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {dep.commit ? (
                    <div className="flex items-center gap-1 truncate max-w-[100px]">
                      <GitBranch size={10} className="text-gray-400 flex-shrink-0" /> <span className="truncate">{dep.commit}</span>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{timeAgo(dep.created)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {['ERROR', 'FAILED', 'CRASHED'].includes((dep.state || '').toUpperCase()) && (
                      <motion.button
                        onClick={() => navigate(`/auto-medic?deploymentId=${dep.id}`)}
                        title="Run Auto-Medic"
                        animate={{
                          boxShadow: [
                            "0 0 0 0 rgba(239, 68, 68, 0)",
                            "0 0 0 4px rgba(239, 68, 68, 0.3)",
                            "0 0 0 8px rgba(239, 68, 68, 0)"
                          ]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-7 h-7 rounded-full bg-white border border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Activity size={12} />
                      </motion.button>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${getStateColor(dep.state)}`}>{dep.state}</Badge>
                    {dep.url ? (
                      <a href={dep.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors">
                        <ArrowRight size={14} />
                      </a>
                    ) : (
                      <span className="w-3.5" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
