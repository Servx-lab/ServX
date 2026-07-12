import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getDeviceUUID } from '@/lib/deviceUtils';
import apiClient, { buildApiBaseUrl } from '@/lib/apiClient';
import { ShieldAlert, Check, X, Smartphone, Laptop, MapPin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PendingRequest {
  device_fingerprint: string;
  device_name: string;
  last_ip: string;
  location?: string;
  isp?: string;
}

const ApprovalDrawer = () => {
  const [isMainDevice, setIsMainDevice] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    const checkMainDeviceStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const fingerprint = await getDeviceUUID();
        const res = await apiClient.get('/devices');
        const myDevice = res.data.find((d: any) => d.device_fingerprint === fingerprint);
        
        if (myDevice && myDevice.is_main) {
          setIsMainDevice(true);
        }
      } catch (err) {
        console.error('Failed to check main device status', err);
      }
    };
    checkMainDeviceStatus();
  }, []);

  useEffect(() => {
    if (!isMainDevice) return;

    let sse: EventSource | null = null;

    const connectSSE = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
      const apiBase = buildApiBaseUrl(rawUrl);
      const isRelative = apiBase.startsWith("/") || !apiBase.startsWith("http");
      const absoluteBase = isRelative
        ? `${window.location.protocol}//${window.location.host}${apiBase.replace(/\/$/, "")}`
        : apiBase.replace(/\/$/, "");

      const sseUrl = `${absoluteBase}/devices/listen-requests?token=${session.access_token}`;
      sse = new EventSource(sseUrl);

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'login_request') {
            setPendingRequests((prev) => {
              // Prevent duplicates
              if (prev.find(r => r.device_fingerprint === data.device_fingerprint)) return prev;
              return [...prev, data];
            });
            // Play a subtle notification sound or vibrate if on mobile
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          } else if (data.event === 'device_resolved') {
             // If another tab/device resolved it, remove it from queue
             setPendingRequests((prev) => prev.filter(r => r.device_fingerprint !== data.device_fingerprint));
          }
        } catch (err) {
          // heartbeat
        }
      };

      sse.onerror = () => {
        sse?.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (sse) sse.close();
    };
  }, [isMainDevice]);

  const handleAction = async (fingerprint: string, status: 'APPROVED' | 'DENIED') => {
    try {
      await apiClient.post('/devices/approve', {
        device_fingerprint: fingerprint,
        status
      });
      toast.success(status === 'APPROVED' ? 'Device Approved' : 'Device Denied');
      setPendingRequests(prev => prev.filter(r => r.device_fingerprint !== fingerprint));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process request');
    }
  };

  if (pendingRequests.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none flex flex-col gap-4 items-center">
      {pendingRequests.map((req) => {
        const isMobile = req.device_name?.toLowerCase().includes('iphone') || req.device_name?.toLowerCase().includes('android') || req.device_name?.toLowerCase().includes('mobile');
        
        return (
          <div 
            key={req.device_fingerprint} 
            className="w-full max-w-md pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-500"
          >
            <div className="backdrop-blur-xl bg-[#0C1017]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 px-5 py-4 flex items-center gap-3 border-b border-cyan-500/20">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse shrink-0">
                  <ShieldAlert className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-tight">Login Attempt Blocked</h3>
                  <p className="text-cyan-200 text-xs opacity-90">Zero-Trust Authorization Required</p>
                </div>
              </div>
              
              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-gray-400 shrink-0">
                    {isMobile ? <Smartphone className="w-8 h-8" /> : <Laptop className="w-8 h-8" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{req.device_name || 'Unrecognized Terminal'}</p>
                    <div className="flex gap-2 mt-1 items-center">
                      <span className="text-xs text-gray-500 font-mono tracking-wider">{req.last_ip}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span className="text-xs text-gray-500 font-mono tracking-wider truncate w-24">ID:{req.device_fingerprint.substring(0,6)}</span>
                    </div>
                  </div>
                </div>

                {/* Geo-Location Panel */}
                {(req.location || req.isp) && (
                  <div className="bg-white/5 rounded-xl border border-white/5 p-3 flex flex-col gap-2">
                    {req.location && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-gray-200 font-medium truncate">{req.location}</span>
                      </div>
                    )}
                    {req.isp && (
                      <div className="flex items-center gap-3 text-sm">
                        <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-gray-400 truncate">{req.isp}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={() => handleAction(req.device_fingerprint, 'DENIED')}
                    variant="outline"
                    className="flex-1 h-12 bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl font-bold transition-all"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Deny
                  </Button>
                  <Button 
                    onClick={() => handleAction(req.device_fingerprint, 'APPROVED')}
                    className="flex-1 h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] font-bold transition-all border-none"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApprovalDrawer;
