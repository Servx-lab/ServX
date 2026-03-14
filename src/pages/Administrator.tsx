import React, { useState, useEffect } from "react";
import { 
  Shield, 
  UserPlus, 
  Trash2, 
  Search, 
  Mail, 
  UserCheck,
  ShieldAlert,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import AdminPermissionMatrix from "@/components/AdminPermissionMatrix";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

interface Admin {
  uid: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: string;
}

const Administrator = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedUser, setSelectedUser] = useState<Admin | null>(null);
  const [workspaceLogo, setWorkspaceLogo] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchWorkspaceLogo = async () => {
    try {
      // For simplicity, we fetch it from a test user's permissions or a dedicated endpoint
      const response = await fetch('/api/admin/permissions/me'); // Optional: dedicated workspace info endpoint
      if (response.ok) {
        const data = await response.json();
        setWorkspaceLogo(data.ownerLogoUrl || "");
      }
    } catch (e) {}
  };

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/list');
      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      console.error("Failed to fetch admins", error);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ email, role })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Administrator invited successfully");
        setEmail("");
        fetchAdmins();
      } else {
        toast.error(data.message || "Failed to invite administrator");
      }
    } catch (error) {
      toast.error("An error occurred during invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (uid: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/revoke/${uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        toast.success("Access revoked successfully");
        fetchAdmins();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to revoke access");
      }
    } catch (error) {
      toast.error("An error occurred during revocation");
    }
  };

  const handleLogoUpdate = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/workspace/logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ logoUrl: workspaceLogo })
      });
      if (response.ok) {
        toast.success("Workspace branding updated");
      }
    } catch (error) {
      toast.error("Failed to update branding");
    }
  };

  return (
    <div className="flex min-h-screen cyber-gradient-bg dot-grid">
      <Sidebar />

      <main className="ml-56 flex-1 p-8 pt-24 flex flex-col">
        <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-[#00C2CB]/10 border border-[#00C2CB]/20">
            <Shield className="w-8 h-8 text-[#00C2CB]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Administrator Management</h1>
            <p className="text-gray-400 mt-1">Manage system-level access and permissions for ServX.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Section 1: Invite Admin */}
          <section className="lg:col-span-2 bg-[#151921] border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="w-5 h-5 text-[#00C2CB]" />
              <h2 className="text-xl font-semibold">Invite New Administrator</h2>
            </div>
            
            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  placeholder="User email address..." 
                  className="pl-10 bg-[#0B0E14] border-gray-700 focus:border-[#00C2CB] focus:ring-1 focus:ring-[#00C2CB] transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="bg-[#0B0E14] border-gray-700 focus:ring-[#00C2CB]">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151921] border-gray-700 text-gray-200">
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="bg-[#00C2CB] hover:bg-[#00AAB1] text-black font-semibold px-8"
                  disabled={loading}
                >
                  {loading ? "Inviting..." : "Invite Admin"}
                </Button>
              </div>
            </form>
          </section>

          {/* Section: Workspace Settings */}
          <section className="bg-[#151921] border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-[#00C2CB]" />
              <h2 className="text-xl font-semibold">Workspace Settings</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Workspace Logo URL</label>
                <Input 
                  placeholder="https://example.com/logo.png" 
                  className="bg-[#0B0E14] border-gray-700 focus:border-[#00C2CB] text-xs"
                  value={workspaceLogo}
                  onChange={(e) => setWorkspaceLogo(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleLogoUpdate}
                className="w-full bg-transparent border border-[#00C2CB] text-[#00C2CB] hover:bg-[#00C2CB]/10 font-bold"
              >
                Update Branding
              </Button>
            </div>
          </section>
        </div>

        <AnimatePresence mode="wait">
          {selectedUser && (
            <motion.div 
              key={selectedUser.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-12"
            >
              <AdminPermissionMatrix 
                userUid={selectedUser.uid} 
                userEmail={selectedUser.email} 
                onClose={() => setSelectedUser(null)} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section 2: Admin List */}
        <section className="bg-[#151921] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#00C2CB]" />
              <h2 className="text-xl font-semibold">Current Administrators</h2>
            </div>
            <Badge variant="outline" className="border-[#00C2CB]/30 text-[#00C2CB] bg-[#00C2CB]/5">
              {admins.length} Total
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#0B0E14]/50">
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-medium">Administrator</TableHead>
                  <TableHead className="text-gray-400 font-medium">UID</TableHead>
                  <TableHead className="text-gray-400 font-medium">Role</TableHead>
                  <TableHead className="text-gray-400 font-medium">Added On</TableHead>
                  <TableHead className="text-right text-gray-400 font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow 
                    key={admin.uid} 
                    className={`border-gray-800 hover:bg-[#0B0E14]/30 transition-colors cursor-pointer ${selectedUser?.uid === admin.uid ? 'bg-[#00C2CB]/5 border-[#00C2CB]/30' : ''}`}
                    onClick={() => setSelectedUser(admin)}
                  >
                    <TableCell className="font-medium text-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00C2CB]/20 to-[#00C2CB]/5 border border-[#00C2CB]/20 flex items-center justify-center text-[#00C2CB] text-xs font-bold">
                          {admin.email[0].toUpperCase()}
                        </div>
                        {admin.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] font-mono bg-[#0B0E14] px-1.5 py-0.5 rounded text-gray-500">
                        {admin.uid}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge className={`
                        capitalize font-medium
                        ${admin.role === 'owner' ? 'bg-[#00C2CB] text-black' : 
                          admin.role === 'editor' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                          'bg-gray-500/10 text-gray-400 border border-gray-500/20'}
                      `}>
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {new Date(admin.addedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
                        onClick={() => handleRevoke(admin.uid)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-gray-500 italic">
                      No administrators found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </main>
  </div>
);
};

export default Administrator;
