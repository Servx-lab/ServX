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
import { Button } from "@/components/ui/button";
import { Github, Server, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPermissions, updatePermissions, getAdminResources } from "./api";
import type { AccessPermissions, AdminResource, GranularAllow } from "./types";

function buildFullAllow(resources: AdminResource): GranularAllow {
  return {
    repoKeys: resources.repos.map((r) => r.full_name),
    serverIds: resources.servers.map((s) => s.id),
    databaseIds: resources.databases.map((d) => d.id),
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
      await updatePermissions({ userUid, permissions: next });
      toast.success("Access updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save access");
    } finally {
      setSaving(false);
    }
  };

  const res = resources;
  const repoAllowed = (full: string) =>
    isAllowed(full, ga?.repoKeys ?? null, fallbackFull);
  const serverAllowed = (id: string) =>
    isAllowed(id, ga?.serverIds ?? null, fallbackFull);
  const dbAllowed = (id: string) =>
    isAllowed(id, ga?.databaseIds ?? null, fallbackFull);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-gray-200 bg-white p-0 text-gray-900 shadow-lg sm:max-w-lg">
        <DialogHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900">
            Edit granular access
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {userEmail}
            <span className="ml-2 font-mono text-xs text-gray-400">{userUid}</span>
          </DialogDescription>
        </DialogHeader>

        {loading || !res || !ga ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
            Loading resources…
          </div>
        ) : (
          <div className="px-4 py-4">
            <p className="mb-4 text-xs leading-relaxed text-gray-600">
              Toggle each connected resource. When off, that item is hidden from this user&apos;s dashboard.
            </p>
            <Accordion type="multiple" className="space-y-2" defaultValue={["repos", "servers", "dbs"]}>
              <AccordionItem
                value="repos"
                className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50"
              >
                <AccordionTrigger className="px-4 py-3 text-left text-sm font-medium hover:no-underline [&[data-state=open]]:bg-gray-100/80">
                  <span className="flex items-center gap-2 text-gray-900">
                    <Github className="h-4 w-4 text-cyan-600" />
                    Repositories
                    <span className="text-xs font-normal text-gray-500">({res.repos.length})</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="border-t border-gray-100 px-2 pb-3 pt-1">
                  <ul className="max-h-56 space-y-1 overflow-y-auto">
                    {res.repos.length === 0 ? (
                      <li className="px-2 py-2 text-xs text-gray-500">No repositories linked.</li>
                    ) : (
                      res.repos.map((repo) => (
                        <li
                          key={repo.full_name}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-100/80"
                        >
                          <span className="truncate text-xs text-gray-900">{repo.full_name}</span>
                          <Switch
                            checked={repoAllowed(repo.full_name)}
                            onCheckedChange={(c) => toggleRepo(repo.full_name, c)}
                            className="data-[state=checked]:bg-cyan-600"
                          />
                        </li>
                      ))
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="servers"
                className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50"
              >
                <AccordionTrigger className="px-4 py-3 text-left text-sm font-medium hover:no-underline [&[data-state=open]]:bg-gray-100/80">
                  <span className="flex items-center gap-2 text-gray-900">
                    <Server className="h-4 w-4 text-cyan-600" />
                    Deployment servers
                    <span className="text-xs font-normal text-gray-500">({res.servers.length})</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="border-t border-gray-100 px-2 pb-3 pt-1">
                  <ul className="max-h-56 space-y-1 overflow-y-auto">
                    {res.servers.length === 0 ? (
                      <li className="px-2 py-2 text-xs text-gray-500">No hosting connections.</li>
                    ) : (
                      res.servers.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-100/80"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs text-gray-900">{s.name}</div>
                            <div className="text-[10px] uppercase tracking-wide text-gray-500">
                              {s.provider}
                            </div>
                          </div>
                          <Switch
                            checked={serverAllowed(s.id)}
                            onCheckedChange={(c) => toggleServer(s.id, c)}
                            className="data-[state=checked]:bg-cyan-600"
                          />
                        </li>
                      ))
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="dbs"
                className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50"
              >
                <AccordionTrigger className="px-4 py-3 text-left text-sm font-medium hover:no-underline [&[data-state=open]]:bg-gray-100/80">
                  <span className="flex items-center gap-2 text-gray-900">
                    <Database className="h-4 w-4 text-cyan-600" />
                    Databases
                    <span className="text-xs font-normal text-gray-500">({res.databases.length})</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="border-t border-gray-100 px-2 pb-3 pt-1">
                  <ul className="max-h-56 space-y-1 overflow-y-auto">
                    {res.databases.length === 0 ? (
                      <li className="px-2 py-2 text-xs text-gray-500">No database connections.</li>
                    ) : (
                      res.databases.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-100/80"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs text-gray-900">{d.name}</div>
                            <div className="text-[10px] uppercase tracking-wide text-gray-500">
                              {d.provider}
                            </div>
                          </div>
                          <Switch
                            checked={dbAllowed(d.id)}
                            onCheckedChange={(c) => toggleDb(d.id, c)}
                            className="data-[state=checked]:bg-cyan-600"
                          />
                        </li>
                      ))
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                className="bg-cyan-600 font-semibold text-white hover:bg-cyan-700"
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save access"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GranularAccessModal;
