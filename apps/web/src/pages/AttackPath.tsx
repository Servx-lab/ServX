import React, { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, 
  Target, 
  Shield, 
  Zap, 
  AlertCircle, 
  ChevronDown, 
  LayoutDashboard, 
  X 
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

const AttackPath = () => {
    const { user } = useAuth();
    const [scanUrl, setScanUrl] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState<any>(null);
    const [securityScore, setSecurityScore] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [projectGroups, setProjectGroups] = useState<any[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [isMergeMode, setIsMergeMode] = useState(false);
    const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);

    const getProjectName = (name: string) => {
        // Strip common suffixes and clean up
        return name
            .toLowerCase()
            .replace(/\.vercel\.app$/, '')
            .replace(/\.onrender\.com$/, '')
            .replace(/-(frontend|backend|api|ui|repo)$/, '')
            .replace(/[0-9]{5,}$/, '') // Strip long hash-like numbers
            .replace(/-/g, ' ')
            .trim();
    };

    const clusterAssets = (hosting: any[], gitRepos: any[], savedGroups: any[]) => {
        const groups: any[] = [...savedGroups];
        const groupedIds = new Set(savedGroups.flatMap(g => g.assets.map((a: any) => a.id)));

        // 1. Process Hosting Services
        hosting.forEach(s => {
            if (groupedIds.has(s.id)) return;
            const pName = getProjectName(s.name);
            let group = groups.find(g => g.name.toLowerCase() === pName.toLowerCase());
            
            const assetItem = { type: 'hosting', id: s.id, name: s.name, provider: s.provider, url: s.url || s.websiteUrl };
            if (group) {
                group.assets.push(assetItem);
            } else {
                groups.push({ id: `temp-${s.id}`, name: pName.toUpperCase(), assets: [assetItem], isTemp: true });
            }
        });

        // 2. Process Repos
        gitRepos.forEach(r => {
            if (groupedIds.has(String(r.id))) return;
            const pName = getProjectName(r.name);
            let group = groups.find(g => g.name.toLowerCase() === pName.toLowerCase());

            const assetItem = { type: 'repo', id: String(r.id), name: r.name, url: r.html_url };
            if (group) {
                group.assets.push(assetItem);
            } else {
                groups.push({ id: `temp-${r.id}`, name: pName.toUpperCase(), assets: [assetItem], isTemp: true });
            }
        });

        return groups;
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [repoRes, groupsRes] = await Promise.all([
                apiClient.get('/github/repos'),
                apiClient.get('/security/groups')
            ]);
            
            const providers = ['render', 'vercel'];
            const allServices: any[] = [];
            for (const p of providers) {
                try {
                    const hRes = await apiClient.get(`/connections/hosting/${p}/status`);
                    if (hRes.data.connected && hRes.data.services) {
                        allServices.push(...hRes.data.services.map((s: any) => ({ ...s, provider: p })));
                    }
                } catch (e) {}
            }

            const clustered = clusterAssets(allServices, repoRes.data, groupsRes.data);
            setProjectGroups(clustered);

            // Auto-detect scan URL
            if (allServices.length > 0) {
                const firstUrl = allServices[0].url || allServices[0].websiteUrl || allServices[0].deployments?.[0]?.url;
                if (firstUrl) setScanUrl(firstUrl);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const runScan = async (target?: any) => {
        // Fix for "Converting circular structure to JSON"
        // If target exists and isn't a string, it might be a React Event object
        const urlToScan = (typeof target === 'string' ? target : null) || scanUrl;
        
        if (!urlToScan || typeof urlToScan !== 'string') return;
        
        setIsScanning(true);
        try {
            const res = await apiClient.post('/security/scan-target', { url: urlToScan });
            setScanResults(res.data);
            setSecurityScore(res.data.score);
        } catch (err) {
            console.error('Scan failed:', err);
        } finally {
            setIsScanning(false);
        }
    };

    const toggleMergeMode = () => {
        setIsMergeMode(!isMergeMode);
        setSelectedForMerge([]);
    };

    const handleMerge = async () => {
        if (selectedForMerge.length < 2) return;
        const name = prompt("Enter a name for this project group:", "New Project Block");
        if (!name) return;

        const assetsToMerge: any[] = [];
        projectGroups.forEach(g => {
            if (selectedForMerge.includes(g.id)) {
                assetsToMerge.push(...g.assets);
            }
        });

        try {
            await apiClient.post('/security/groups', {
                name,
                assets: assetsToMerge
            });
            fetchData();
            setIsMergeMode(false);
            setSelectedForMerge([]);
        } catch (err) {
            alert('Failed to save group');
        }
    };

    const toggleGroupExpansion = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const addAssetToGroup = async (groupId: string, asset: any) => {
        const group = projectGroups.find(g => g.id === groupId);
        if (!group) return;

        const updatedAssets = [...group.assets, { ...asset, role: 'none' }];

        try {
            await apiClient.post('/security/groups', {
                id: group.isTemp ? undefined : group.id,
                name: group.name,
                assets: updatedAssets
            });
            fetchData();
        } catch (err) {
            alert('Failed to add asset to group');
        }
    };

    const updateAssetRole = async (groupId: string, assetId: string, role: string) => {
        const group = projectGroups.find(g => g.id === groupId);
        if (!group) return;

        const updatedAssets = group.assets.map((a: any) => 
            a.id === assetId ? { ...a, role: role === a.role ? 'none' : role } : a
        );

        try {
            await apiClient.post('/security/groups', {
                id: group.isTemp ? undefined : group.id,
                name: group.name,
                assets: updatedAssets
            });
            fetchData();
        } catch (err) {
            alert('Failed to update asset role');
        }
    };

    const handleRenameGroup = async (group: any) => {
        const newName = prompt("Rename Project Group:", group.name);
        if (!newName || newName === group.name) return;

        try {
            await apiClient.post('/security/groups', {
                id: group.isTemp ? undefined : group.id,
                name: newName,
                assets: group.assets
            });
            fetchData();
        } catch (err) {
            alert('Failed to rename group');
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (groupId.startsWith('temp-')) return;
        if (!confirm("Are you sure you want to unsave this group? assets will return to auto-matching.")) return;

        try {
            await apiClient.delete(`/security/groups/${groupId}`);
            fetchData();
        } catch (err) {
            alert('Failed to delete group');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 p-8 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Security Command Center</h1>
                    <p className="text-xs text-slate-400 font-medium tracking-widest uppercase mt-1">Dynamic Target Analyzer v4.0</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <input 
                        type="text" 
                        placeholder="Enter Target URL (Vercel/Render)..." 
                        className="bg-transparent border-none outline-none px-4 py-2 text-sm w-64"
                        value={scanUrl}
                        onChange={(e) => setScanUrl(e.target.value)}
                    />
                    <button 
                        onClick={() => runScan()}
                        disabled={isScanning}
                        className="bg-[#00C2CB] hover:bg-[#00AFB8] text-white px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                        {isScanning ? 'Scanning...' : 'Launch Simulation'}
                    </button>
                </div>
            </div>

            <div className="flex gap-8 flex-1 overflow-hidden">
                {/* Left Sidebar: Live Now */}
                <div className="w-80 flex flex-col gap-4 h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-tighter text-lg">
                            Live Hub <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={toggleMergeMode}
                                className={`p-1.5 rounded-md border transition-all ${isMergeMode ? 'bg-[#00C2CB] text-white border-[#00C2CB]' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                title={isMergeMode ? "Cancel Merging" : "Merge Projects"}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                            </button>
                            <div className="p-1.5 rounded-md bg-white border border-slate-200"><Shield className="h-4 w-4 text-slate-400" /></div>
                        </div>
                    </div>

                    {isMergeMode && (
                        <div className="bg-[#00C2CB]/5 border border-[#00C2CB]/20 p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                            <span className="text-[10px] font-bold text-[#00C2CB] uppercase tracking-wider">{selectedForMerge.length} selected</span>
                            <button 
                                onClick={handleMerge}
                                disabled={selectedForMerge.length < 2}
                                className="bg-[#00C2CB] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all"
                            >
                                Merge Selection
                            </button>
                        </div>
                    )}

                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 gap-3 opacity-50">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Syncing Assets...</span>
                            </div>
                        ) : (
                            <>
                                {projectGroups.map((group, i) => (
                                    <div 
                                        key={group.id} 
                                        className={`bg-white p-4 rounded-2xl border transition-all ${
                                            isMergeMode && selectedForMerge.includes(group.id) 
                                            ? 'border-[#00C2CB] ring-2 ring-[#00C2CB]/10 shadow-md' 
                                            : 'border-slate-100 shadow-sm hover:shadow-md'
                                        }`}
                                        onClick={() => {
                                            if (isMergeMode) {
                                                setSelectedForMerge(prev => 
                                                    prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
                                                );
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleGroupExpansion(group.id); }}
                                                    className={`transition-transform duration-200 ${expandedGroups.has(group.id) ? 'rotate-180' : ''}`}
                                                >
                                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                                </button>
                                                <div className={`h-6 w-1 rounded-full ${group.isTemp ? 'bg-slate-200' : 'bg-[#00C2CB]'}`} />
                                                <span className="font-black text-sm text-slate-900 truncate tracking-tight">
                                                    {group.name}
                                                </span>
                                            </div>
                                            {!isMergeMode && (
                                                <div className="flex items-center gap-2">
                                                    {/* Settings removed per request */}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className={`space-y-4 px-1 pb-4 transition-all duration-300 ${expandedGroups.has(group.id) ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                            {/* Current Group Assets */}
                                            <div className="space-y-2">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Assigned Resources</div>
                                                {group.assets.length === 0 && <p className="text-[10px] text-slate-400 italic pl-1">No assets assigned.</p>}
                                                {group.assets.map((asset: any, j: number) => (
                                                    <div 
                                                        key={`${asset.type}-${asset.id}`}
                                                        className="p-3 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group/item"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <span className="text-[9px] font-black text-[#00C2CB] uppercase shrink-0">
                                                                    {asset.type === 'hosting' ? 'Deploy' : 'Repo'}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-900 truncate">
                                                                    {asset.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateAssetRole(group.id, asset.id, 'frontend'); }}
                                                                    className={`text-[9px] font-black px-2 py-0.5 rounded-lg transition-colors ${asset.role === 'frontend' ? 'bg-[#00C2CB] text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    FE
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateAssetRole(group.id, asset.id, 'backend'); }}
                                                                    className={`text-[9px] font-black px-2 py-0.5 rounded-lg transition-colors ${asset.role === 'backend' ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    BE
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); updateAssetRole(group.id, asset.id, 'none'); }}
                                                                    className="p-1 hover:bg-red-50 text-slate-200 hover:text-red-400 rounded-md transition-colors ml-1"
                                                                    title="Remove from project"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] text-slate-400 truncate max-w-[140px] italic">{asset.url || 'Internal Source'}</span>
                                                            {asset.url && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setScanUrl(asset.url); }}
                                                                    className="text-[10px] font-bold text-[#00C2CB] hover:underline uppercase tracking-tighter"
                                                                >
                                                                    Target URL
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Asset Section */}
                                            <div className="pt-2 border-t border-slate-100">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Loose Assets (Add to Project)</div>
                                                <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                                                    {projectGroups
                                                        .filter(g => g.isTemp && g.id !== group.id)
                                                        .flatMap(g => g.assets)
                                                        .map((asset: any) => (
                                                            <button 
                                                                key={asset.id}
                                                                onClick={(e) => { e.stopPropagation(); addAssetToGroup(group.id, asset); }}
                                                                className="w-full flex items-center justify-between p-2 rounded-xl border border-dashed border-slate-200 hover:border-[#00C2CB] hover:bg-[#00C2CB]/5 transition-all text-left group/add"
                                                            >
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className="h-1 w-1 rounded-full bg-slate-300 group-hover/add:bg-[#00C2CB]" />
                                                                    <span className="text-[11px] text-slate-500 group-hover/add:text-slate-900 truncate font-medium">{asset.name}</span>
                                                                </div>
                                                                <div className="text-[10px] font-black text-slate-300 group-hover/add:text-[#00C2CB] transition-colors">+ ADD</div>
                                                            </button>
                                                        ))
                                                    }
                                                    {projectGroups.filter(g => g.isTemp).length === 0 && (
                                                        <p className="text-[10px] text-slate-300 italic pl-1">No loose assets to add.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {!expandedGroups.has(group.id) && (
                                            <div className="mt-2 flex gap-1 overflow-hidden h-1.5">
                                                {group.assets.map((a: any, j: number) => (
                                                    <div 
                                                        key={j} 
                                                        className={`h-full flex-1 rounded-full ${
                                                            a.role === 'frontend' ? 'bg-[#00C2CB]' : a.role === 'backend' ? 'bg-blue-400' : 'bg-slate-100'
                                                        }`} 
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {!isMergeMode && (
                                            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${group.isTemp ? 'text-slate-300' : 'text-[#00C2CB]'}`}>
                                                    {group.isTemp ? 'AUTO-MATCHED' : 'SAVED CLUSTER'}
                                                </span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const primary = group.assets.find((a: any) => a.url)?.url;
                                                        if (primary) runScan(primary);
                                                    }}
                                                    className="text-[9px] font-black text-slate-400 hover:text-[#00C2CB] uppercase tracking-widest transition-colors"
                                                >
                                                    Scan Group
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {projectGroups.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-12 italic">No assets detected.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Center: Circular Visualization */}
                <div className="flex-1 flex items-center justify-center relative">
                    {/* The Circular Dashboard */}
                    <div className="relative w-[500px] h-[500px] flex items-center justify-center">
                        {/* Semi-circular Ring Overlay */}
                        <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center">
                            {[...Array(60)].map((_, i) => {
                                const angle = (i / 60) * Math.PI - Math.PI/2;
                                return (
                                    <div 
                                        key={i} 
                                        className={`w-5 h-[2px] transition-all ${i < 40 ? 'bg-blue-400 opacity-100' : 'bg-slate-200 opacity-30'}`}
                                        style={{ 
                                            position: 'absolute',
                                            transform: `rotate(${angle}rad) translate(280px)`,
                                            transformOrigin: '0 0'
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {/* Central Hub */}
                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                            {/* Inner Bubbles */}
                            <div 
                                className="absolute bg-white border border-slate-100 shadow-2xl rounded-full flex flex-col items-center justify-center p-8 transition-all hover:scale-105 duration-500"
                                style={{ width: '180px', height: '180px', zIndex: 30 }}
                            >
                                <span className="text-blue-500 text-xs font-bold flex items-center gap-1 mb-1">32% <Zap className="h-3 w-3" /></span>
                                <span className="text-[11px] font-black text-slate-900 text-center uppercase leading-tight">Malicious AJAX<br />Code Execution</span>
                            </div>

                            {/* Orbiting Bubbles */}
                            {[
                                { label: "Windows Macros", pct: "15%", top: '10%', left: '35%' },
                                { label: "DDoS", pct: "6%", top: '15%', right: '25%' },
                                { label: "Company Size", pct: "8%", top: '35%', right: '10%' },
                                { label: "Domain Shadowing", pct: "13%", right: '10%', top: '60%' },
                                { label: "SQL Injection Attack", pct: "8%", bottom: '15%', left: '35%' },
                                { label: "Password Harvesting", pct: "23%", bottom: '25%', left: '55%' },
                                { label: "Malvertising", pct: "6%", bottom: '35%', left: '15%' },
                                { label: "XML Poisoning", pct: "17%", top: '50%', left: '5%' },
                                { label: "Buffer Overflow", pct: "5%", bottom: '40%', right: '15%' },
                            ].map((b, i) => (
                                <div 
                                    key={i} 
                                    className="absolute bg-white border border-slate-50 shadow-md rounded-full flex flex-col items-center justify-center transition-all hover:shadow-lg hover:-translate-y-1"
                                    style={{ 
                                        width: '90px', height: '90px', 
                                        top: b.top, left: b.left, right: b.right, bottom: b.bottom 
                                    }}
                                >
                                    <span className="text-slate-400 text-[10px] font-bold flex items-center gap-0.5">{b.pct} <Zap className="h-2 w-2" /></span>
                                    <span className="text-[9px] font-bold text-slate-700 text-center uppercase leading-none px-2">{b.label}</span>
                                </div>
                            ))}

                            {/* Faint Dotted Guide Ring */}
                            <div className="absolute inset-0 rounded-full border border-dashed border-slate-200 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Right: Security Score */}
                <div className="w-64 flex flex-col items-end">
                    <div className="text-right mb-12">
                        <div className="flex items-baseline gap-2 justify-end">
                            <span className="text-7xl font-black text-slate-900 tracking-tighter">
                                {isScanning ? '--' : (securityScore ?? '--')}
                            </span>
                            <span className="text-2xl font-bold text-slate-300">/100</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Security Score</p>
                    </div>

                    {/* Bar Stats */}
                    <div className="flex flex-col gap-4 w-full items-end">
                        {[28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2].map((val, i) => (
                            <div key={i} className="flex items-center gap-3 w-full justify-end">
                                <span className="text-[10px] font-bold text-slate-300 w-4">{val}</span>
                                <div className="h-2 rounded-full bg-white/5 flex-1 relative overflow-hidden">
                                    <div 
                                        className={`absolute inset-y-0 left-0 transition-all duration-1000 ${
                                            i < 4 ? 'bg-[#EF4444]' : i < 10 ? 'bg-[#6C63FF]' : 'bg-[#00C2CB]'
                                        }`}
                                        style={{ width: `${Math.random() * 80 + 20}%` }} 
                                    />
                                    {/* Stripes over bar */}
                                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                                        backgroundImage: 'linear-gradient(45deg, transparent 25%, #000 25%, #000 50%, transparent 50%, transparent 75%, #000 75%)',
                                        backgroundSize: '4px 4px'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results Overlay */}
            {scanResults && (
                <div className="fixed bottom-8 right-8 z-[100] w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-900 flex items-center gap-2">
                             <AlertCircle className="h-5 w-5 text-red-500" />
                             Scan Findings
                        </h3>
                        <button onClick={() => setScanResults(null)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="h-4 w-4 text-slate-400" /></button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                        {scanResults.findings.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No leaked secrets detected. High security integrity.</p>
                        ) : (
                            scanResults.findings.map((f: any, i: number) => (
                                <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{f.type}</span>
                                        <span className="h-1 w-1 rounded-full bg-red-300" />
                                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{f.pattern}</span>
                                    </div>
                                    <p className="text-xs text-red-900 font-mono break-all">{f.context}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttackPath;
