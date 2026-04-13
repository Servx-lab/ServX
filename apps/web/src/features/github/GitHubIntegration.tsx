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
  Rocket,
  Shield
} from "lucide-react";
import {
  AreaChart,
  Area,
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
  Legend,
  RadialBarChart,
  RadialBar
} from "recharts";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";

import type { RepoSummary } from "@servx/types";
import type { RepoDetails, Deployment, Language } from "./types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { disconnectGitHub } from "./api";
import { useIntegrationRepos, useRepoDetails } from "./hooks";
import { RepositoryAccess } from "./RepositoryAccess";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const GitHubIntegration = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [isAccessPanelOpen, setIsAccessPanelOpen] = useState(false);

  const { linkGitHub, signInWithGitHub, isGitHubLinked, refreshGitHubConnection, githubTokenValid } = useAuth();

  const { repos, setRepos, error: reposError, setError: setReposError, refetch: refetchRepos } = useIntegrationRepos(isAuthenticated, githubTokenValid);
  const {
    repoDetails,
    setRepoDetails,
    loadingDetails,
    error: detailsError,
    setError: setDetailsError,
  } = useRepoDetails(selectedRepoId, repos);

  // Combine errors into a single display value; repos error takes precedence.
  const error = reposError ?? detailsError;

  // Authentication check — waits for Firebase Auth to resolve.
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    if (searchParams.get("token") || searchParams.get("success")) {
      setSearchParams({});
    }

    return () => unsubscribe();
  }, [searchParams, setSearchParams]);

  // Auto-select the first repo once the list loads.
  useEffect(() => {
    if (repos.length > 0 && selectedRepoId === null) {
      setSelectedRepoId(repos[0].id);
    }
  }, [repos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close the access panel whenever a new details fetch starts.
  useEffect(() => {
    if (loadingDetails) setIsAccessPanelOpen(false);
  }, [loadingDetails]);

  // Derived filtered list — useMemo replaces the previous useEffect+state pattern.
  const filteredRepos = useMemo(
    () => repos.filter((repo) => repo.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery, repos],
  );

  // Data preparation for charts
  const commitData = useMemo(() => {
    if (!repoDetails?.commits) return [];
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

  const maxCommitCount = useMemo(() => {
    if (!commitData.length) return 0;
    return Math.max(...commitData.map(d => d.count));
  }, [commitData]);

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGitHub = async () => {
    setIsConnecting(true);
    try {
      if (isGitHubLinked) {
        await refreshGitHubConnection();
      } else {
        await linkGitHub(false);
      }
      
      setReposError(null);
      setDetailsError(null);
      setSelectedRepoId(null);
      await refetchRepos({ forceRefresh: true });
    } catch (err: any) {
      console.error('Failed to connect GitHub:', err);
      setReposError("Failed to initiate GitHub connection. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!window.confirm("Are you sure you want to disconnect GitHub? This will clear your analytics access.")) return;
    try {
      await disconnectGitHub();
      setRepos([]);
      setRepoDetails(null);
      setSelectedRepoId(null);
      setReposError(null);
      setDetailsError(null);
    } catch (err: any) {
      console.error('Failed to disconnect GitHub:', err);
      setReposError("Failed to disconnect. Please try again.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-4">
        <Github className={`w-16 h-16 ${isConnecting ? 'animate-pulse text-blue-500' : 'opacity-50'}`} />
        <h2 className="text-xl font-semibold">Connect GitHub to view Analytics</h2>
        <button
          onClick={handleConnectGitHub}
          disabled={isConnecting}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect GitHub'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden shadow-sm border border-gray-200">
      {/* Sidebar List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50 relative">
        <div className="px-5 py-5 border-b border-gray-200 bg-gray-50">
            <h1 className="text-xl font-bold tracking-tight text-black">
                GitHub Analytics
            </h1>
            <p className="text-gray-500 mt-1 text-xs">
                Manage and analyze your repositories.
            </p>
        </div>

        <div className="p-4 border-b border-gray-200 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-2"><Box className="w-4 h-4" /> Repositories</span>
            <button 
                onClick={handleDisconnectGitHub}
                className="text-xs text-red-500 hover:text-red-600 transition-colors uppercase tracking-tight font-medium"
            >
                Disconnect
            </button>
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all text-black placeholder:text-gray-400"
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
                  setIsAccessPanelOpen(false);
                  setSelectedRepoId(repo.id);
                }}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 group ${
                  selectedRepoId === repo.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-100 border border-transparent"
                }`}
              >
                <div className={`p-2 rounded-md ${selectedRepoId === repo.id ? "bg-blue-100 text-blue-600" : "bg-white text-gray-400 group-hover:text-black border border-gray-200"}`}>
                   <Github className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate ${selectedRepoId === repo.id ? "text-blue-600" : "text-black"}`}>
                        {repo.name}
                    </h4>
                    {repo.owner && (
                        <p className="text-[10px] text-gray-500 truncate opacity-80">
                           {repo.owner.login}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 truncate opacity-80 mt-0.5">
                         Updated {format(new Date(repo.updated_at), 'MMM dd')}
                    </p>
                </div>
                {selectedRepoId === repo.id && (
                    <motion.div layoutId="active-indicator" className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Dashboard */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {loadingDetails ? (
           <div className="flex-1 flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
           </div>
        ) : repoDetails ? (
          <ScrollArea className="flex-1">
             <div className="p-8 space-y-8 pb-20 pt-6">
                {/* Header Section */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3 text-black">
                            {repoDetails.name} 
                            <Badge variant="outline" className="text-xs font-normal bg-gray-50 border-gray-200 text-gray-500">
                                {repoDetails.private ? "Private" : "Public"}
                            </Badge>
                        </h1>
                        <p className="text-gray-500 max-w-2xl leading-relaxed">
                            {repoDetails.description || "No description provided."}
                        </p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {repoDetails.isOwner !== false && (
                            <button 
                                onClick={() => setIsAccessPanelOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors text-sm font-medium"
                            >
                                <Shield className="w-4 h-4" /> Manage Access
                            </button>
                        )}
                        <a href={repoDetails.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors text-sm font-medium text-black">
                            <ExternalLink className="w-4 h-4" /> View on GitHub
                        </a>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Top Row: Commits and Contributors side-by-side */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                        {/* Commits Bar Chart (Wide-ish) */}
                        <div className="xl:col-span-7 glass-panel p-6 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-black">
                                <GitCommit className="w-5 h-5 text-blue-500" /> Commit Activity
                            </h3>
                            <div className="flex-1 min-h-[300px] w-full">
                                {commitData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={commitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                        <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                            itemStyle={{ color: '#000' }}
                                        />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {commitData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.count === maxCommitCount ? '#3B82F6' : '#9CA3AF'} 
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-gray-400">No commit data available</div>
                                )}
                            </div>
                        </div>

                        {/* Contributor Activity (Right side of top row) */}
                        <div className="xl:col-span-5 glass-panel p-6 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-black">
                                <Users className="w-5 h-5 text-red-500" /> Contributor Activity
                            </h3>
                            <div className="flex-1 min-h-[300px] w-full">
                                 {contributorData.length > 0 ? (
                                 <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={contributorData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                        <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                            itemStyle={{ color: '#000' }}
                                        />
                                        <Area 
                                            type="stepAfter" 
                                            dataKey="contributions" 
                                            stroke="#EF4444" 
                                            strokeWidth={2}
                                            fillOpacity={1} 
                                            fill="url(#colorRed)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-gray-400">No contributor data</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Language Distribution (Wide) and Deployments side-by-side */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* Combined Language Analysis (Radial + Horizontal) */}
                        <div className="lg:col-span-8 glass-panel p-6 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                             <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-black">
                                <Code className="w-5 h-5 text-green-500" /> Language Distribution
                            </h3>
                            
                            <div className="flex-1 flex gap-12 min-h-[300px]">
                                {/* Left Side: Radial Chart */}
                                <div className="flex-[1.3] flex flex-col items-center justify-center border-r border-gray-100 pr-6 gap-2">
                                    {languageData.length > 0 ? (
                                        <>
                                            <div className="w-full h-full min-h-[220px] relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadialBarChart 
                                                        innerRadius="30%" 
                                                        outerRadius="100%" 
                                                        data={[...languageData].reverse().map((l, i) => {
                                                            const colors = ['#A855F7', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#9CA3AF'];
                                                            const originalIndex = languageData.length - 1 - i;
                                                            return {
                                                                name: l.name,
                                                                value: l.bytes,
                                                                fill: colors[originalIndex % 6]
                                                            };
                                                        })} 
                                                        startAngle={180} 
                                                        endAngle={-180}
                                                    >
                                                        <RadialBar
                                                            background
                                                            dataKey="value"
                                                            cornerRadius={10}
                                                        />
                                                        <Tooltip 
                                                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                                            itemStyle={{ color: '#000' }}
                                                        />
                                                    </RadialBarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex flex-col items-center justify-center text-center mt-2">
                                                <span className="text-xl font-bold text-black leading-none">{languageData[0]?.name}</span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-tighter font-semibold mt-1">Main Development</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-gray-400 text-xs">No language data</div>
                                    )}
                                </div>

                                {/* Right Side: Horizontal Bars */}
                                <div className="flex-[2.3] flex flex-col justify-center space-y-5">
                                     {languageData.length > 0 ? (
                                        languageData.map((entry, index) => {
                                            const colors = ['#A855F7', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#9CA3AF'];
                                            const barColor = colors[index % colors.length];
                                            const totalBytes = languageData.reduce((acc, curr) => acc + curr.bytes, 0);
                                            const percentage = ((entry.bytes / totalBytes) * 100).toFixed(1);
                                            
                                            return (
                                                <div key={entry.name} className="space-y-1.5 group">
                                                    <div className="flex justify-between items-center px-0.5">
                                                        <span className="text-xs font-bold text-gray-700 group-hover:text-black transition-colors">{entry.name}</span>
                                                        <span className="text-[10px] font-semibold text-gray-400">{percentage}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative border border-gray-50/50">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percentage}%` }}
                                                            transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                                                            className="h-full rounded-full shadow-sm"
                                                            style={{ backgroundColor: barColor }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-gray-400 text-xs text-center">N/A</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Deployments Section (Right side) */}
                        <div className="lg:col-span-4 glass-panel p-6 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
                             <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-black">
                                <Rocket className="w-5 h-5 text-yellow-500" /> Recent Deployments
                            </h3>
                            <ScrollArea className="flex-1 pr-1">
                                <div className="space-y-3">
                                    {repoDetails.deployments && repoDetails.deployments.length > 0 ? (
                                        repoDetails.deployments.map(dep => (
                                            <div key={dep.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between group hover:border-yellow-300 transition-colors">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {dep.creator_avatar && (
                                                        <img src={dep.creator_avatar} alt={dep.creator || ''} className="w-7 h-7 rounded-full flex-shrink-0 border border-gray-200" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold capitalize flex items-center gap-1.5 text-black">
                                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dep.state === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                            {dep.environment}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 mt-0.5 truncate uppercase tracking-tighter">
                                                            {format(new Date(dep.created_at), 'MMM dd')} • {dep.creator || 'bot'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <a href={dep.url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white hover:shadow-sm rounded-md flex-shrink-0 text-gray-500 border border-transparent hover:border-gray-200">
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs bg-gray-50/50 rounded-lg border-dashed border border-gray-200">
                                            <Rocket className="w-8 h-8 opacity-10 mb-2" />
                                            <p>No deployments</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                    <KpiCard icon={Star} label="Stars" value={repoDetails.stars} color="text-yellow-500" />
                    <KpiCard icon={GitPullRequest} label="Forks" value={repoDetails.forks} color="text-purple-500" />
                    <KpiCard icon={Activity} label="Open Issues" value={repoDetails.open_issues} color="text-red-500" />
                    <KpiCard icon={Calendar} label="Created" value={format(new Date(repoDetails.created_at || new Date()), 'MMM yyyy')} color="text-blue-500" isText />
                </div>
             </div>
          </ScrollArea>
        ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-black">Error Loading Analysis</h3>
                <p className="text-gray-500 max-w-sm mb-6">{error}</p>
                <div className="flex gap-3">
                    {error.includes("not connected") || error.includes("expired") || error.includes("Unauthorized") ? (
                        <button 
                            onClick={handleConnectGitHub}
                            disabled={isConnecting}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-all font-medium shadow-sm disabled:opacity-50"
                        >
                            {isConnecting ? 'Connecting...' : 'Reconnect GitHub'}
                        </button>
                    ) : (
                        <button 
                            onClick={() => { setReposError(null); setDetailsError(null); refetchRepos({ forceRefresh: true }); }}
                            className="px-6 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm transition-all text-black shadow-sm"
                        >
                            Retry
                        </button>
                    )}
                    <button 
                        onClick={handleDisconnectGitHub}
                        className="px-6 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm transition-all"
                    >
                        Reset Connection
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a repository to view analytics</p>
            </div>
        )}

        {/* Sliding Access Panel Overlay & Panel */}
        <AnimatePresence>
            {isAccessPanelOpen && repoDetails && (
                <>
                    {/* Backdrop to detect clicks outside */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAccessPanelOpen(false)}
                        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-40"
                    />
                    
                    {/* Sliding Panel */}
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute right-0 top-0 bottom-0 w-96 border-l border-gray-200 z-50 shadow-2xl bg-white"
                    >
                        <RepositoryAccess 
                            repoName={repoDetails.full_name} 
                            ownerLogin={repoDetails.owner?.login}
                            contributors={repoDetails.contributors || []} 
                            onClose={() => setIsAccessPanelOpen(false)}
                        />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper component
const KpiCard = ({ icon: Icon, label, value, color, isText }: any) => (
    <div className="glass-panel bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-4 hover:border-blue-200 transition-colors shadow-sm">
        <div className={`p-3 rounded-lg bg-gray-50 border border-gray-100 ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold tracking-tight text-black">{value}</p>
        </div>
    </div>
);

export default GitHubIntegration;
