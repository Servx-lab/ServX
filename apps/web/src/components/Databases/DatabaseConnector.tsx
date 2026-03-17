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
import { cn } from '@/lib/utils'; // Assuming valid utils path from existing workspace

type Provider = 'Firebase' | 'Supabase' | 'MySQL' | 'PostgreSQL' | 'AWS RDS' | 'Oracle' | 'Redis' | 'MariaDB';

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

const DatabaseConnector = () => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<DatabaseConfig>({});
  const [showHelp, setShowHelp] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const providers: { id: Provider; icon: any }[] = [
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
    // Basic regex validation logic
    if (['MySQL', 'PostgreSQL', 'MariaDB', 'Redis'].includes(selectedProvider || '')) {
       const uriPattern = /^[a-z]+:\/\/[^:]+(:[^@]+)?@[^:]+:\d+\/.+/;
       return uriPattern.test(formData.connectionUri || '');
    }
    // Add more specific validations as needed
    return true;
  };

  const handleTestConnection = async () => {
    if (!validateInput()) {
        alert("Invalid format detected.");
        return;
    }

    setIsTesting(true);
    // Simulate API call
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
        return (
          <InputField 
            label="Connection URI" 
            field="connectionUri" 
            placeholder={`${selectedProvider?.toLowerCase()}://user:pass@host:port/db`} 
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
            className="w-full bg-[#0B0E14] border border-[#1f2937] text-gray-200 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00C2CB] focus:ring-1 focus:ring-[#00C2CB] transition-all placeholder:text-gray-600"
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => togglePasswordVisibility(field)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#00C2CB] transition-colors"
            >
              {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Connect Data Source</h1>
            <p className="text-gray-500">Select a provider to configure your secure connection vault.</p>
        </div>

        {/* 1. Selection Logic: Grid of Database Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {providers.map((p) => (
                <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedProvider(p.id); setFormData({}); setTestSuccess(false); setShowHelp(false); }}
                    className={cn(
                        "relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-300 bg-[#181C25]",
                        selectedProvider === p.id 
                            ? "border-[#00C2CB] shadow-[0_0_20px_-5px_#00C2CB40]" 
                            : "border-transparent hover:border-white/10"
                    )}
                >
                    <div className={cn(
                        "p-3 rounded-full bg-[#0B0E14]", 
                        selectedProvider === p.id ? "text-[#00C2CB]" : "text-gray-400"
                    )}>
                        <p.icon size={28} />
                    </div>
                    <span className={cn(
                        "font-medium text-sm",
                        selectedProvider === p.id ? "text-white" : "text-gray-400"
                    )}>{p.id}</span>
                    
                    {selectedProvider === p.id && (
                        <motion.div 
                            layoutId="active-check"
                            className="absolute top-3 right-3 text-[#00C2CB]"
                        >
                            <ShieldCheck size={16} />
                        </motion.div>
                    )}
                </motion.button>
            ))}
        </div>

        {/* 2. Smart Input Logic */}
        <AnimatePresence mode="wait">
            {selectedProvider && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-[#181C25] rounded-2xl p-8 border border-white/5 shadow-xl"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <span className="h-8 w-1 bg-[#00C2CB] rounded-full"></span>
                            <h2 className="text-xl font-semibold">{selectedProvider} Configuration</h2>
                        </div>
                        
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                            <input 
                                type="checkbox" 
                                checked={showHelp} 
                                onChange={(e) => setShowHelp(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-[#0B0E14] text-[#00C2CB] focus:ring-[#00C2CB]" 
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
                                <div className="bg-[#00C2CB]/10 border border-[#00C2CB]/20 rounded-lg p-4 mb-8 text-[#00C2CB] text-sm flex items-start gap-3">
                                    <HelpCircle size={18} className="mt-0.5 shrink-0" />
                                    <p>{renderHelpText()}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Dynamic Fields */}
                    <div className="grid gap-6">
                        {renderFields()}
                    </div>

                    {/* 3. Action Buttons */}
                    <div className="mt-8 flex justify-end gap-4 border-t border-white/5 pt-6">
                        <button 
                            className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            onClick={() => setSelectedProvider(null)}
                        >
                            Cancel
                        </button>
                        
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting || testSuccess}
                            className={cn(
                                "relative px-8 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2",
                                testSuccess 
                                    ? "bg-green-500/10 text-green-500 border border-green-500/50 cursor-default"
                                    : "bg-[#00C2CB] text-black hover:bg-[#00C2CB]/90 shadow-[0_0_15px_-3px_#00C2CB]"
                            )}
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Testing...
                                </>
                            ) : testSuccess ? (
                                <>
                                    <Check size={16} />
                                    Connected
                                </>
                            ) : (
                                <>
                                    <Wifi size={16} />
                                    Test Connection
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DatabaseConnector;
