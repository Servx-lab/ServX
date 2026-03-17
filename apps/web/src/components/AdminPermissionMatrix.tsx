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
  const [resources, setResources] = useState<{ dbs: any[], repos: any[] }>({ dbs: [], repos: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [permRes, resRes] = await Promise.all([
          fetch(`/api/admin/permissions/${userUid}`),
          fetch('/api/admin/resources')
        ]);
        
        const permData = await permRes.json();
        const resData = await resRes.json();
        
        setPermissions(permData.permissions);
        setResources(resData);
      } catch (error) {
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userUid]);

  const handleToggleGlobal = (key: string) => {
    setPermissions((prev: any) => ({
      ...prev,
      global: { ...prev.global, [key]: !prev.global[key] }
    }));
  };

  const handleToggleResource = (type: 'dbs' | 'repos', resourceName: string, permissionKey: string) => {
    setPermissions((prev: any) => {
      const items = [...(prev[type] || [])];
      const index = items.findIndex((i: any) => i.name === resourceName);
      
      if (index === -1) {
        items.push({ name: resourceName, [permissionKey]: true });
      } else {
        items[index] = { ...items[index], [permissionKey]: !items[index][permissionKey] };
      }
      
      return { ...prev, [type]: items };
    });
  };

  const getResourceValue = (type: 'dbs' | 'repos', resourceName: string, permissionKey: string) => {
    const item = permissions[type]?.find((i: any) => i.name === resourceName);
    return item ? item[permissionKey] : false;
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
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00C2CB]" />
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Database Access</h4>
            </div>
            <div className="bg-[#0B0E14] rounded-xl border border-gray-800 p-2 space-y-2">
              {resources.dbs.map(db => (
                <div key={db.name} className="p-3 bg-[#151921]/50 rounded-lg border border-gray-800/50">
                  <p className="text-xs font-bold text-gray-300 mb-2">{db.name} ({db.provider})</p>
                  <div className="flex gap-4">
                    <ResourceToggle 
                      label="View" 
                      checked={getResourceValue('dbs', db.name, 'canView')} 
                      onToggle={() => handleToggleResource('dbs', db.name, 'canView')} 
                    />
                    <ResourceToggle 
                      label="Modify" 
                      checked={getResourceValue('dbs', db.name, 'canModify')} 
                      onToggle={() => handleToggleResource('dbs', db.name, 'canModify')} 
                    />
                  </div>
                </div>
              ))}
              {resources.dbs.length === 0 && <p className="text-[10px] text-gray-600 p-2">No databases connected</p>}
            </div>
          </div>
          
          {/* Repositories */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-[#00C2CB]" />
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Repository Data</h4>
            </div>
            <div className="bg-[#0B0E14] rounded-xl border border-gray-800 p-2 space-y-2">
              {resources.repos.map(repo => (
                <div key={repo.name} className="p-3 bg-[#151921]/50 rounded-lg border border-gray-800/50">
                  <p className="text-xs font-bold text-gray-300 mb-2">{repo.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <ResourceToggle 
                      label="Logs" 
                      checked={getResourceValue('repos', repo.name, 'canViewLogs')} 
                      onToggle={() => handleToggleResource('repos', repo.name, 'canViewLogs')} 
                    />
                    <ResourceToggle 
                      label="Commits" 
                      checked={getResourceValue('repos', repo.name, 'canViewCommits')} 
                      onToggle={() => handleToggleResource('repos', repo.name, 'canViewCommits')} 
                    />
                    <ResourceToggle 
                      label="Pipeline" 
                      checked={getResourceValue('repos', repo.name, 'canTriggerPipeline')} 
                      onToggle={() => handleToggleResource('repos', repo.name, 'canTriggerPipeline')} 
                    />
                  </div>
                </div>
              ))}
              {resources.repos.length === 0 && <p className="text-[10px] text-gray-600 p-2">No repositories linked</p>}
            </div>
          </div>
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

const ResourceToggle = ({ label, checked, onToggle }: any) => (
  <div className="flex items-center gap-2">
    <Switch 
      checked={checked} 
      onCheckedChange={onToggle}
      className="scale-75 data-[state=checked]:bg-[#00C2CB]"
    />
    <span className="text-[10px] font-medium text-gray-400">{label}</span>
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
