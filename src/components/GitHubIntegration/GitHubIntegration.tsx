import React, { useEffect, useState } from 'react';
import { RepoDetails, RepositorySummary } from './types';
import { Github, ExternalLink, GitCommit, Users, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

const GitHubIntegration = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [repos, setRepos] = useState<RepositorySummary[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<RepoDetails | null>(null);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Auth Check (On Mount)
    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        const tokenFromStorage = localStorage.getItem('github_token');

        if (tokenFromUrl) {
            // Save token and clean URL
            localStorage.setItem('github_token', tokenFromUrl);
            setIsAuthenticated(true);
            setSearchParams({}); // Remove query params
        } else if (tokenFromStorage) {
            setIsAuthenticated(true);
        }
    }, [searchParams, setSearchParams]);

    // 2. Fetch Repos (When Authenticated)
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchRepos = async () => {
            setLoadingRepos(true);
            setError(null);
            try {
                const token = localStorage.getItem('github_token');
                if (!token) throw new Error("No token found");

                const res = await fetch(`${API_BASE}/github/repos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                        // Token invalid/expired
                        handleLogout();
                        throw new Error("Session expired. Please reconnect.");
                    }
                    throw new Error("Failed to fetch repositories.");
                }

                const data = await res.json();
                setRepos(data);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoadingRepos(false);
            }
        };

        fetchRepos();
    }, [isAuthenticated]);

    // 3. Handlers
    const handleLogin = () => {
        window.location.href = `${API_BASE}/auth/github`;
    };

    const handleLogout = () => {
        localStorage.removeItem('github_token');
        setIsAuthenticated(false);
        setRepos([]);
        setSelectedRepo(null);
    };

    const handleRepoClick = async (repo: RepositorySummary) => {
        if (selectedRepo?.id === repo.id) return; // Already selected
        
        setLoadingDetails(true);
        setError(null);
        // Clear previous details immediately for "snappy" feel, or keep stale data? 
        // User asked for "immediate". Let's show a loading state in the panels but keep the layout stable.
        setSelectedRepo(null); 

        try {
            const token = localStorage.getItem('github_token');
            // Parse owner/repo from full_name
            const [owner, name] = repo.full_name.split('/');

            const res = await fetch(`${API_BASE}/github/repos/${owner}/${name}/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch repository details.");

            const data = await res.json();
            // Extract and format data to fit our state shape
            const fullDetails: RepoDetails = {
                ...data.details,
                commits: data.commits,
                contributors: data.contributors
            };
            
            setSelectedRepo(fullDetails);

        } catch (err: any) {
            console.error(err);
            setError("Could not load repository details.");
        } finally {
            setLoadingDetails(false);
        }
    };

    // 4. Render
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                <div className="p-4 bg-muted rounded-full">
                    <Github className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Connect to GitHub</h2>
                <p className="text-muted-foreground max-w-md">
                    Integrate your repositories to view detailed insights, commit history, and contributor statistics directly from your dashboard.
                </p>
                <button 
                    onClick={handleLogin}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded hover:opacity-90 transition-none active:translate-y-0.5"
                >
                    Connect GitHub Account
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background text-foreground font-sans">
            {/* Header / Meta */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-border">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Github className="w-5 h-5" /> 
                        Your Repositories <span className="opacity-50 font-normal ml-2 text-sm">{repos.length}</span>
                    </h2>
                </div>
                <div className="flex gap-4 items-center">
                    {loadingRepos && <span className="text-xs text-muted-foreground uppercase tracking-widest">Syncing...</span>}
                    <button 
                        onClick={handleLogout} 
                        className="text-xs text-destructive hover:underline transition-none"
                    >
                        Disconnect
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 mb-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded">
                    {error}
                </div>
            )}

            <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
                {/* Left Panel: Repo List */}
                <div className="w-1/3 border-r border-border overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 gap-0.5">
                        {repos.map(repo => (
                            <div 
                                key={repo.id}
                                onClick={() => handleRepoClick(repo)}
                                className={`
                                    p-3 border rounded-sm cursor-pointer select-none
                                    ${selectedRepo?.id === repo.id ? 'bg-secondary border-primary/50' : 'bg-card border-border hover:bg-muted/50'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-sm font-semibold truncate leading-none">{repo.name}</h3>
                                    {repo.language && (
                                        <span className="text-[9px] uppercase tracking-wider opacity-60 bg-muted px-1.5 py-0.5 rounded-sm">
                                            {repo.language}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground line-clamp-1 h-4">
                                    {repo.description || "No description"}
                                </p>
                                <div className="mt-1.5 flex justify-between items-center text-[10px] opacity-40">
                                    <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Details (Two static panels) */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {!selectedRepo && !loadingDetails ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30">
                            <GitCommit className="w-16 h-16 mb-2" />
                            <p>Select a repository to view details</p>
                        </div>
                    ) : (
                        loadingDetails ? (
                            <div className="h-full flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
                                Loading Repository Data...
                            </div>
                        ) : (
                            selectedRepo && (
                                <div className="h-full flex flex-row gap-4">
                                    {/* Panel A: Commits */}
                                    <div className="flex-1 flex flex-col border border-border bg-card rounded-md overflow-hidden">
                                        <div className="p-3 border-b border-border bg-muted/20">
                                            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                <GitCommit className="w-3.5 h-3.5" /> Latest Commits
                                            </h3>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-0">
                                            <table className="w-full text-left text-[11px] font-mono">
                                                <tbody>
                                                    {selectedRepo.commits?.slice(0, 50).map((commit) => (
                                                        <tr key={commit.sha} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                                                            <td className="p-2 align-top text-muted-foreground w-20 truncate opacity-70">
                                                                {commit.sha.substring(0, 7)}
                                                            </td>
                                                            <td className="p-2 align-top text-foreground">
                                                                {commit.message}
                                                            </td>
                                                            <td className="p-2 align-top text-xs text-right opacity-60 w-24 whitespace-nowrap">
                                                                {new Date(commit.date).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {!selectedRepo.commits?.length && (
                                                        <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No commits found.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Panel B: Contributors */}
                                    <div className="w-64 flex flex-col border border-border bg-card rounded-md overflow-hidden">
                                         <div className="p-3 border-b border-border bg-muted/20">
                                            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                <Users className="w-3.5 h-3.5" /> Contributors
                                            </h3>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            <div className="divide-y divide-border/50">
                                                {selectedRepo.contributors?.map(contributor => (
                                                    <div key={contributor.login} className="p-3 flex items-center justify-between hover:bg-muted/30">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
                                                                {contributor.avatar_url && (
                                                                    <img src={contributor.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-medium">{contributor.login}</span>
                                                        </div>
                                                        <span className="text-xs font-bold bg-secondary/50 px-1.5 py-0.5 rounded text-secondary-foreground">
                                                            {contributor.contributions}
                                                        </span>
                                                    </div>
                                                ))}
                                                {!selectedRepo.contributors?.length && (
                                                    <div className="p-4 text-center text-muted-foreground text-xs">No contributors found.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default GitHubIntegration;
