import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronUp, Loader2, Target, Globe, AlertCircle
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/features/auth/AuthContext";
import { useScanStream, Finding, ScannerType, ScannerStatus } from "../hooks/useScanStream";

function getDeviceUUID(): string {
  const KEY = "orizon_device_uuid";
  let uuid = localStorage.getItem(KEY);
  if (!uuid) { uuid = crypto.randomUUID(); localStorage.setItem(KEY, uuid); }
  return uuid;
}

const SEVERITY_CONFIG = {
  CRITICAL: { dot: "bg-purple-500" },
  HIGH:     { dot: "bg-red-500" },
  MODERATE: { dot: "bg-amber-500" },
  LOW:      { dot: "bg-emerald-500" },
} as const;

const SCANNER_META: Record<ScannerType, { label: string }> = {
  sast:   { label: "SAST" },
  secret: { label: "Secrets" },
  sca:    { label: "SCA" },
  iac:    { label: "IaC" },
  dast:   { label: "DAST" },
};

interface RepoSummary {
  id: number; name: string; full_name: string; language: string | null; owner?: { login: string };
}

const RepoSelector = ({ repos, selectedRepo, onSelect, isOpen, setIsOpen, disabled }: {
  repos: RepoSummary[]; selectedRepo: RepoSummary | null;
  onSelect: (r: RepoSummary) => void; isOpen: boolean; setIsOpen: (v: boolean) => void; disabled: boolean;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  return (
    <div ref={dropdownRef} className="relative w-64">
      <button type="button" disabled={disabled} onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-[#12161E] border border-gray-800 rounded hover:border-gray-600 transition-colors disabled:opacity-50 text-left focus:outline-none">
        {selectedRepo ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-gray-200 truncate">{selectedRepo.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Select Git Repository</span>
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full bg-[#12161E] border border-gray-800 rounded shadow-xl z-50 max-h-64 overflow-y-auto">
          {repos.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No repositories found.</div>
          ) : (
            repos.map((repo) => (
              <button key={repo.id} type="button" onClick={() => { onSelect(repo); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 flex flex-col hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0">
                <span className={`text-sm ${selectedRepo?.id === repo.id ? "text-white" : "text-gray-300"}`}>{repo.name}</span>
                <span className="text-xs text-gray-500 truncate">{repo.full_name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const AttackPath = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);
  const [scanType, setScanType] = useState<"repo" | "url">("repo");
  const [liveUrl, setLiveUrl] = useState("");
  const [dastUrl, setDastUrl] = useState("");
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [scanRepo, setScanRepo] = useState(true);
  const [scanDast, setScanDast] = useState(true);

  const [findings, setFindings] = useState<Finding[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [scannerStatuses, setScannerStatuses] = useState<Record<ScannerType, ScannerStatus>>({
    sast: { status: "idle", findingsCount: 0 },
    secret: { status: "idle", findingsCount: 0 },
    sca: { status: "idle", findingsCount: 0 },
    iac: { status: "idle", findingsCount: 0 },
    dast: { status: "idle", findingsCount: 0 },
  });

  const [activeTab, setActiveTab] = useState<ScannerType | "all">("all");
  const [logsOpen, setLogsOpen] = useState(false);

  const deviceUUID = useMemo(() => getDeviceUUID(), []);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsOpen) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs, logsOpen]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.get("/github/repos").then((res) => setRepos(res.data)).catch(() => {});
  }, [isAuthenticated]);

  const handleFinding = useCallback((finding: Finding) => {
    setFindings((prev) => {
      if (prev.some((f) => f.id === finding.id)) return prev;
      return [...prev, finding];
    });
    setScannerStatuses((prev) => ({
      ...prev,
      [finding.scanner]: { ...prev[finding.scanner], findingsCount: prev[finding.scanner].findingsCount + 1 },
    }));
    setTerminalLogs((prev) => [...prev, `[FINDING] ${finding.scanner.toUpperCase()}: ${finding.title}`]);
  }, []);

  const handleScannerStart = useCallback((scanner: ScannerType) => {
    setScannerStatuses((prev) => ({ ...prev, [scanner]: { status: "scanning", findingsCount: 0 } }));
    setTerminalLogs((prev) => [...prev, `[INIT] Launching ${scanner.toUpperCase()} scanner...`]);
  }, []);

  const handleScannerDone = useCallback((scanner: ScannerType, count: number) => {
    setScannerStatuses((prev) => ({ ...prev, [scanner]: { status: "done", findingsCount: count } }));
    setTerminalLogs((prev) => [...prev, `[DONE] ${scanner.toUpperCase()} finished — ${count} finding${count !== 1 ? "s" : ""} detected.`]);
  }, []);

  const handleScanError = useCallback((msg: string) => {
    setTerminalLogs((prev) => [...prev, `[ERROR] ${msg}`]);
  }, []);

  const handleScanComplete = useCallback(() => {
    setTerminalLogs((prev) => [...prev, "[COMPLETE] All scanners finished."]);
  }, []);

  const { startScan, stopScan, isScanning, error: scanStreamError } = useScanStream({
    onFinding: handleFinding,
    onScannerStart: handleScannerStart,
    onScannerDone: handleScannerDone,
    onError: handleScanError,
    onComplete: handleScanComplete,
  });

  const resetScan = useCallback(() => {
    setFindings([]);
    setTerminalLogs([]);
    setScannerStatuses({ sast: { status: "idle", findingsCount: 0 }, secret: { status: "idle", findingsCount: 0 }, sca: { status: "idle", findingsCount: 0 }, iac: { status: "idle", findingsCount: 0 }, dast: { status: "idle", findingsCount: 0 } });
  }, []);

  const handleTriggerScan = useCallback(() => {
    if (isScanning) return;
    resetScan();

    if (scanType === "repo") {
      if (!selectedRepo) { setRepoDropdownOpen(true); return; }
      setTerminalLogs([
        `[SYSTEM] Initializing scan pipeline → ${selectedRepo.full_name}`,
        scanRepo ? "[CODE] Code scans enabled" : "[CODE] Code scans disabled",
        scanDast ? `[DAST] Deploy URL: ${dastUrl.trim() || "auto-detecting"}` : "[DAST] Live deployment scan disabled",
      ]);
      startScan(selectedRepo.full_name, "repo", { 
        dastUrl: dastUrl.trim() || undefined,
        scanRepo,
        scanDast
      });
    } else {
      if (!liveUrl) return;
      let targetUrl = liveUrl.trim();
      if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;
      setTerminalLogs([`[SYSTEM] Initializing DAST scan → ${targetUrl}`]);
      startScan(targetUrl, "url");
    }
  }, [isScanning, scanType, selectedRepo, liveUrl, dastUrl, startScan, resetScan, scanRepo, scanDast]);

  const canScan = scanType === "repo" ? (!!selectedRepo && (scanRepo || scanDast)) : !!liveUrl;

  const filteredFindings = useMemo(() => {
    let list = findings;
    if (activeTab !== "all") {
      list = list.filter((f) => f.scanner === activeTab);
    }
    return list;
  }, [findings, activeTab]);

  return (
    <div className="flex flex-col h-full w-full bg-[#080B12] text-gray-300 font-sans">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Zone 1 - Target */}
        <div className="px-6 py-6 border-b border-gray-800 bg-[#0A0D14] flex-shrink-0">
          <h1 className="text-xl font-normal text-white mb-6">Attack Paths</h1>
          
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex bg-[#12161E] rounded border border-gray-800 p-0.5 w-fit">
                {(["repo", "url"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => { setScanType(t); if (t === "url") { setScanRepo(false); setScanDast(true); } else { setScanRepo(true); setScanDast(true); } resetScan(); }} disabled={isScanning}
                    className={`px-4 py-1.5 text-sm rounded-sm transition-colors disabled:opacity-50 ${
                      scanType === t ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}>
                    {t === "repo" ? "Git Repository" : "Live URL"}
                  </button>
                ))}
              </div>

              {scanType === "repo" ? (
                <div className="flex items-center gap-4">
                  <RepoSelector repos={repos} selectedRepo={selectedRepo} onSelect={(r) => setSelectedRepo(r)} isOpen={repoDropdownOpen} setIsOpen={setRepoDropdownOpen} disabled={isScanning} />
                  
                  {selectedRepo && (
                    <>
                      <div className="flex items-center gap-4 ml-2 border-l border-gray-800 pl-6 h-6">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                          <input type="checkbox" checked={scanRepo} disabled={isScanning} onChange={(e) => setScanRepo(e.target.checked)} className="rounded bg-gray-900 border-gray-700 text-white accent-white" />
                          Scan Code
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                          <input type="checkbox" checked={scanDast} disabled={isScanning} onChange={(e) => setScanDast(e.target.checked)} className="rounded bg-gray-900 border-gray-700 text-white accent-white" />
                          Scan Deploy
                        </label>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={isScanning}
                  className="w-96 px-3 py-2 text-sm bg-[#12161E] border border-gray-800 rounded placeholder-gray-600 focus:outline-none focus:border-gray-500 text-white disabled:opacity-50"
                />
              )}
            </div>

            <div className="flex-shrink-0">
              {isScanning ? (
                <button type="button" onClick={stopScan}
                  className="px-6 py-2 rounded text-sm bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-700">
                  Stop Scan
                </button>
              ) : (
                <button type="button" onClick={handleTriggerScan} disabled={!canScan}
                  className="px-6 py-2 rounded text-sm bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 transition-colors">
                  Run Scan
                </button>
              )}
            </div>
          </div>
          
          {scanStreamError && (
            <div className="mt-4 p-3 rounded bg-red-900/20 border border-red-900/50 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              {scanStreamError}
            </div>
          )}
        </div>

        {/* Zone 2 - Scanner Matrix */}
        <div className="px-6 py-4 border-b border-gray-800 bg-[#080B12] flex gap-3 flex-shrink-0 overflow-x-auto no-scrollbar items-center">
          <button type="button" onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors border ${
              activeTab === "all" ? "bg-gray-800 border-gray-700 text-white" : "bg-transparent border-transparent text-gray-500 hover:text-gray-300"
            }`}>
            All ({findings.length})
          </button>
          
          {(Object.entries(scannerStatuses) as [ScannerType, ScannerStatus][]).map(([key, stat]) => {
            const meta = SCANNER_META[key];
            const isInapplicable = scanType === "url" ? key !== "dast" : (key === "dast" ? !scanDast : !scanRepo);
            const count = findings.filter((f) => f.scanner === key).length;
            
            return (
              <button key={key} type="button" onClick={() => setActiveTab(key)} disabled={isInapplicable}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors border flex items-center gap-2 disabled:opacity-30 ${
                  activeTab === key ? "bg-gray-800 border-gray-700 text-white" : "bg-transparent border-transparent text-gray-500 hover:text-gray-300"
                }`}>
                {meta.label} 
                {stat.status === "scanning" ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>({isInapplicable ? "0" : count})</span>}
              </button>
            );
          })}
        </div>

        {/* Zone 3 - Findings */}
        <div className="flex-1 overflow-y-auto bg-[#080B12]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0A0D14] sticky top-0 border-b border-gray-800 z-10 text-gray-500 font-normal text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-normal w-32">Severity</th>
                <th className="px-6 py-4 font-normal w-1/3 min-w-[300px]">Finding</th>
                <th className="px-6 py-4 font-normal w-32">Scanner</th>
                <th className="px-6 py-4 font-normal">File / Endpoint</th>
                <th className="px-6 py-4 font-normal w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredFindings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {isScanning ? "Scanning in progress..." : "No scan executed. Select a target and run a scan."}
                  </td>
                </tr>
              ) : (
                filteredFindings.map((finding) => {
                  const cfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.LOW;
                  return (
                    <tr key={finding.id} className="hover:bg-[#0c1017] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className="text-gray-300 capitalize">{finding.severity.toLowerCase()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-200 truncate max-w-md" title={finding.title}>
                        {finding.title}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {SCANNER_META[finding.scanner].label}
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs truncate max-w-sm" title={finding.file || "-"}>
                        {finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ''}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        Open
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Log Drawer */}
      <div className="border-t border-gray-800 bg-[#0A0D14] flex-shrink-0">
        <button type="button" onClick={() => setLogsOpen(!logsOpen)}
          className="w-full px-6 py-3 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors focus:outline-none">
          <span className="uppercase tracking-wider">System Log</span>
          {logsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        
        {logsOpen && (
          <div className="h-48 px-6 pb-6 pt-2 overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin bg-[#050608]">
            {terminalLogs.length === 0 ? (
              <p className="text-gray-600">No logs available.</p>
            ) : (
              terminalLogs.map((log, idx) => (
                <p key={idx} className={`${
                  log.startsWith("[ERROR]") ? "text-red-400" :
                  log.startsWith("[FINDING]") ? "text-amber-400" :
                  log.startsWith("[DONE]") || log.startsWith("[COMPLETE]") ? "text-emerald-400" :
                  "text-gray-400"
                }`}>{log}</p>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AttackPath;
