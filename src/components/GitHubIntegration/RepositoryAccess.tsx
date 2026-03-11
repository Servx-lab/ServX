import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Unlock, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { Contributor } from './types';

interface RepositoryAccessProps {
  repoName: string; // owner/repo
  contributors: Contributor[];
  onClose: () => void;
}

export const RepositoryAccess: React.FC<RepositoryAccessProps> = ({ repoName, contributors, onClose }) => {
  // Local state to track access status. Default to 'unlocked' for now, or we could fetch actual permissions.
  // The GitHub API for contributors doesn't return permissions directly without a specific call per user.
  // Assuming they have write access by default if they are contributors, or we manage it locally.
  const [accessStates, setAccessStates] = useState<Record<string, 'locked' | 'unlocked'>>(
    contributors.reduce((acc, curr) => ({ ...acc, [curr.login]: 'unlocked' }), {})
  );
  const [loadingUser, setLoadingUser] = useState<string | null>(null);

  const handleToggle = async (username: string) => {
    const currentStatus = accessStates[username] || 'unlocked';
    const newStatus = currentStatus === 'unlocked' ? 'locked' : 'unlocked';
    
    setLoadingUser(username);
    try {
      await apiClient.post('/github/collaborator/role', {
        repoName,
        githubUsername: username,
        status: newStatus
      });
      
      setAccessStates(prev => ({
        ...prev,
        [username]: newStatus
      }));
    } catch (error) {
      console.error('Failed to update access:', error);
      // Could add a toast notification here
    } finally {
      setLoadingUser(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#181C25]">
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0B0E14]/50">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Shield className="w-5 h-5 text-[#00C2CB]" /> Access Control
        </h3>
        <button 
          onClick={onClose}
          className="text-[#A4ADB3] hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {contributors.map((contributor) => {
          const status = accessStates[contributor.login] || 'unlocked';
          const isLocked = status === 'locked';
          const isLoading = loadingUser === contributor.login;

          return (
            <div 
              key={contributor.login} 
              className="flex flex-col gap-3 p-4 bg-[#0B0E14] rounded-lg border border-white/5"
            >
              <div className="flex items-center gap-4">
                <img 
                  src={contributor.avatar_url} 
                  alt={contributor.login} 
                  className="w-10 h-10 rounded-full border border-white/10"
                />
                <div className="flex-1 min-w-0">
                  <a 
                    href={contributor.html_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm font-medium text-white hover:text-[#00C2CB] transition-colors truncate block"
                  >
                    {contributor.login}
                  </a>
                  <p className="text-xs text-[#A4ADB3] mt-0.5">
                    {contributor.contributions} contributions
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#6C63FF]/10 text-[#6C63FF] text-xs font-medium border border-[#6C63FF]/20">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00C2CB]/10 text-[#00C2CB] text-xs font-medium border border-[#00C2CB]/20">
                      <Unlock className="w-3 h-3" /> Write Access
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleToggle(contributor.login)}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    isLocked ? 'bg-[#6C63FF]' : 'bg-[#00C2CB]'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="sr-only">Toggle access</span>
                  <motion.span
                    layout
                    initial={false}
                    animate={{
                      x: isLocked ? 2 : 22,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>
            </div>
          );
        })}
        
        {contributors.length === 0 && (
          <div className="text-center py-8 text-[#A4ADB3] opacity-60">
            No contributors found for this repository.
          </div>
        )}
      </div>
    </div>
  );
};
