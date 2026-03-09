import React, { useEffect, useState } from 'react';
import GitHubCalendar from 'react-github-calendar';
import { Repository } from './types';

const GitHubDashboard = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/github/repos');
        const data = await res.json();
        setRepos(data);

        // Fetch stack for each repo
        data.forEach(async (repo: Repository) => {
          try {
            const stackRes = await fetch(`http://localhost:5000/api/github/repos/${repo.name}/stack`);
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
  }, []);

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
                <h3 className="font-bold text-primary truncate max-w-[80%]">{repo.name}</h3>
                <span className="text-[10px] opacity-50">{new Date(repo.updated_at).toLocaleDateString()}</span>
              </div>
              <p className="opacity-70 line-clamp-2 text-[11px] leading-relaxed h-8 mb-4">
                {repo.description || "No description provided."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GitHubDashboard;
