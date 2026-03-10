import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Server, 
  Cloud, 
  HardDrive, 
  Check, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  Loader2, 
  Wifi, 
  ShieldCheck 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatabaseLogo } from './DatabaseLogo';

type Provider = 'Firebase' | 'MongoDB' | 'Supabase' | 'MySQL' | 'PostgreSQL' | 'AWS RDS' | 'Oracle' | 'Redis' | 'MariaDB';

interface DatabaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  projectUrl?: string;
  anonKey?: string;
  connectionUri?: string;
  endpoint?: string;
  port?: string;
  dbName?: string;
  username?: string;
  password?: string;
  host?: string;
  serviceName?: string;
}

const AddDatabaseForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [connectionName, setConnectionName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<DatabaseConfig>({});
  const [showHelp, setShowHelp] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const providers: { id: Provider; icon: any }[] = [
    { id: 'MongoDB', icon: Database },
    { id: 'Firebase', icon: Cloud },
    { id: 'Supabase', icon: Database },
    { id: 'MySQL', icon: Server },
    { id: 'PostgreSQL', icon: Database },
    { id: 'AWS RDS', icon: Cloud },
    { id: 'Oracle', icon: HardDrive },
    { id: 'Redis', icon: Server },
    { id: 'MariaDB', icon: Database },
  ];

  const handleInputChange = (field: keyof DatabaseConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestSuccess(false);
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateInput = () => {
    // Basic regex validation logic for URIs
    if (['MongoDB', 'MySQL', 'PostgreSQL', 'MariaDB', 'Redis'].includes(selectedProvider || '')) {
       // Allow mongodb:// or mongodb+srv://
       if (selectedProvider === 'MongoDB') {
          return /^mongodb(?:\+srv)?:\/\/.+/.test(formData.connectionUri || '');
       }
       const uriPattern = /^[a-z]+:\/\/[^:]+(:[^@]+)?@[^:]+:\d+\/.+/;
       return uriPattern.test(formData.connectionUri || '');
    }
    return true;
  };

  const handleSaveConnection = async () => {
       try {
           setIsTesting(true);
           setError(null);
           
           if (!connectionName) {
               setError("Please provide a name for this connection.");
               setIsTesting(false);
               return;
           }

           const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
           const response = await fetch(`${API_URL}/api/connections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: connectionName,
                    provider: selectedProvider,
                    config: formData
                }),
           });

           if (!response.ok) {
               const err = await response.json();
               throw new Error(err.message || 'Failed to save');
           }
           
           // Small delay for UX
           await new Promise(resolve => setTimeout(resolve, 500));
           
           if (onSuccess) onSuccess();
       } catch (err: any) {
           setError(err.message || "An error occurred while saving.");
       } finally {
           setIsTesting(false);
       }
  }

  const handleTestConnection = async () => {
    if (!validateInput()) {
        // You might want a better UI for error feedback
        alert("Invalid format detected. Please check the Help section for the correct format.");
        return;
    }

    setIsTesting(true);
    // Simulate API call for testing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
    setTestSuccess(true);
  };

  const renderFields = () => {
    switch (selectedProvider) {
      case 'Firebase':
        return (
          <>
            <InputField label="API Key" field="apiKey" type="password" />
            <InputField label="Auth Domain" field="authDomain" placeholder="project-id.firebaseapp.com" />
            <InputField label="Project ID" field="projectId" />
            <InputField label="Storage Bucket" field="storageBucket" placeholder="project-id.appspot.com" />
          </>
        );
      case 'Supabase':
        return (
          <>
            <InputField label="Project URL" field="projectUrl" placeholder="https://xyz.supabase.co" />
            <InputField label="Anon / Public Key" field="anonKey" type="password" />
          </>
        );
      case 'AWS RDS':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Endpoint" field="endpoint" placeholder="rds-endpoint.amazonaws.com" />
                <InputField label="Port" field="port" placeholder="5432" />
            </div>
            <InputField label="Database Name" field="dbName" />
            <InputField label="Master Username" field="username" />
            <InputField label="Master Password" field="password" type="password" />
          </>
        );
      case 'Oracle':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Host" field="host" />
                <InputField label="Port" field="port" placeholder="1521" />
            </div>
            <InputField label="Service Name" field="serviceName" />
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Username" field="username" />
                <InputField label="Password" field="password" type="password" />
            </div>
          </>
        );
      case 'MySQL':
      case 'PostgreSQL':
      case 'MariaDB':
      case 'Redis':
      case 'MariaDB':
      case 'MongoDB':
        return (
          <InputField 
            label="Connection URI" 
            field="connectionUri" 
            placeholder={
              selectedProvider === 'MongoDB' 
              ? 'mongodb+srv://user:password@cluster.mongodb.net/db'
              : `${selectedProvider?.toLowerCase()}://user:pass@host:port/db`
            } 
            type="password"
          />
        );
      default:
        return null;
    }
  };

  const renderHelpText = () => {
     switch (selectedProvider) {
        case 'Firebase': return 'Copy this from Project Settings > General > Your Apps in Firebase Console.';
        case 'Supabase': return 'Copy from Settings > API.';
        case 'MongoDB': return 'Format: mongodb+srv://username:password@cluster.mongodb.net/database';
        case 'MySQL':
        case 'PostgreSQL':
        case 'MariaDB': return `Format: ${selectedProvider.toLowerCase()}://username:password@hostname:port/database_name`;
        case 'Redis': return 'Format: redis://:password@hostname:port/db_number';
        default: return 'Fill in the connection details provided by your database host.';
     }
  };

  const InputField = ({ label, field, type = 'text', placeholder }: { label: string, field: keyof DatabaseConfig, type?: string, placeholder?: string }) => {
    const isPassword = type === 'password';
    const isVisible = showPassword[field];
    
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
        <div className="relative group">
          <input
            type={isPassword && !isVisible ? 'password' : 'text'}
            value={formData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-[#0B0E14] border border-[#1f2937] text-gray-200 text-sm rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:border-[#00C2CB] focus:ring-1 focus:ring-[#00C2CB] transition-all placeholder:text-gray-600`}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => togglePasswordVisibility(field)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#00C2CB] transition-colors bg-[#0B0E14] pl-2"
            >
              {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0B0E14] text-white p-4 flex flex-col font-sans">
        {/* 1. Selection Logic: Grid of Database Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {providers.map((p) => (
                <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedProvider(p.id); setFormData({}); setTestSuccess(false); setShowHelp(false); }}
                    className={cn(
                        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300 bg-[#181C25]",
                        selectedProvider === p.id 
                            ? "border-[#00C2CB] shadow-[0_0_10px_-5px_#00C2CB40] z-10" 
                            : "border-transparent hover:border-white/10"
                    )}
                >
                    <div className={cn(
                        "p-2 rounded-full bg-[#0B0E14]", 
                        selectedProvider === p.id ? "text-[#00C2CB]" : "text-gray-400"
                    )}>
                        <DatabaseLogo type={p.id} className="w-8 h-8" />
                    </div>
                    <span className={cn(
                        "font-medium text-xs",
                        selectedProvider === p.id ? "text-white" : "text-gray-400"
                    )}>{p.id}</span>
                    
                    {selectedProvider === p.id && (
                        <motion.div 
                            layoutId="active-check"
                            className="absolute top-2 right-2 text-[#00C2CB]"
                        >
                            <ShieldCheck size={14} />
                        </motion.div>
                    )}
                </motion.button>
            ))}
        </div>

        {/* 2. Smart Input Logic */}
        <AnimatePresence mode="wait">
            {selectedProvider ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-[#181C25] rounded-xl p-6 border border-white/5"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="h-6 w-1 bg-[#00C2CB] rounded-full"></span>
                            <h2 className="text-lg font-semibold">{selectedProvider} Configuration</h2>
                        </div>
                        
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                            <input 
                                type="checkbox" 
                                checked={showHelp} 
                                onChange={(e) => setShowHelp(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-600 bg-[#0B0E14] text-[#00C2CB] focus:ring-[#00C2CB]" 
                            />
                            <span>Show Help</span>
                            <HelpCircle size={14} />
                        </label>
                    </div>

                    {/* Help Section Animation */}
                    <AnimatePresence>
                        {showHelp && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-[#00C2CB]/10 border border-[#00C2CB]/20 rounded-lg p-4 mb-6 text-[#00C2CB] text-xs flex items-start gap-3">
                                    <HelpCircle size={16} className="mt-0.5 shrink-0" />
                                    <p>{renderHelpText()}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Dynamic Fields */}
                    <div className="grid gap-4 mb-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Connection Name</label>
                            <input
                                type="text"
                                value={connectionName}
                                onChange={(e) => setConnectionName(e.target.value)}
                                placeholder="e.g. Production Cluster"
                                className="w-full bg-[#0B0E14] border border-[#1f2937] text-gray-200 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00C2CB] focus:ring-1 focus:ring-[#00C2CB] transition-all placeholder:text-gray-600"
                            />
                        </div>
                        {renderFields()}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    {/* 3. Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button 
                            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
                            onClick={() => { setSelectedProvider(null); if (onSuccess) onSuccess(); }} 
                        >
                            Cancel
                        </button>
                        
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting || testSuccess}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 flex items-center gap-2 min-w-[140px] justify-center",
                                testSuccess 
                                    ? "bg-green-500/10 text-green-500 border border-green-500/50 cursor-default"
                                    : "bg-[#00C2CB] text-black hover:bg-[#00C2CB]/90"
                            )}
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Testing...
                                </>
                            ) : testSuccess ? (
                                <>
                                    <Check size={14} />
                                    Connected
                                </>
                            ) : (
                                <>
                                    <Wifi size={14} />
                                    Test Connection
                                </>
                            )}
                        </button>

                         {testSuccess && (
                            <motion.button
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={handleSaveConnection}
                                className="px-6 py-2 rounded-lg text-xs font-bold bg-white text-black hover:bg-gray-200 transition-colors"
                            >
                                Save
                            </motion.button>
                         )}
                    </div>
                </motion.div>
            ) : (
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center p-8 text-gray-500 border-2 border-dashed border-[#1f2937] rounded-xl"
                >
                    <Database size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Select a provider above to get started</p>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default AddDatabaseForm;
