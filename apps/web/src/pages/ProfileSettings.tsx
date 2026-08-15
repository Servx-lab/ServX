import React, { useState, useEffect } from 'react';
import {
  User,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Laptop,
  ShieldAlert,
  Pencil,
  CloudLightning,
  ExternalLink,
  Settings,
  Server as ServerIcon,
  AlertCircle,
  Key,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks';

// --- MOCK INTEGRATIONS LOGIC ---
const MOCK_CONNECTIONS = {
  vercel: true,
  digitalocean: false,
  railway: true,
  render: false,
  fly: false,
};

const VercelLogo = () => (
  <svg viewBox="0 0 1155 1000" fill="none" className="w-8 h-8 fill-black">
    <path d="M577.344 0L1154.69 1000H0L577.344 0Z" />
  </svg>
);

const DigitalOceanLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#0080FF]">
    <path d="M12 12H16V16H12V12Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14Z" fill="currentColor"/>
  </svg>
);

const RenderLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-black">
     <path d="M19.3333 13.3333H4.66667V20H19.3333V13.3333Z" fill="black" fillOpacity="0.9"/>
     <path d="M19.3333 4H4.66667V10.6667H19.3333V4Z" fill="black" fillOpacity="0.5"/>
  </svg>
);

const RailwayLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-black">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const FlyLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-purple-600">
     <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.5"/>
     <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
     <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'security'>('profile');

  // New Profile State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  
  // Legacy Security State
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Integrations State
  const [connections, setConnections] = useState(MOCK_CONNECTIONS);
  const [connectionIds, setConnectionIds] = useState<Record<string, string>>({});
  const [apiKeys, setApiKeys] = useState({ render: '', fly: '', vercel: '' });
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        setFullName(user.displayName || '');
        setEmail(user.email || '');
        setHeadline(user.headline || '');
        setBio(user.bio || '');
        setLocation(user.location || '');
        setLinkedin(user.linkedin || '');
        setGithub(user.github || '');
        setLoading(false);
      }
    };
    
    if (user) {
        loadProfile();
    }
    
    fetchDevices();
    fetchConnections();
  }, [user]);

  const fetchDevices = async () => {
    try {
      const res = await apiClient.get('/devices');
      setDevices(res.data || []);
    } catch (err: any) {
      console.error('Failed to load devices', err);
    }
  };

  const fetchConnections = async () => {
    try {
        const response = await apiClient.get('/connections');
        const newConnState = { ...MOCK_CONNECTIONS };
        const newConnIds: Record<string, string> = {};
        
        response.data.forEach((c: any) => {
            const provider = c.provider.toLowerCase();
            if (provider in newConnState) {
                (newConnState as any)[provider] = true;
                newConnIds[provider] = c._id;
            }
        });
        setConnections(newConnState);
        setConnectionIds(newConnIds);
    } catch (err) {
        console.error('Failed to fetch connections:', err);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
            displayName: fullName.trim(),
            full_name: fullName.trim(),
            headline: headline.trim(),
            bio: bio.trim(),
            location: location.trim(),
            linkedin: linkedin.trim(),
            github: github.trim()
        }
      });
      if (error) throw error;
      toast({ title: 'Profile Details Saved', description: 'Your profile has been successfully updated.' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      await apiClient.post('/profile/send-email-otp', { email });
      setOtpSent(true);
      toast({ title: 'OTP sent', description: `Check your inbox at ${email}.` });
    } catch (err: any) {
      toast({ title: 'Failed to send OTP', variant: 'destructive' });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmail = async () => {
    setVerifying(true);
    try {
      await apiClient.post('/profile/verify-email', { email, otp: otpValue });
      setOtpSent(false);
      toast({ title: 'Email verified', description: 'Your email has been updated.' });
    } catch (err: any) {
      toast({ title: 'Verification failed', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  // Avatar Upload Handlers
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarClick = () => {
    document.getElementById('avatar-upload')?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { data: sigData } = await apiClient.get('/profile/cloudinary-signature');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sigData.api_key);
      formData.append('timestamp', sigData.timestamp);
      formData.append('signature', sigData.signature);
      formData.append('public_id', sigData.public_id);
      formData.append('overwrite', 'true');
      
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed');

      await supabase.auth.updateUser({
        data: { photoURL: uploadData.secure_url }
      });
      
      toast({ title: 'Profile Picture Updated', description: 'Your avatar has been updated successfully.' });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  // Device Handlers
  const handleSetMainDevice = async (fingerprint: string) => {
    try {
      await apiClient.post('/devices/set-main', { device_fingerprint: fingerprint });
      toast({ title: 'Main Device Updated' });
      fetchDevices();
    } catch (err: any) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  // Integration Handlers
  const handleConnectProvider = async (provider: 'digitalocean' | 'railway' | 'vercel' | 'render' | 'fly') => {
    if (provider === 'digitalocean' || provider === 'railway') {
        window.location.href = `/api/oauth/${provider}`;
        return;
    }

    const token = apiKeys[provider as keyof typeof apiKeys];
    if (!token) return;

    setIsConnecting(provider);
    try {
        const res = await apiClient.post('/connections', {
            name: `${provider} Connection`,
            provider: provider.charAt(0).toUpperCase() + provider.slice(1),
            config: { apiKey: token }
        });
        setConnections(prev => ({ ...prev, [provider]: true }));
        setConnectionIds(prev => ({ ...prev, [provider]: res.data.connection._id }));
        setApiKeys(prev => ({ ...prev, [provider]: '' }));
        toast({ title: `${provider} Connected Successfully` });
    } catch (err) {
        toast({ title: `Failed to connect ${provider}`, variant: 'destructive' });
    } finally {
        setIsConnecting(null);
    }
  };

  const handleDisconnectProvider = async (provider: keyof typeof MOCK_CONNECTIONS) => {
      const connId = connectionIds[provider];
      
      if (!window.confirm(`Are you sure you want to delete the ${provider} API key? This will break dependent services.`)) return;

      setIsConnecting(provider);
      try {
          if (connId) {
              await apiClient.delete(`/connections/${connId}`);
          }
          
          setConnections(prev => ({ ...prev, [provider]: false }));
          setConnectionIds(prev => {
              const newIds = { ...prev };
              delete newIds[provider];
              return newIds;
          });
          toast({ title: `${provider} Disconnected` });
      } catch (err) {
          toast({ title: `Failed to disconnect ${provider}`, variant: 'destructive' });
      } finally {
          setIsConnecting(null);
      }
  };

  const hasMainDevice = devices.some(d => d.is_main);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background p-5 text-slate-900 no-scrollbar md:p-7 animate-in fade-in duration-300">

      {/* Settings Inline Navbar */}
      <div className="mb-6 flex w-full justify-start border-b border-border/70">
          <div className="flex gap-8">
              <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-4 text-sm font-bold transition-all ${activeTab === 'profile' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  Profile Details
              </button>
              <button
                  onClick={() => setActiveTab('integrations')}
                  className={`pb-4 text-sm font-bold transition-all ${activeTab === 'integrations' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  Integrations
              </button>
              <button
                  onClick={() => setActiveTab('security')}
                  className={`pb-4 text-sm font-bold transition-all ${activeTab === 'security' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  Security & Devices
              </button>
          </div>
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Basic Information Block */}
                    <div className="lg:col-span-2 border border-gray-100 rounded-3xl p-8 space-y-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-black mb-1">Basic Information</h2>
                            <p className="text-xs text-gray-500">Your basic profile information visible to the community</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">Full Name</label>
                                <input 
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm bg-gray-50/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">Email</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setOtpSent(false); }}
                                        placeholder="johndoe@gmail.com"
                                        className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm flex-1 bg-gray-50/50"
                                    />
                                    {email !== user?.email && !otpSent && (
                                        <Button onClick={handleSendOtp} disabled={sendingOtp} className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-black border border-gray-200 px-6">
                                            {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                        </Button>
                                    )}
                                </div>
                                
                                {otpSent && (
                                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                                        <p className="text-xs font-medium text-gray-600">Enter the 6-digit code sent to {email}</p>
                                        <div className="flex gap-3">
                                            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                                                <InputOTPGroup className="gap-1">
                                                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-12 w-12 border-gray-300 rounded-md bg-white text-lg font-bold" />)}
                                                </InputOTPGroup>
                                            </InputOTP>
                                            <Button onClick={handleVerifyEmail} disabled={verifying || otpValue.length !== 6} className="h-12 bg-black text-white hover:bg-gray-800 rounded-xl px-6">
                                                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Code"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Profile Picture Block */}
                    <div className="border border-gray-100 rounded-3xl p-8 flex flex-col items-center text-center">
                        <h2 className="text-xl font-bold text-black mb-1">Profile Picture</h2>
                        <p className="text-xs text-gray-500 mb-8 max-w-[200px]">Upload a profile picture to personalize your account</p>
                        
                        <div 
                            onClick={handleAvatarClick}
                            className={`relative group cursor-pointer w-28 h-28 rounded-full border-2 ${uploadingAvatar ? 'border-cyan-500' : 'border-dashed border-gray-300 hover:border-gray-400'} flex items-center justify-center overflow-hidden transition-colors bg-gray-50`}
                        >
                            <input 
                                type="file" 
                                id="avatar-upload" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileChange} 
                                disabled={uploadingAvatar}
                            />
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className={`w-full h-full object-cover ${uploadingAvatar ? 'opacity-50' : ''}`} />
                            ) : (
                                <User className={`w-10 h-10 text-gray-400 ${uploadingAvatar ? 'opacity-50' : ''}`} />
                            )}
                            
                            {uploadingAvatar ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-white text-sm font-bold flex items-center gap-2"><Pencil className="w-3 h-3"/> Edit</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Professional Details Block */}
                <div className="mt-12">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-black mb-1">Professional Details</h2>
                        <p className="text-xs text-gray-500">Help others discover and connect with you.</p>
                    </div>

                    <div className="space-y-6 max-w-3xl">
                        <div>
                            <label className="block text-sm font-bold text-black mb-1">Professional Headline</label>
                            <input 
                                type="text"
                                value={headline}
                                onChange={e => setHeadline(e.target.value)}
                                placeholder="e.g., Senior Product Designer at Google"
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm bg-gray-50/50"
                            />
                            <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">{headline.length}/120 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-1">Bio</label>
                            <textarea 
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                placeholder="Tell us about yourself, your interests, and what you are passionate about"
                                className="w-full h-28 p-4 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm resize-none bg-gray-50/50"
                            />
                            <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">{bio.length}/500 characters</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-black mb-1">Location</label>
                                <input 
                                    type="text"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    placeholder="City, Country"
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm bg-gray-50/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">LinkedIn Profile</label>
                                <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 bg-gray-50/50 transition-all h-12">
                                    <div className="flex items-center px-3 bg-gray-100 border-r border-gray-200 text-gray-500 text-sm select-none shrink-0">
                                        https://linkedin.com/in/
                                    </div>
                                    <input 
                                        type="text"
                                        value={linkedin}
                                        onChange={(e) => {
                                            let val = e.target.value;
                                            if (val.includes('linkedin.com/in/')) {
                                                val = val.split('linkedin.com/in/')[1].split('/')[0] || '';
                                            } else if (val.includes('linkedin.com/')) {
                                                val = val.split('linkedin.com/')[1].split('/')[0] || '';
                                            }
                                            setLinkedin(val.replace(/\/$/, ''));
                                        }}
                                        placeholder="username"
                                        className="w-full h-full px-3 outline-none text-sm bg-transparent min-w-0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-1">GitHub Profile</label>
                                <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 bg-gray-50/50 transition-all h-12">
                                    <div className="flex items-center px-3 bg-gray-100 border-r border-gray-200 text-gray-500 text-sm select-none shrink-0">
                                        https://github.com/
                                    </div>
                                    <input 
                                        type="text"
                                        value={github}
                                        onChange={(e) => {
                                            let val = e.target.value;
                                            if (val.includes('github.com/')) {
                                                val = val.split('github.com/')[1].split('/')[0] || '';
                                            }
                                            setGithub(val.replace(/\/$/, ''));
                                        }}
                                        placeholder="username"
                                        className="w-full h-full px-3 outline-none text-sm bg-transparent min-w-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between">
                        <Button 
                            onClick={logout}
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-xl px-8 h-12 text-sm font-bold transition-all"
                        >
                            Sign Out
                        </Button>
                        <Button 
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="bg-[#0A0A0A] hover:bg-black text-white rounded-xl px-8 h-12 text-sm font-bold shadow-lg shadow-black/5 hover:scale-[1.02] transition-all"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Profile Details
                        </Button>
                    </div>

                </div>
            </div>
        )}

        {/* --- INTEGRATIONS TAB --- */}
        {activeTab === 'integrations' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-black mb-1">Infrastructure Connections</h2>
                    <p className="text-xs text-gray-500">Manage your cloud provider integrations. Connect your infrastructure to enable automated deployments, monitoring, and scaling.</p>
                </div>

                {/* 1-Click OAuth */}
                <div className="space-y-6 mb-12">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <CloudLightning className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-bold text-black">OAuth Integrations (1-Click)</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* DigitalOcean */}
                        <div className={`border rounded-3xl p-6 flex flex-col justify-between transition-all ${connections.digitalocean ? 'border-green-200 bg-green-50/10' : 'border-gray-100 bg-gray-50/30 hover:border-blue-100'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <DigitalOceanLogo />
                                    {connections.digitalocean ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border border-green-200">
                                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span></span>
                                            <span className="text-xs font-bold text-green-800">Connected</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                                            <div className="h-2 w-2 rounded-full bg-gray-400" />
                                            <span className="text-xs font-bold text-gray-600">Disconnected</span>
                                        </div>
                                    )}
                                </div>
                                <h4 className="font-bold text-black mb-2">DigitalOcean</h4>
                                <p className="text-sm text-gray-500 mb-6 line-clamp-2">Manage droplets and Kubernetes clusters via OAuth integration.</p>
                            </div>
                            {connections.digitalocean ? (
                                <Button onClick={() => handleDisconnectProvider('digitalocean')} disabled={isConnecting === 'digitalocean'} className="w-full bg-white hover:bg-red-50 text-red-600 font-bold rounded-xl h-11 border border-red-200 transition-colors flex items-center justify-center gap-2">
                                    {isConnecting === 'digitalocean' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4"/> Disconnect</>}
                                </Button>
                            ) : (
                                <Button onClick={() => handleConnectProvider('digitalocean')} disabled={isConnecting === 'digitalocean'} className="w-full bg-[#0080FF] hover:bg-[#006bd6] text-white font-bold rounded-xl h-11 shadow-lg shadow-blue-500/20">
                                    Sign in with DigitalOcean
                                </Button>
                            )}
                        </div>

                        {/* Railway */}
                        <div className={`border rounded-3xl p-6 flex flex-col justify-between transition-all ${connections.railway ? 'border-green-200 bg-green-50/10' : 'border-gray-100 bg-gray-50/30 hover:border-purple-100'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <RailwayLogo />
                                    {connections.railway ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border border-green-200">
                                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span></span>
                                            <span className="text-xs font-bold text-green-800">Connected</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                                            <div className="h-2 w-2 rounded-full bg-gray-400" />
                                            <span className="text-xs font-bold text-gray-600">Disconnected</span>
                                        </div>
                                    )}
                                </div>
                                <h4 className="font-bold text-black mb-2">Railway</h4>
                                <p className="text-sm text-gray-500 mb-6 line-clamp-2">Connect securely via OAuth 2.0 to sync infrastructure services.</p>
                            </div>
                            {connections.railway ? (
                                <Button onClick={() => handleDisconnectProvider('railway')} disabled={isConnecting === 'railway'} className="w-full bg-white hover:bg-red-50 text-red-600 font-bold rounded-xl h-11 border border-red-200 transition-colors flex items-center justify-center gap-2">
                                    {isConnecting === 'railway' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4"/> Disconnect</>}
                                </Button>
                            ) : (
                                <Button onClick={() => handleConnectProvider('railway')} disabled={isConnecting === 'railway'} className="w-full bg-[#0B0D0E] hover:bg-black text-white font-bold rounded-xl h-11 shadow-lg shadow-black/10">
                                    Connect Railway
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Manual API Connections */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Key className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-bold text-black">Manual API Connections</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {/* Vercel */}
                        <div className={`border rounded-3xl p-6 flex flex-col transition-all ${connections.vercel ? 'border-green-200 bg-green-50/10' : 'border-gray-100 bg-gray-50/30 hover:border-gray-300'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <VercelLogo />
                                {connections.vercel ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border border-green-200">
                                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span></span>
                                        <span className="text-xs font-bold text-green-800">Connected</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                                        <span className="text-xs font-bold text-gray-600">Disconnected</span>
                                    </div>
                                )}
                            </div>
                            <h4 className="font-bold text-black mb-2">Vercel</h4>
                            <p className="text-sm text-gray-500 mb-6 flex-grow">Enter your Personal Access Token to sync deployments and domains.</p>
                            
                            {connections.vercel ? (
                                <Button onClick={() => handleDisconnectProvider('vercel')} disabled={isConnecting === 'vercel'} className="w-full bg-white hover:bg-red-50 text-red-600 font-bold rounded-xl h-11 border border-red-200 transition-colors flex items-center justify-center gap-2">
                                    {isConnecting === 'vercel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4"/> Delete API Key</>}
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <input 
                                        type="password"
                                        value={apiKeys.vercel}
                                        onChange={(e) => setApiKeys(p => ({ ...p, vercel: e.target.value }))}
                                        placeholder="vk1_xxxxxxxxxxxxxxxx"
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-gray-900 outline-none transition-all text-sm font-mono bg-white"
                                    />
                                    <Button onClick={() => handleConnectProvider('vercel')} disabled={isConnecting === 'vercel' || !apiKeys.vercel} className="w-full bg-black hover:bg-gray-800 text-white font-bold rounded-xl h-11 shadow-lg shadow-black/10">
                                        {isConnecting === 'vercel' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect Key"}
                                    </Button>
                                    <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center justify-center gap-1 mt-2 font-medium">
                                        Get Token <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Render */}
                        <div className={`border rounded-3xl p-6 flex flex-col transition-all ${connections.render ? 'border-green-200 bg-green-50/10' : 'border-gray-100 bg-gray-50/30 hover:border-gray-300'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <RenderLogo />
                                {connections.render ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border border-green-200">
                                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span></span>
                                        <span className="text-xs font-bold text-green-800">Connected</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                                        <span className="text-xs font-bold text-gray-600">Disconnected</span>
                                    </div>
                                )}
                            </div>
                            <h4 className="font-bold text-black mb-2">Render</h4>
                            <p className="text-sm text-gray-500 mb-6 flex-grow">Enter your API key to manage web services and databases.</p>
                            
                            {connections.render ? (
                                <Button onClick={() => handleDisconnectProvider('render')} disabled={isConnecting === 'render'} className="w-full bg-white hover:bg-red-50 text-red-600 font-bold rounded-xl h-11 border border-red-200 transition-colors flex items-center justify-center gap-2">
                                    {isConnecting === 'render' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4"/> Delete API Key</>}
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <input 
                                        type="password"
                                        value={apiKeys.render}
                                        onChange={(e) => setApiKeys(p => ({ ...p, render: e.target.value }))}
                                        placeholder="rnd_QK9..."
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-gray-900 outline-none transition-all text-sm font-mono bg-white"
                                    />
                                    <Button onClick={() => handleConnectProvider('render')} disabled={isConnecting === 'render' || !apiKeys.render} className="w-full bg-black hover:bg-gray-800 text-white font-bold rounded-xl h-11 shadow-lg shadow-black/10">
                                        {isConnecting === 'render' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect Key"}
                                    </Button>
                                    <a href="https://dashboard.render.com/u/settings#api-keys" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center justify-center gap-1 mt-2 font-medium">
                                        Get Token <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Fly.io */}
                        <div className={`border rounded-3xl p-6 flex flex-col transition-all ${connections.fly ? 'border-green-200 bg-green-50/10' : 'border-gray-100 bg-gray-50/30 hover:border-gray-300'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <FlyLogo />
                                {connections.fly ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border border-green-200">
                                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span></span>
                                        <span className="text-xs font-bold text-green-800">Connected</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                                        <span className="text-xs font-bold text-gray-600">Disconnected</span>
                                    </div>
                                )}
                            </div>
                            <h4 className="font-bold text-black mb-2">Fly.io</h4>
                            <p className="text-sm text-gray-500 mb-6 flex-grow">Enter your Personal Access Token to deploy edge machines.</p>
                            
                            {connections.fly ? (
                                <Button onClick={() => handleDisconnectProvider('fly')} disabled={isConnecting === 'fly'} className="w-full bg-white hover:bg-red-50 text-red-600 font-bold rounded-xl h-11 border border-red-200 transition-colors flex items-center justify-center gap-2">
                                    {isConnecting === 'fly' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4"/> Delete API Key</>}
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <input 
                                        type="password"
                                        value={apiKeys.fly}
                                        onChange={(e) => setApiKeys(p => ({ ...p, fly: e.target.value }))}
                                        placeholder="fly_token..."
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-gray-900 outline-none transition-all text-sm font-mono bg-white"
                                    />
                                    <Button onClick={() => handleConnectProvider('fly')} disabled={isConnecting === 'fly' || !apiKeys.fly} className="w-full bg-[#24185B] hover:bg-[#1a1142] text-white font-bold rounded-xl h-11 shadow-lg shadow-purple-500/10">
                                        {isConnecting === 'fly' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect Key"}
                                    </Button>
                                    <a href="https://fly.io/user/personal_access_tokens" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center justify-center gap-1 mt-2 font-medium">
                                        Get Token <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        )}

        {/* --- SECURITY & DEVICES TAB --- */}
        {activeTab === 'security' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                {!hasMainDevice && (
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl flex items-center justify-between mb-8 shadow-lg shadow-indigo-900/20">
                        <div className="flex items-center gap-4">
                            <ShieldAlert className="w-8 h-8 text-blue-300" />
                            <div>
                                <h4 className="font-bold text-lg mb-1">Elevate your security to Zero-Trust</h4>
                                <p className="text-sm text-blue-200 opacity-90">Set a Mobile Device as your Main Authenticator to remotely approve logins.</p>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex items-center gap-3 mb-8">
                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-xl font-bold text-black">Security & Devices</h2>
                </div>
                
                {devices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-3xl">
                        <Laptop className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-bold text-gray-400">No active devices found.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {devices.map((device) => {
                        const isMobile = device.device_name?.toLowerCase().includes('iphone') || device.device_name?.toLowerCase().includes('android') || device.device_name?.toLowerCase().includes('mobile');
                        return (
                            <div key={device.id} className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${device.is_main ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                        {isMobile ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-1">
                                            {device.device_name || 'Unknown Device'}
                                            {device.is_main && (
                                            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold tracking-wide uppercase">Main Authenticator</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono">ID: {device.device_fingerprint}</p>
                                    </div>
                                </div>
                                
                                {!device.is_main && (
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleSetMainDevice(device.device_fingerprint)}
                                        className="text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl h-10 px-4"
                                    >
                                        Set as Main Device
                                    </Button>
                                )}
                            </div>
                        );
                        })}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
