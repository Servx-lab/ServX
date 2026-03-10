import React, { useEffect, useState } from 'react';
// @ts-ignore
import { GitHubCalendar } from 'react-github-calendar';
import { Repository, Commit } from './types';
import { X } from 'lucide-react';

const GitHubDashboard = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch Commits on selection
  useEffect(() => {
    if (!selectedRepo) return;
    const fetchCommits = async () => {
      try {
        const res = await fetch(`${API_URL}/api/github/repos/${selectedRepo}/commits`);
        const data = await res.json();
        setCommits(data);
      } catch (err) {
        console.error('Failed to fetch commits', err);
      }
    };
    fetchCommits();
  }, [selectedRepo]);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/github/repos`);
        const data = await res.json();
        setRepos(data);

        // Fetch stack for each repo
        data.forEach(async (repo: Repository) => {
          try {
            const stackRes = await fetch(`${API_URL}/api/github/repos/${repo.name}/stack`);
            const stackData = await stackRes.json();
            setRepos(prev => prev.map(r => r.name === repo.name ? { ...r, stack: stackData.stack } : r));
          } catch (err) {
            console.error(err);
          }
        });
      } catch (err) {
        console.error('Failed to fetch repos', err);
      }
    };
    fetchRepos();
  }, [API_URL]);

  return (
    <div className="w-full h-full bg-background p-6 font-mono text-xs text-foreground overflow-y-auto">
      {/* Header & Contribution Chart */}
      <div className="mb-8 border border-border p-4">
        <h2 className="text-sm font-bold mb-4 uppercase tracking-widest text-muted-foreground">Global Contributions</h2>
        <div className="flex justify-center">
            <GitHubCalendar 
              username="ChitkulLakshya" 
              colorScheme="dark"
              blockSize={10}
              blockMargin={4}
              fontSize={10}
              hideColorLegend
              hideMonthLabels
            />
        </div>
      </div>
      
      {/* Repository Grid */}
      <h2 className="text-sm font-bold mb-4 uppercase tracking-widest text-muted-foreground flex items-center justify-between">
        Repositories <span className="opacity-50">{repos.length}</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
        {repos.map((repo) => (
          <div 
            key={repo.id}
            onClick={() => setSelectedRepo(repo.name)}
            className={`border bg-card p-4 h-48 flex flex-col justify-between cursor-pointer transition-none hover:border-primary group relative ${selectedRepo === repo.name ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-primary truncate max-w-[80%] hover:underline" title={repo.full_name || repo.name}>
                    {repo.owner?.login ? `${repo.owner.login}/${repo.name}` : repo.name}
                </h3>
                <span className="text-[10px] opacity-50">{new Date(repo.updated_at).toLocaleDateString()}</span>
              </div>
              <p className="opacity-70 line-clamp-2 text-[11px] leading-relaxed h-8 mb-4">
                {repo.description || "No description provided."}
              </p>
            </div>
            {/* Tech Stack Badges */}
            <div className="flex flex-wrap gap-1 content-end h-12 overflow-hidden">
                {repo.language && (
                <span className="px-1.5 py-0.5 border border-primary/20 text-[9px] bg-primary/5 text-primary rounded-none uppercase tracking-wide">
                    {repo.language}
                </span>
                )}
                {repo.stack?.slice(0, 3).map((item) => (
                <span key={item} className="px-1.5 py-0.5 border border-secondary text-[9px] bg-secondary/10 text-secondary-foreground rounded-none uppercase tracking-wide opacity-80">
                    {item}
                </span>
                ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Commit Analysis Side Panel */}
      {selectedRepo && (
        <div className="fixed top-0 right-0 w-80 h-full bg-background border-l border-border shadow-2xl z-50 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary truncate max-w-[200px]">
              {selectedRepo} Commits
            </h2>
            <button 
              onClick={() => { setSelectedRepo(null); setCommits([]); }}
              className="hover:text-primary transition-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {commits.map((commit) => (
              <div key={commit.sha} className="border-b border-border pb-3 last:border-0">
                <p className="text-[11px] font-medium leading-normal mb-1">{commit.message}</p>
                <div className="flex justify-between text-[10px] text-muted-foreground opacity-60">
                  <span>{commit.author}</span>
                  <span>{new Date(commit.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {commits.length === 0 && <p className="text-muted-foreground text-xs">Loading commits...</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubDashboard;
