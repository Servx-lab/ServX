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
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-black">
          <Shield className="w-5 h-5 text-blue-500" /> Access Control
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-black transition-colors p-1 rounded-md hover:bg-gray-200"
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
              className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-4">
                <img 
                  src={contributor.avatar_url} 
                  alt={contributor.login} 
                  className="w-10 h-10 rounded-full border border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <a 
                    href={contributor.html_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm font-medium text-black hover:text-blue-600 transition-colors truncate block"
                  >
                    {contributor.login}
                  </a>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {contributor.contributions} contributions
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-600 text-xs font-medium border border-purple-200">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium border border-blue-200">
                      <Unlock className="w-3 h-3" /> Write Access
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleToggle(contributor.login)}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    isLocked ? 'bg-purple-500' : 'bg-blue-500'
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
          <div className="text-center py-8 text-gray-400">
            No contributors found for this repository.
          </div>
        )}
      </div>
    </div>
  );
};
