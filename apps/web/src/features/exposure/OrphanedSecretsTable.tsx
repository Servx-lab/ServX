import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type OrphanedUser = {
  id: string;
  name: string;
  email: string;
  access: string;
  lastActive: string;
  daysIdle: number;
};

const MOCK_ORPHANS: OrphanedUser[] = [
  {
    id: "1",
    name: "Jordan Lee",
    email: "jordan@acme.dev",
    access: "Write · GitHub + Vercel",
    lastActive: "2025-11-02",
    daysIdle: 164,
  },
  {
    id: "2",
    name: "Sam Okonkwo",
    email: "sam.okonkwo@labs.io",
    access: "Write · prod-db + API repo",
    lastActive: "2025-10-18",
    daysIdle: 179,
  },
  {
    id: "3",
    name: "Priya Shah",
    email: "priya@servx.internal",
    access: "Write · Mongo Atlas",
    lastActive: "2025-09-30",
    daysIdle: 197,
  },
];

export function OrphanedSecretsTable() {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revoked, setRevoked] = useState<Set<string>>(new Set());

  const pending = MOCK_ORPHANS.find((u) => u.id === confirmId);

  const handleConfirmRevoke = () => {
    if (!confirmId) return;
    setRevoked((s) => new Set(s).add(confirmId));
    setConfirmId(null);
  };

  const visible = MOCK_ORPHANS.filter((u) => !revoked.has(u.id));

  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#00C2CB]">
              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
              Orphaned secrets radar
            </h2>
            <p className="mt-1 max-w-xl text-xs text-gray-500">
              Write-capable identities with no session in <span className="font-medium text-[#EF4444]">90+</span> days —
              high privilege drift risk.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/80">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/90 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">Access surface</th>
                <th className="px-4 py-3">Last active</th>
                <th className="px-4 py-3">Idle</th>
                <th className="px-4 py-3 text-right">Containment</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-gray-100 bg-white last:border-0 hover:bg-gray-50/90"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    <div className="font-mono text-[11px] text-gray-500">{row.email}</div>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-gray-600">{row.access}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.lastActive}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-[#EF4444]/30 bg-red-50 px-2 py-0.5 text-xs font-medium text-[#EF4444]">
                      {row.daysIdle}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setConfirmId(row.id)}
                      className="border border-cyan-500/40 bg-cyan-50 font-semibold text-cyan-700 shadow-sm transition hover:bg-cyan-100"
                    >
                      Revoke access
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-500">All dormant write paths cleared.</p>
          )}
        </div>
      </section>

      <Dialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Revoke access?</DialogTitle>
            <DialogDescription className="text-gray-600">
              {pending && (
                <>
                  This will remove write tokens and deployment keys for{" "}
                  <span className="font-medium text-gray-900">{pending.name}</span> ({pending.email}). Incident audit
                  entries will reference this action.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" className="text-gray-600" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#EF4444] font-semibold text-white hover:bg-red-600" onClick={handleConfirmRevoke}>
              Confirm revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
