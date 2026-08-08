import React, { useState } from 'react';
import { Search, Loader2, Plus, Globe, Wifi, ScanLine } from 'lucide-react';
import { useManualScan, useAddManualAsset } from '../hooks';

export const ScanControlCard = () => {
  const [domain, setDomain] = useState('');
  const { mutate: runScan, isPending: isScanning } = useManualScan();
  const { mutate: addAsset, isPending: isAdding } = useAddManualAsset();

  const handleScan = () => {
    if (!domain.trim()) return;
    runScan(domain.trim());
    setDomain('');
  };

  const handleAdd = () => {
    if (!domain.trim()) return;
    addAsset({ asset_type: 'DOMAIN', value: domain.trim() });
    setDomain('');
  };

  if (isScanning) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-xl flex flex-col items-center justify-center gap-4 min-h-[200px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[200%] w-[200%] rounded-full bg-[radial-gradient(circle,rgba(0,194,203,0.12)_0%,transparent_55%)]" />
        </div>
        <div className="relative flex items-center justify-center">
          <div className="absolute h-20 w-20 rounded-full border-2 border-cyan-500/20 animate-ping" />
          <div className="absolute h-14 w-14 rounded-full border-2 border-cyan-500/30 animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30">
            <ScanLine size={20} className="text-cyan-400 animate-pulse" />
          </div>
        </div>
        <div className="relative z-10 text-center">
          <p className="text-sm font-black text-white">Deep Scan Running</p>
          <p className="text-[10px] font-semibold text-white/40 mt-1 uppercase tracking-widest">Probing perimeter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-xl flex flex-col gap-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -top-1/2 -right-1/4 h-full w-3/4 rounded-full bg-[radial-gradient(circle,rgba(108,99,255,0.12)_0%,transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Active Scanner</h3>
          <p className="text-xs text-white/25 mt-0.5">Target a domain for probing</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10">
          <Wifi size={14} className="text-white/30" />
        </div>
      </div>

      <div className="relative z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Globe size={14} className="text-white/30" />
          </div>
          <input
            type="text"
            placeholder="e.g. servx.app"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={isAdding}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-cyan-500/50 focus:bg-white/8 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
            onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
          />
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-2">
        <button
          onClick={handleScan}
          disabled={!domain.trim() || isAdding}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-900 transition-all hover:bg-gray-100 disabled:opacity-40 shadow-lg shadow-black/20"
        >
          <Search size={15} />
          Run Deep Scan
        </button>

        <button
          onClick={handleAdd}
          disabled={!domain.trim() || isAdding}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-white/50 transition-all hover:bg-white/5 hover:text-white/80 disabled:opacity-40"
        >
          {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add to Monitoring Pool
        </button>
      </div>
    </div>
  );
};
