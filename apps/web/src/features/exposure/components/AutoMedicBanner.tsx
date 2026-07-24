import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AutoMedicBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gray-900 shadow-xl shadow-gray-200/50 border border-gray-800 p-6 flex flex-col justify-between h-[180px] group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-cyan-500/50" onClick={() => navigate('/auto-medic')}>
      {/* Animated gradient background mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl opacity-60 mix-blend-screen transition-opacity group-hover:opacity-100">
        <div className="absolute -top-[40%] -right-[20%] h-[150%] w-[100%] rounded-full bg-[radial-gradient(circle,rgba(0,194,203,0.4)_0%,transparent_60%)] blur-2xl" />
        <div className="absolute -bottom-[30%] -left-[10%] h-[120%] w-[120%] rounded-full bg-[radial-gradient(circle,rgba(108,99,255,0.3)_0%,transparent_60%)] blur-2xl" />
        <div className="absolute top-[20%] left-[20%] h-[100%] w-[100%] rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.25)_0%,transparent_60%)] blur-2xl" />
      </div>

      <div className="relative z-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-400" />
          Powered by AI
        </h3>
        <p className="font-title text-3xl font-black text-white mt-1 tracking-tight">
          Auto-<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Medic</span>
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 font-medium max-w-[60%]">Automate remediation of critical vulnerabilities instantly.</p>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]">
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
