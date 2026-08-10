import React, { useState } from "react";
import { PageLayout } from '@/components/layout/PageLayout';
import { ProfilePhoto } from "@/components/ProfilePhoto";
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
import GranularAccessPanel from "./GranularAccessPanel";

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
  const [expandedUserUid, setExpandedUserUid] = useState<string | null>(null);

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
    <PageLayout title="Team & access management" subtitle="Discover users, assign global roles, and configure granular infrastructure visibility per teammate." fullWidth={true} noPadding={true}>
      <div className="mx-auto w-full max-w-6xl space-y-10 p-8">
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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white">
                {admins.length} Members
              </Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 hover:bg-transparent">
                  <TableHead className="w-[300px] text-xs font-semibold text-gray-500">User</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500">Global Role</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAdmins ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-sm text-gray-400">
                      Loading team members...
                    </TableCell>
                  </TableRow>
                ) : admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-sm text-gray-400">
                      No team members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin: AdminRecord) => {
                    const isExpanded = expandedUserUid === admin.id;
                    return (
                      <React.Fragment key={admin.id}>
                        <TableRow className="group border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center gap-3">
                              <ProfilePhoto
                                url={admin.photo_url || ""}
                                email={admin.email}
                                size={36}
                                className="shadow-sm"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-black">
                                  {admin.display_name || admin.email.split("@")[0]}
                                </span>
                                <span className="text-xs text-gray-500">{admin.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleBadgeClass(admin.role)}>{admin.role}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedUserUid(isExpanded ? null : admin.id)}
                                className={`text-gray-600 hover:text-black border-gray-200 ${isExpanded ? "bg-gray-100" : ""}`}
                              >
                                <Settings className="mr-2 h-3.5 w-3.5" />
                                Access Control
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevoke(admin.id)}
                                disabled={revokeMutation.isPending}
                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Expanded detail row */}
                        {isExpanded && (
                          <TableRow className="border-gray-100 bg-gray-50/30 hover:bg-gray-50/30">
                            <TableCell colSpan={3} className="p-0">
                              <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                <GranularAccessPanel uid={admin.id} userEmail={admin.email} />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Administrator;
