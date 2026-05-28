import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceUUID } from "@/lib/deviceUtils";
import { buildApiBaseUrl } from "@/lib/apiClient";
import { ShieldAlert, Laptop, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DevicePendingTakeover = () => {
  const [deviceUUID, setDeviceUUID] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(true);

  useEffect(() => {
    const fetchUUID = async () => {
      const id = await getDeviceUUID();
      setDeviceUUID(id);
    };
    fetchUUID();
  }, []);

  // ─── Real-Time SSE Listener for this specific Device Fingerprint ───
  useEffect(() => {
    if (!deviceUUID) return;

    let sse: EventSource | null = null;

    const connectApprovalSSE = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
      const apiBase = buildApiBaseUrl(rawUrl);
      const isRelative = apiBase.startsWith("/") || !apiBase.startsWith("http");
      const absoluteBase = isRelative
        ? `${window.location.protocol}//${window.location.host}${apiBase.replace(/\/$/, "")}`
        : apiBase.replace(/\/$/, "");

      // Route parameters token authorization fallback mapped in Phase 3/4
      const sseUrl = `${absoluteBase}/devices/listen-approval/${deviceUUID}?token=${session.access_token}`;

      sse = new EventSource(sseUrl);

      sse.onopen = () => {
        setIsConnecting(false);
      };

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "device_resolved") {
            if (data.status === "APPROVED") {
              toast.success("🎉 Device authorized successfully! Completing login...");
              setTimeout(() => {
                // Instantly reload and re-evaluate session, which will now pass APPROVED check
                window.location.reload();
              }, 1500);
            } else if (data.status === "DENIED") {
              toast.error("❌ Access denied. This device has been rejected.");
              setTimeout(handleLogout, 2000);
            }
          }
        } catch (err) {
          // Heartbeats
        }
      };

      sse.onerror = () => {
        sse?.close();
        setTimeout(connectApprovalSSE, 5000);
      };
    };

    connectApprovalSSE();

    return () => {
      if (sse) sse.close();
    };
  }, [deviceUUID]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen w-full bg-[#070A0F] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Premium Glassmorphic / Glow elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-5 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-[#0C1017]/80 border border-cyan-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          {/* Glowing border accent */}
          <div className="absolute inset-0 border border-cyan-500/10 rounded-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center">
            {/* Pulsing Animated Shield */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 rounded-3xl p-5 shadow-inner">
                <ShieldAlert className="w-12 h-12 animate-pulse" />
              </div>
            </div>

            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Unrecognized Device Signature
            </h2>
            
            <p className="text-xs text-gray-400 mt-2 max-w-sm px-2">
              This terminal is unregistered under our Zero-Trust validation matrices. Access is restricted until approved.
            </p>

            {/* Waiting Spinner Card */}
            <div className="w-full bg-[#111622]/60 border border-gray-800 rounded-2xl p-4 my-6 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-white">
                  {isConnecting ? "Establishing link..." : "Awaiting Authorization..."}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Approve this device inside your registered Main Device governance portal.
                </p>
              </div>
            </div>

            {/* Hardware-locked Fingerprint Watermark */}
            <div className="w-full border border-gray-800/40 rounded-xl bg-black/25 p-3 mb-6 font-mono text-[10px] text-gray-500 tracking-wider">
              <div className="flex justify-between items-center mb-1">
                <span>HARDWARE FINGERPRINT</span>
                <span className="text-cyan-500/80 font-bold uppercase">Pending</span>
              </div>
              <p className="truncate text-left select-all cursor-pointer font-semibold text-gray-400 hover:text-cyan-300 transition-colors">
                DEVICE-{deviceUUID.toUpperCase()}
              </p>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full h-11 border-gray-800 bg-transparent text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all font-semibold"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cancel Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevicePendingTakeover;
