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
      
      {/* Rest will be added... */}
    </div>
  );
};

export default GitHubDashboard;
