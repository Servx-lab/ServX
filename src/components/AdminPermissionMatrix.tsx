import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Database, 
  Github, 
  Lock, 
  Check, 
  X, 
  Zap,
  Globe,
  Settings,
  ChevronRight
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PermissionMatrixProps {
  userUid: string;
  userEmail: string;
  onClose: () => void;
}

const AdminPermissionMatrix: React.FC<PermissionMatrixProps> = ({ userUid, userEmail, onClose }) => {
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch(`/api/admin/permissions/${userUid}`);
        const data = await response.json();
        setPermissions(data.permissions);
      } catch (error) {
        toast.error("Failed to fetch user permissions");
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, [userUid]);

  const handleToggleGlobal = (key: string) => {
    setPermissions((prev: any) => ({
      ...prev,
      global: { ...prev.global, [key]: !prev.global[key] }
    }));
  };

  const handleUpdate = async () => {
    try {
      const response = await fetch('/api/admin/permissions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUid, permissions })
      });
      if (response.ok) {
        toast.success("Permissions updated successfully");
        onClose();
      }
    } catch (error) {
      toast.error("Failed to update permissions");
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-[#00C2CB]">Initializing Matrix...</div>;

  return (
    <motion.div 
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -50, opacity: 0 }}
      className="bg-[#151921] border border-[#00C2CB]/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,194,203,0.1)]"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-[#0B0E14]/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00C2CB]/10 border border-[#00C2CB]/20">
            <Lock className="w-5 h-5 text-[#00C2CB]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Access Detail: {userEmail}</h3>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{userUid}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-6 space-y-8">
        {/* Full Control Toggle */}
        <div className="flex items-center justify-between p-4 bg-[#0B0E14] border border-[#00C2CB]/30 rounded-xl shadow-[0_0_15px_rgba(0,194,203,0.05)]">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#00C2CB]" />
            <div>
              <p className="font-bold text-white">Full Control (Master)</p>
              <p className="text-xs text-gray-400">Grant all permissions recursively across this workspace.</p>
            </div>
          </div>
          <Switch 
            checked={permissions.global.isFullControl} 
            onCheckedChange={() => handleToggleGlobal('isFullControl')}
            className="data-[state=checked]:bg-[#00C2CB]"
          />
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Databases */}
          <CategorySection 
            title="Database Access" 
            icon={<Database className="w-4 h-4" />} 
            items={permissions.dbs} 
          />
          
          {/* Repositories */}
          <CategorySection 
            title="Repository Data" 
            icon={<Github className="w-4 h-4" />} 
            items={permissions.repos} 
          />
        </div>

        {/* Global Security */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#00C2CB]" />
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Security Control</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SecurityToggle 
              label="Ban IPs" 
              checked={permissions.global.canBanIPs} 
              onToggle={() => handleToggleGlobal('canBanIPs')} 
            />
            <SecurityToggle 
              label="View Device UUIDs" 
              checked={permissions.global.canViewDeviceUUIDs} 
              onToggle={() => handleToggleGlobal('canViewDeviceUUIDs')} 
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-800 bg-[#0B0E14]/30 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
        <Button 
          onClick={handleUpdate}
          className="bg-[#00C2CB] hover:bg-[#00AAB1] text-black font-bold px-8 shadow-[0_0_15px_rgba(0,194,203,0.2)]"
        >
          Save Matrix
        </Button>
      </div>
    </motion.div>
  );
};

const CategorySection = ({ title, icon, items }: any) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <span className="text-[#00C2CB]">{icon}</span>
      <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">{title}</h4>
    </div>
    <div className="bg-[#0B0E14] rounded-xl border border-gray-800 p-4 space-y-3 min-h-[100px] flex flex-col justify-center items-center">
      <p className="text-xs text-gray-600 italic">No resources connected yet.</p>
    </div>
  </div>
);

const SecurityToggle = ({ label, checked, onToggle }: any) => (
  <div className="flex items-center justify-between p-3 bg-[#0B0E14]/50 border border-gray-800 rounded-lg">
    <span className="text-sm text-gray-300">{label}</span>
    <Switch 
      checked={checked} 
      onCheckedChange={onToggle}
      className="data-[state=checked]:bg-[#00C2CB]"
    />
  </div>
);

export default AdminPermissionMatrix;
