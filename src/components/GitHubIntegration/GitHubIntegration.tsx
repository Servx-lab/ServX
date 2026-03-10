import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Github,
  GitCommit,
  GitPullRequest,
  Star,
  Users,
  Box,
  ExternalLink,
  Search,
  Code,
  Activity,
  Calendar,
  Rocket
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";

import { RepoDetails, RepositorySummary, Deployment, Language } from "./types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiClient from "@/lib/apiClient";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const GitHubIntegration = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<RepositorySummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { linkGitHub, signInWithGitHub, isGitHubLinked } = useAuth();

  // Authentication Check (Wait for Firebase Auth)
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    // Cleanup search params
    if (searchParams.get("token") || searchParams.get("success")) {
      setSearchParams({});
    }

    return () => unsubscribe();
  }, [searchParams, setSearchParams]);

  // Fetch Repos
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchRepos = async () => {
      try {
        const res = await apiClient.get('/github/repos');
        setRepos(res.data);
        setFilteredRepos(res.data);
        if (res.data.length > 0) setSelectedRepoId(res.data[0].id);
      } catch (err: any) {
        console.error('Failed to fetch repos:', err);
        if (err.response?.status === 401) {
            const serverError = err.response?.data?.error;
            if (serverError === 'User record not found in database.' || serverError === 'GitHub account not connected.') {
                setError("GitHub not connected. Please connect your account.");
            } else {
                setError(serverError || "GitHub not connected. Please connect your account.");
            }
        } else {
            setError("Failed to fetch repositories.");
        }
      }
    };
    fetchRepos();
  }, [isAuthenticated]);

  // Search Filter
  useEffect(() => {
    setFilteredRepos(
      repos.filter((repo) =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, repos]);

  // Fetch Details when Selected Repo Changes
  useEffect(() => {
    if (!selectedRepoId) return;
    const repo = repos.find((r) => r.id === selectedRepoId);
    if (!repo) return;

    const fetchDetails = async () => {
      setLoadingDetails(true);
      setRepoDetails(null); 
      try {
        const [owner, name] = repo.full_name.split("/");
        const res = await apiClient.get(`/github/repos/${owner}/${name}/details`);
        const data = res.data;
        
        setRepoDetails({
            ...data.details,
            commits: data.commits,
            contributors: data.contributors,
            languages: data.languages,
            deployments: data.deployments
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load repository details.");
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedRepoId, repos]);

  // Data Preparation for Charts
  const commitData = useMemo(() => {
    if (!repoDetails?.commits) return [];
    // Aggregation by date
    const counts: Record<string, number> = {};
    repoDetails.commits.forEach((c) => {
        const date = format(new Date(c.date), 'MMM dd');
        counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count })).reverse();
  }, [repoDetails]);

  const languageData = useMemo(() => {
    if (!repoDetails?.languages) return [];
    return repoDetails.languages.slice(0, 6);
  }, [repoDetails]);

  const contributorData = useMemo(() => {
     if (!repoDetails?.contributors) return [];
     return repoDetails.contributors.slice(0, 10).map(c => ({
         name: c.login,
         contributions: c.contributions
     }));
  }, [repoDetails]);


  const handleConnectGitHub = async () => {
    try {
      if (isGitHubLinked) {
        await signInWithGitHub(false);
      } else {
        await linkGitHub(false);
      }
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to connect GitHub:', err);
      setError("Failed to initiate GitHub connection. Please try again.");
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!window.confirm("Are you sure you want to disconnect GitHub? This will clear your analytics access.")) return;
    try {
      await apiClient.post('/auth/github/disconnect');
      setRepos([]);
      setFilteredRepos([]);
      setRepoDetails(null);
      setError(null);
      // Force user back to connect state
      // Actually, since we're using Firebase auth, we just need to wait for local state to catch up
      // or we can just reload
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to disconnect GitHub:', err);
      setError("Failed to disconnect. Please try again.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-4">
        <Github className="w-16 h-16 opacity-50" />
        <h2 className="text-xl font-semibold">Connect GitHub to view Analytics</h2>
        <button
          onClick={handleConnectGitHub}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium"
        >
          Connect GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[800px] w-full bg-background/50 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl border border-white/5">
      {/* Sidebar List */}
      <div className="w-80 border-r border-white/10 flex flex-col bg-black/20">
        <div className="p-4 border-b border-white/10 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2"><Box className="w-4 h-4" /> Repositories</span>
            <button 
                onClick={handleDisconnectGitHub}
                className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors uppercase tracking-tight"
            >
                Disconnect
            </button>
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search repositories..."
              className="w-full bg-secondary/30 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredRepos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => {
                  if (selectedRepoId === repo.id) return;
                  setRepoDetails(null);
                  setError(null);
                  setLoadingDetails(true);
                  setSelectedRepoId(repo.id);
                }}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 group ${
                  selectedRepoId === repo.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className={`p-2 rounded-md ${selectedRepoId === repo.id ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground group-hover:text-foreground"}`}>
                   <Github className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate ${selectedRepoId === repo.id ? "text-primary" : "text-foreground"}`}>
                        {repo.name}
                    </h4>
                    {repo.owner && (
                        <p className="text-[10px] text-muted-foreground truncate opacity-60">
                           {repo.owner.login}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate opacity-70 mt-0.5">
                         Updated {format(new Date(repo.updated_at), 'MMM dd')}
                    </p>
                </div>
                {selectedRepoId === repo.id && (
                    <motion.div layoutId="active-indicator" className="w-1.5 h-1.5 rounded-full bg-primary box-shadow-glow" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Dashboard */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-background/50 to-background/80 overflow-hidden relative">
        {loadingDetails ? (
           <div className="flex-1 flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
           </div>
        ) : repoDetails ? (
          <ScrollArea className="flex-1">
             <div className="p-8 space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                            {repoDetails.name} 
                            <Badge variant="outline" className="text-xs font-normal bg-secondary/20 border-white/10">
                                {repoDetails.private ? "Private" : "Public"}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground max-w-2xl leading-relaxed">
                            {repoDetails.description || "No description provided."}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <a href={repoDetails.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium">
                            <ExternalLink className="w-4 h-4" /> View on GitHub
                        </a>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KpiCard icon={Star} label="Stars" value={repoDetails.stargazers_count} color="text-yellow-400" />
                    <KpiCard icon={GitPullRequest} label="Forks" value={repoDetails.forks || 0} color="text-purple-400" />
                    <KpiCard icon={Activity} label="Open Issues" value={repoDetails.open_issues || 0} color="text-red-400" />
                    <KpiCard icon={Calendar} label="Created" value={format(new Date(repoDetails.created_at || new Date()), 'MMM yyyy')} color="text-blue-400" isText />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Commits Line Chart */}
                    <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-white/5 bg-black/20">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <GitCommit className="w-5 h-5 text-primary" /> Commit Activity
                        </h3>
                        <div className="h-[300px] w-full">
                            {commitData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={commitData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="#0ea5e9" 
                                        strokeWidth={3} 
                                        dot={{ r: 4, fill: "#0ea5e9", strokeWidth: 2, stroke: "#fff" }} 
                                        activeDot={{ r: 6, fill: "#fff" }} 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground opacity-60">No commit data available</div>
                            )}
                        </div>
                    </div>

                    {/* Left Column Stack */}
                    <div className="space-y-6">
                         {/* Deployments Section */}
                         <div className="glass-panel p-6 rounded-xl border border-white/5 bg-black/20 min-h-[200px]">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Rocket className="w-5 h-5 text-emerald-400" /> Recent Deployments
                            </h3>
                            <ScrollArea className="h-[250px] pr-4">
                                <div className="space-y-3">
                                    {repoDetails.deployments && repoDetails.deployments.length > 0 ? (
                                        repoDetails.deployments.map(dep => (
                                            <div key={dep.id} className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-colors">
                                                <div>
                                                    <p className="text-sm font-medium capitalize flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${dep.state === 'success' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                                                        {dep.environment}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {format(new Date(dep.created_at), 'MMM dd, HH:mm')} by {dep.creator || 'bot'}
                                                    </p>
                                                </div>
                                                <a href={dep.url} target="_blank" className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-md">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm opacity-60 bg-white/5 rounded-lg border-dashed border border-white/10">
                                            <p>No deployments found</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Contributors Bar Chart */}
                    <div className="glass-panel p-6 rounded-xl border border-white/5 bg-black/20">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" /> Top Contributors
                        </h3>
                        <div className="h-[300px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={contributorData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={80} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                    <Bar dataKey="contributions" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Languages Pie Chart */}
                    <div className="glass-panel p-6 rounded-xl border border-white/5 bg-black/20">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Code className="w-5 h-5 text-pink-400" /> Languages
                        </h3>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={languageData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="bytes"
                                    >
                                        {languageData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
             </div>
          </ScrollArea>
        ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Error Loading Analysis</h3>
                <p className="text-muted-foreground max-w-sm mb-6">{error}</p>
                <div className="flex gap-3">
                    {error.includes("not connected") ? (
                        <button 
                            onClick={handleConnectGitHub}
                            className="px-6 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm transition-all font-medium"
                        >
                            Connect GitHub
                        </button>
                    ) : (
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all"
                        >
                            Retry
                        </button>
                    )}
                    <button 
                        onClick={handleDisconnectGitHub}
                        className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-sm transition-all"
                    >
                        Reset Connection
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a repository to view analytics</p>
            </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const KpiCard = ({ icon: Icon, label, value, color, isText }: any) => (
    <div className="glass-panel bg-black/20 border border-white/5 p-4 rounded-xl flex items-center gap-4 hover:border-white/10 transition-colors">
        <div className={`p-3 rounded-lg bg-white/5 ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
    </div>
);

export default GitHubIntegration;
