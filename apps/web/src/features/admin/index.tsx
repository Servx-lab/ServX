import React, { useState } from "react";
import { Shield, Users, Trash2, Settings, UserCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminList, useInviteAdmin, useRevokeAdmin } from "./hooks";
import type { AdminRecord, AdminRole } from "./types";
import UserSearchInviteBar from "./UserSearchInviteBar";
import GranularAccessModal from "./GranularAccessModal";

function roleBadgeClass(role: string): string {
  if (role === "viewer") {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }
  if (role === "editor") {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  return "bg-cyan-50 text-cyan-700 border border-cyan-200";
}

const Administrator = () => {
  const [accessUser, setAccessUser] = useState<AdminRecord | null>(null);

  const { data: admins = [], isLoading: isLoadingAdmins } = useAdminList();
  const inviteMutation = useInviteAdmin();
  const revokeMutation = useRevokeAdmin();

  const handleInvite = (email: string, role: AdminRole) => {
    inviteMutation.mutate({ email, role });
  };

  const handleRevoke = (uid: string) => {
    revokeMutation.mutate(uid);
  };

  return (
    <main className="flex min-h-full flex-1 flex-col bg-white p-8 pt-24 font-sans text-black">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 shadow-sm">
            <Shield className="h-8 w-8 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Team &amp; access management</h1>
            <p className="mt-1 text-gray-500">
              Discover users, assign global roles, and configure granular infrastructure visibility per teammate.
            </p>
          </div>
        </div>

        {/* Search & invite */}
        <section>
          <UserSearchInviteBar onInvite={handleInvite} inviting={inviteMutation.isPending} />
        </section>

        {/* Team roster */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-cyan-600" />
              <h2 className="text-xl font-semibold text-gray-900">Active team</h2>
            </div>
            <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
              {admins.length} member{admins.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 bg-gray-50/80 hover:bg-transparent">
                  <TableHead className="font-medium text-gray-600">Member</TableHead>
                  <TableHead className="font-medium text-gray-600">Global role</TableHead>
                  <TableHead className="font-medium text-gray-600">Added</TableHead>
                  <TableHead className="text-right font-medium text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAdmins ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 animate-pulse text-center text-gray-500">
                      Loading team…
                    </TableCell>
                  </TableRow>
                ) : admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center italic text-gray-500">
                      No team members yet. Invite someone above.
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.uid} className="border-gray-200 hover:bg-gray-50/80">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200 bg-cyan-100 text-sm font-bold text-cyan-700">
                            {admin.email[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-gray-900">{admin.email}</div>
                            <code className="text-[10px] text-gray-500">{admin.uid}</code>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${roleBadgeClass(admin.role)}`}>
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(admin.addedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-gray-600 hover:bg-gray-100 hover:text-cyan-600"
                            title="Edit access"
                            onClick={() => setAccessUser(admin)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Revoke access"
                            onClick={() => handleRevoke(admin.uid)}
                            disabled={revokeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <GranularAccessModal
        open={accessUser !== null}
        onOpenChange={(o) => !o && setAccessUser(null)}
        userUid={accessUser?.uid ?? ""}
        userEmail={accessUser?.email ?? ""}
      />
    </main>
  );
};

export default Administrator;
