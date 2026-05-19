import React, { useEffect, useState, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Github, Server, Database, Loader2, Globe, Box, Shield, Save, X } from "lucide-react";
import { toast } from "sonner";
import { getPermissions, updatePermissions, getAdminResources } from "./api";
import type { AccessPermissions, AdminResource, GranularAllow, GlobalPermissions } from "./types";

function buildFullAllow(resources: AdminResource): GranularAllow {
  const allRepoKeys = resources.repos.map((r) => r.full_name);
  const allServerIds = [
    ...resources.repos.flatMap(r => r.deployments.map(d => d.id)),
    ...resources.standaloneDeployments.map(d => d.id)
  ];
  const allDbIds = resources.databases.map((d) => d.id);

  return {
    repoKeys: allRepoKeys,
    serverIds: allServerIds,
    databaseIds: allDbIds,
  };
}

function isAllowed(
  key: string,
  list: string[] | undefined | null,
  fallbackFull: boolean
): boolean {
  if (list == null) return fallbackFull;
  return list.includes(key);
}

interface GranularAccessPanelProps {
  userUid: string;
  userEmail: string;
  onClose: () => void;
}

const GranularAccessPanel: React.FC<GranularAccessPanelProps> = ({
  userUid,
  userEmail,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<AccessPermissions | null>(null);
  const [resources, setResources] = useState<AdminResource | null>(null);
  const [ga, setGa] = useState<GranularAllow | null>(null);
  
  // Local UI state to track if "Deployment Access" master toggle is on for a repo
  const [deploymentsEnabledMap, setDeploymentsEnabledMap] = useState<Record<string, boolean>>({});

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Immediately scroll into view when expanded
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  // Smooth scroll into view when finished loading and height increases
  useEffect(() => {
    if (!loading && containerRef.current) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [permRes, resData] = await Promise.all([
          getPermissions(userUid),
          getAdminResources(),
        ]);
        if (cancelled) return;
        
        const perm = permRes.permissions;
        setPermissions(perm);
        setResources(resData);
        
        const initial =
          perm.granularAllow != null
            ? {
                repoKeys: [...(perm.granularAllow.repoKeys ?? [])],
                serverIds: [...(perm.granularAllow.serverIds ?? [])],
                databaseIds: [...(perm.granularAllow.databaseIds ?? [])],
              }
            : buildFullAllow(resData);
        setGa(initial);

        // Initialize deploymentsEnabledMap based on if any deployment for a repo is already allowed
        const initialMap: Record<string, boolean> = {};
        resData.repos.forEach(repo => {
          const hasAnyDeployment = repo.deployments.some(d => initial.serverIds?.includes(d.id));
          initialMap[repo.full_name] = hasAnyDeployment || (perm.granularAllow == null);
        });
        setDeploymentsEnabledMap(initialMap);

      } catch {
        toast.error("Failed to load access settings");
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userUid]); // Stable dependency array to prevent unwanted reloading on parent re-renders!

  const fallbackFull = useMemo(() => {
    const p = permissions?.granularAllow;
    return p == null;
  }, [permissions]);

  const toggleRepo = (fullName: string, on: boolean) => {
    setGa((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.repoKeys ?? []);
      if (on) next.add(fullName);
      else next.delete(fullName);
      return { ...prev, repoKeys: Array.from(next) };
    });
  };

  const toggleServer = (id: string, on: boolean) => {
    setGa((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.serverIds ?? []);
      if (on) next.add(id);
      else next.delete(id);
      return { ...prev, serverIds: Array.from(next) };
    });
  };

  const toggleDb = (id: string, on: boolean) => {
    setGa((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.databaseIds ?? []);
      if (on) next.add(id);
      else next.delete(id);
      return { ...prev, databaseIds: Array.from(next) };
    });
  };

  const handleSave = async () => {
    if (!permissions || !ga) return;
    setSaving(true);
    try {
      const next: AccessPermissions = {
        ...permissions,
        granularAllow: {
          repoKeys: [...(ga.repoKeys ?? [])],
          serverIds: [...(ga.serverIds ?? [])],
          databaseIds: [...(ga.databaseIds ?? [])],
        },
      };
      await updatePermissions({ userId: userUid, permissions: next });
      toast.success("Access updated successfully");
      onClose();
    } catch {
      toast.error("Failed to save access settings");
    } finally {
      setSaving(false);
    }
  };

  const repoAllowed = (full: string) =>
    isAllowed(full, ga?.repoKeys ?? null, fallbackFull);
  const serverAllowed = (id: string) =>
    isAllowed(id, ga?.serverIds ?? null, fallbackFull);
  const dbAllowed = (id: string) =>
    isAllowed(id, ga?.databaseIds ?? null, fallbackFull);

  const toggleGlobalArea = (area: keyof Pick<GlobalPermissions, 'canAccessHosting' | 'canAccessGithub' | 'canAccessDatabases'>, on: boolean) => {
    setPermissions(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        global: {
          ...prev.global,
          [area]: on
        }
      };
    });
  };

  if (loading || !resources || !ga) {
    return (
      <div ref={containerRef} className="scroll-mt-28 flex items-center justify-center gap-3 py-12 text-slate-500 bg-slate-50/40 rounded-2xl border border-slate-100 animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
        <span className="text-xs font-semibold tracking-wide">Loading granular permissions for {userEmail}…</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="scroll-mt-28 bg-slate-50/50 rounded-2xl border border-slate-100 p-6 md:p-8 space-y-8 animate-[slideDown_0.2s_ease-out]">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-600" /> Granular Access Panel
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Configure target visibility and workspace module permissions for <span className="text-slate-600 font-bold">{userEmail}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs font-bold gap-1 border-slate-200 hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" /> Collapse
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
            className="h-8 text-xs font-bold gap-1 bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Global Module Controls */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
        <div>
          <h4 className="text-xs font-bold text-slate-700">Global Permissions</h4>
          <p className="text-[10px] text-slate-400 font-semibold">Toggle general access to high-level system modules.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-50 bg-slate-50/50 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">GitHub Portal</span>
              <span className="text-[9px] text-slate-400 font-semibold">Repositories & Commits</span>
            </div>
            <Switch
              checked={permissions?.global.canAccessGithub ?? false}
              onCheckedChange={(c) => toggleGlobalArea('canAccessGithub', c)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-50 bg-slate-50/50 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">Hosting & Servers</span>
              <span className="text-[9px] text-slate-400 font-semibold">Deployments & Hosting</span>
            </div>
            <Switch
              checked={permissions?.global.canAccessHosting ?? false}
              onCheckedChange={(c) => toggleGlobalArea('canAccessHosting', c)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-50 bg-slate-50/50 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">Databases</span>
              <span className="text-[9px] text-slate-400 font-semibold">Databases & S3 Backups</span>
            </div>
            <Switch
              checked={permissions?.global.canAccessDatabases ?? false}
              onCheckedChange={(c) => toggleGlobalArea('canAccessDatabases', c)}
            />
          </div>
        </div>
      </div>

      {/* Granular Toggles - 2.5 : 1.5 Ratio Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Infrastructure & Apps (flex-[2.5]) */}
        <div className="flex-[2.5] space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Box className="h-4 w-4 text-cyan-600" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Infrastructure & Apps</h4>
          </div>
          
          <Accordion type="multiple" className="space-y-2">
            {resources.repos.map((repo) => (
              <AccordionItem
                key={repo.full_name}
                value={repo.full_name}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
              >
                <AccordionTrigger className="px-4 py-3 text-left hover:no-underline [&[data-state=open]]:bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <Github className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-800">{repo.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">{repo.full_name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pb-4 pt-2 bg-slate-50/20 border-t border-slate-100">
                  {/* Repo Master Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <span className="text-xs font-bold text-slate-700">GH Graph Access</span>
                      <Switch
                        checked={repoAllowed(repo.full_name)}
                        onCheckedChange={(c) => toggleRepo(repo.full_name, c)}
                        disabled={!permissions?.global.canAccessGithub}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <span className="text-xs font-bold text-slate-700">Deployment Access</span>
                      <Switch
                        checked={deploymentsEnabledMap[repo.full_name] ?? false}
                        onCheckedChange={(c) => {
                          setDeploymentsEnabledMap(prev => ({ ...prev, [repo.full_name]: c }));
                          if (!c) {
                            const repoDeplIds = repo.deployments.map(d => d.id);
                            setGa(prev => {
                              if (!prev) return prev;
                              const nextIds = (prev.serverIds ?? []).filter(id => !repoDeplIds.includes(id));
                              return { ...prev, serverIds: nextIds };
                            });
                          }
                        }}
                        disabled={!permissions?.global.canAccessHosting}
                      />
                    </div>
                  </div>

                  {/* Nested Deployments */}
                  {repo.deployments.length > 0 && (
                    <div className={`space-y-2 ${!deploymentsEnabledMap[repo.full_name] ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Available Deployments</p>
                      <div className="grid grid-cols-1 gap-2">
                        {repo.deployments.map((depl) => (
                          <div key={depl.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 hover:bg-slate-50/50 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{depl.name}</span>
                              <span className="text-[9px] text-slate-400 font-semibold uppercase">{depl.provider}</span>
                            </div>
                            <Switch
                              checked={serverAllowed(depl.id)}
                              onCheckedChange={(c) => toggleServer(depl.id, c)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Right Column: Standalone Deployments & Databases (flex-[1.5]) */}
        <div className="flex-[1.5] space-y-6">
          {/* Standalone Deployments */}
          {resources.standaloneDeployments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Globe className="h-4 w-4 text-cyan-600" />
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Standalone Deployments</h4>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-2 shadow-sm">
                {resources.standaloneDeployments.map((depl) => (
                  <div key={depl.id} className="flex items-center justify-between rounded-lg border border-slate-50 bg-slate-50/50 px-3 py-2 hover:bg-slate-100/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{depl.name}</span>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase">{depl.provider}</span>
                    </div>
                    <Switch
                      checked={serverAllowed(depl.id)}
                      onCheckedChange={(c) => toggleServer(depl.id, c)}
                      disabled={!permissions?.global.canAccessHosting}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Databases */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Database className="h-4 w-4 text-cyan-600" />
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Databases</h4>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-2 shadow-sm">
              {resources.databases.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400 italic font-semibold">No databases connected.</p>
              ) : (
                resources.databases.map((db) => (
                  <div key={db.id} className="flex items-center justify-between rounded-lg border border-slate-50 bg-slate-50/50 px-3 py-2 hover:bg-slate-100/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{db.name}</span>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase">{db.provider}</span>
                    </div>
                    <Switch
                      checked={dbAllowed(db.id)}
                      onCheckedChange={(c) => toggleDb(db.id, c)}
                      disabled={!permissions?.global.canAccessDatabases}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default GranularAccessPanel;
