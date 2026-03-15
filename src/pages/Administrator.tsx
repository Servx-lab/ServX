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
    <main className="flex-1 p-8 pt-24 flex flex-col min-h-full bg-white text-black font-sans">
        <div className="max-w-6xl mx-auto w-full">
        {/* Page header - matches Operations / Emails / AutoMedic */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 shadow-sm">
            <Shield className="w-8 h-8 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Administrator Management</h1>
            <p className="text-gray-500 mt-1">Manage system-level access and permissions for ServX.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Section 1: Invite Admin */}
          <section className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="w-5 h-5 text-cyan-600" />
              <h2 className="text-xl font-semibold text-gray-900">Invite New Administrator</h2>
            </div>
            
            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  placeholder="User email address..." 
                  className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:ring-cyan-500">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-8 transition-colors"
                  disabled={loading}
                >
                  {loading ? "Inviting..." : "Invite Admin"}
                </Button>
              </div>
            </form>
          </section>

          {/* Section: Workspace Settings */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-cyan-600" />
              <h2 className="text-xl font-semibold text-gray-900">Workspace Settings</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Workspace Logo URL</label>
                <Input 
                  placeholder="https://example.com/logo.png" 
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 text-xs"
                  value={workspaceLogo}
                  onChange={(e) => setWorkspaceLogo(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleLogoUpdate}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
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
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-600" />
              <h2 className="text-xl font-semibold text-gray-900">Current Administrators</h2>
            </div>
            <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">
              {admins.length} Total
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-transparent bg-gray-50/80">
                  <TableHead className="text-gray-600 font-medium">Administrator</TableHead>
                  <TableHead className="text-gray-600 font-medium">UID</TableHead>
                  <TableHead className="text-gray-600 font-medium">Role</TableHead>
                  <TableHead className="text-gray-600 font-medium">Added On</TableHead>
                  <TableHead className="text-right text-gray-600 font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow 
                    key={admin.uid} 
                    className={`border-gray-200 hover:bg-gray-50/80 transition-colors cursor-pointer ${selectedUser?.uid === admin.uid ? 'bg-cyan-50/80 border-l-2 border-l-cyan-500' : ''}`}
                    onClick={() => setSelectedUser(admin)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700 text-xs font-bold">
                          {admin.email[0].toUpperCase()}
                        </div>
                        {admin.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                        {admin.uid}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge className={`
                        capitalize font-medium
                        ${admin.role === 'owner' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' : 
                          admin.role === 'editor' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                          'bg-gray-100 text-gray-600 border border-gray-200'}
                      `}>
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {new Date(admin.addedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all"
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
  );
};

export default Administrator;
