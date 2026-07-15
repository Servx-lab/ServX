import React, { useEffect, useState } from 'react';
import { useAuth } from './hooks';
import { supabase } from '@/lib/supabase';
import apiClient, { buildApiBaseUrl } from '@/lib/apiClient';
import { getDeviceUUID } from '@/lib/deviceUtils';
import { Laptop, Smartphone, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { HowItWorksAnimation } from './HowItWorksAnimation';

const DeviceOnboarding = () => {
    const { user } = useAuth();
    const [qrUrl, setQrUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [deviceUUID, setDeviceUUID] = useState<string>("");

    useEffect(() => {
        const fetchUUID = async () => {
          const id = await getDeviceUUID();
          setDeviceUUID(id);
        };
        fetchUUID();
    }, []);

    useEffect(() => {
        const url = window.location.origin + '/auth';
        setQrUrl(url);
    }, []);

    // SSE Listener to unlock Desktop when Mobile sets itself as Main
    useEffect(() => {
        if (!deviceUUID) return;
        let sse: EventSource | null = null;
        
        const connectApprovalSSE = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
            const apiBase = buildApiBaseUrl(rawUrl);
            const absoluteBase = (apiBase.startsWith("/") || !apiBase.startsWith("http")) 
                ? `${window.location.protocol}//${window.location.host}${apiBase.replace(/\/$/, "")}`
                : apiBase.replace(/\/$/, "");

            const sseUrl = `${absoluteBase}/devices/listen-approval/${deviceUUID}?token=${session.access_token}`;
            sse = new EventSource(sseUrl);

            sse.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === "device_resolved" && data.status === "APPROVED") {
                        toast.success("🎉 Phone paired! Unlocking dashboard...");
                        setTimeout(() => window.location.reload(), 1500);
                    }
                } catch(e) {}
            };
        };

        connectApprovalSSE();
        return () => { if (sse) sse.close(); };
    }, [deviceUUID]);

    const handleSetAsMain = async () => {
        setIsLoading(true);
        try {
            // Find current device ID
            const res = await apiClient.get('/devices');
            const myDevice = res.data.find((d: any) => d.device_fingerprint === deviceUUID);
            
            if (myDevice) {
                await apiClient.post('/devices/set-main', { deviceId: myDevice.id });
                // Also approve ourselves just in case
                await apiClient.post('/devices/approve', { device_fingerprint: deviceUUID, status: 'APPROVED' });
                toast.success("Master Authenticator Set!");
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (err) {
            toast.error("Failed to setup device");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen max-h-screen w-full bg-white font-sans overflow-hidden">
            {/* 70% White Section (Left) */}
            <div className="w-full md:w-[70%] h-full flex flex-col justify-center px-8 md:px-24 py-12 relative bg-slate-50">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-5 pointer-events-none filter invert" />
                
                <div className="w-full h-full relative z-10 mx-auto md:mx-0 flex flex-col min-h-0">
                    <div className="max-w-xl shrink-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-4 w-full">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                Welcome, {user?.displayName}.
                            </h1>
                            <Button 
                                onClick={handleSetAsMain}
                                disabled={isLoading}
                                className="h-12 px-6 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-md shrink-0"
                            >
                                {isLoading ? "Setting up..." : "Set as Master Authenticator"}
                                {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                            </Button>
                        </div>

                        <p className="text-slate-600 text-lg leading-relaxed mb-6">
                            Your account requires a Main Device to approve all future logins across your network. 
                            We recommend using your Mobile Phone for the most secure experience, but you can also choose to use this desktop.
                        </p>
                    </div>

                    <HowItWorksAnimation />
                </div>
            </div>

            {/* 30% Black Section (Right) */}
            <div className="w-full md:w-[30%] min-h-[500px] bg-[#0A0D14] flex flex-col items-center justify-center px-8 md:px-12 py-12 relative overflow-hidden border-t md:border-t-0 md:border-l border-slate-800">
                {/* Glow effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center text-center w-full">
                    <div className="w-16 h-16 bg-cyan-950/50 rounded-full flex items-center justify-center border border-cyan-500/20 mb-6">
                        <Smartphone className="w-8 h-8 text-cyan-400" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white mb-2">Use Mobile App</h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-8">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Recommended
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.15)] mb-8 transform transition-transform hover:scale-105">
                        {qrUrl && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`} alt="Login QR Code" className="w-[180px] h-[180px]" />}
                    </div>

                    <div className="space-y-4 w-full max-w-xs mx-auto">
                        <div className="flex items-center gap-3 text-left bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">1</div>
                            <p className="text-sm text-slate-300 font-medium">Scan code with your phone</p>
                        </div>
                        <div className="flex items-center gap-3 text-left bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">2</div>
                            <p className="text-sm text-slate-300 font-medium">Log in on your mobile browser</p>
                        </div>
                        <div className="flex items-center gap-3 text-left bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">3</div>
                            <p className="text-sm text-slate-300 font-medium">Set mobile as Main Device</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceOnboarding;
