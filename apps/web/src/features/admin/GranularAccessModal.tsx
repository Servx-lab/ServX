import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Github, Server, Database, Loader2, Globe, Box } from "lucide-react";
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

interface GranularAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userUid: string;
  userEmail: string;
}

const GranularAccessModal: React.FC<GranularAccessModalProps> = ({
  open,
  onOpenChange,
  userUid,
  userEmail,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<AccessPermissions | null>(null);
  const [resources, setResources] = useState<AdminResource | null>(null);
  const [ga, setGa] = useState<GranularAllow | null>(null);
  
  // Local UI state to track if "Deployment Access" master toggle is on for a repo
  const [deploymentsEnabledMap, setDeploymentsEnabledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
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
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userUid, onOpenChange]);

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
      toast.success("Access updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save access");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-gray-200 bg-white p-0 text-gray-900 shadow-lg sm:max-w-xl">
        <DialogHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900">
            Edit granular access
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {userEmail}
            <span className="ml-2 font-mono text-xs text-gray-400">{userUid}</span>
          </DialogDescription>
        </DialogHeader>

        {loading || !resources || !ga ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
            Loading resources…
          </div>
        ) : (
          <div className="px-6 py-4">
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/30 p-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-gray-900">Global Permissions</h3>
                  <p className="text-xs text-gray-500">Master toggles for dashboard sections.</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium uppercase text-gray-400">GH</span>
                    <Switch
                      checked={permissions?.global.canAccessGithub ?? false}
                      onCheckedChange={(c) => toggleGlobalArea('canAccessGithub', c)}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium uppercase text-gray-400">Host</span>
                    <Switch
                      checked={permissions?.global.canAccessHosting ?? false}
                      onCheckedChange={(c) => toggleGlobalArea('canAccessHosting', c)}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium uppercase text-gray-400">DB</span>
                    <Switch
                      checked={permissions?.global.canAccessDatabases ?? false}
                      onCheckedChange={(c) => toggleGlobalArea('canAccessDatabases', c)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* --- REPOSITORIES & DEPLOYMENTS --- */}
              <section>
                <div className="mb-3 flex items-center gap-2 px-1">
                  <Box className="h-4 w-4 text-cyan-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Infrastructure & Apps</h2>
                </div>
                <Accordion type="multiple" className="space-y-2">
                  {resources.repos.map((repo) => (
                    <AccordionItem
                      key={repo.full_name}
                      value={repo.full_name}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                    >
                      <AccordionTrigger className="px-4 py-3 text-left hover:no-underline [&[data-state=open]]:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Github className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{repo.name}</span>
                          <span className="text-[10px] text-gray-400">{repo.full_name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 px-4 pb-4 pt-2">
                        {/* Repo Master Toggles */}
                        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                          <div className="flex items-center justify-between rounded-lg border border-gray-50 bg-gray-50/50 px-3 py-2">
                            <span className="text-xs font-medium text-gray-700">GH Graph Access</span>
                            <Switch
                              checked={repoAllowed(repo.full_name)}
                              onCheckedChange={(c) => toggleRepo(repo.full_name, c)}
                              disabled={!permissions?.global.canAccessGithub}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-gray-50 bg-gray-50/50 px-3 py-2">
                            <span className="text-xs font-medium text-gray-700">Deployment Access</span>
                            <Switch
                              checked={deploymentsEnabledMap[repo.full_name] ?? false}
                              onCheckedChange={(c) => {
                                setDeploymentsEnabledMap(prev => ({ ...prev, [repo.full_name]: c }));
                                // GHOST PERMISSION PREVENTION:
                                // If turning OFF deployment access for this repo, remove all its deployment IDs from the ga.serverIds array
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
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Available Deployments</p>
                            <div className="grid grid-cols-1 gap-1">
                              {repo.deployments.map((depl) => (
                                <div key={depl.id} className="flex items-center space-x-3 rounded-md px-2 py-1.5 hover:bg-gray-50">
                                  <Checkbox
                                    id={depl.id}
                                    checked={serverAllowed(depl.id)}
                                    onCheckedChange={(c) => toggleServer(depl.id, !!c)}
                                  />
                                  <label htmlFor={depl.id} className="flex flex-1 items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                                    <span>{depl.name}</span>
                                    <span className="text-[10px] text-gray-400">{depl.provider}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>

              {/* --- STANDALONE DEPLOYMENTS --- */}
              {resources.standaloneDeployments.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <Globe className="h-4 w-4 text-cyan-600" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Standalone Deployments</h2>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-1">
                    {resources.standaloneDeployments.map((depl) => (
                      <div key={depl.id} className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-gray-50">
                        <Checkbox
                          id={depl.id}
                          checked={serverAllowed(depl.id)}
                          onCheckedChange={(c) => toggleServer(depl.id, !!c)}
                          disabled={!permissions?.global.canAccessHosting}
                        />
                        <label htmlFor={depl.id} className="flex flex-1 items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                          <span>{depl.name}</span>
                          <span className="text-[10px] text-gray-400">{depl.provider}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* --- DATABASES --- */}
              <section>
                <div className="mb-3 flex items-center gap-2 px-1">
                  <Database className="h-4 w-4 text-cyan-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Databases</h2>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-1">
                  {resources.databases.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400 italic">No databases connected.</p>
                  ) : (
                    resources.databases.map((db) => (
                      <div key={db.id} className="flex items-center space-x-3 rounded-md px-3 py-2 hover:bg-gray-50">
                        <Checkbox
                          id={db.id}
                          checked={dbAllowed(db.id)}
                          onCheckedChange={(c) => toggleDb(db.id, !!c)}
                          disabled={!permissions?.global.canAccessDatabases}
                        />
                        <label htmlFor={db.id} className="flex flex-1 items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                          <span>{db.name}</span>
                          <span className="text-[10px] text-gray-400">{db.provider}</span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
              <Button
                type="button"
                variant="ghost"
                className="text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                className="bg-cyan-600 font-bold text-white shadow-md transition-all hover:bg-cyan-700 active:scale-95"
                onClick={() => void handleSave()}
              >
                {saving ? "Saving Changes..." : "Save Permissions"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GranularAccessModal;
