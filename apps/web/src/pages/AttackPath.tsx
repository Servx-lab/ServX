import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls, PerspectiveCamera, Float, MeshDistortMaterial,
  Sphere, Icosahedron, Line, Stars, Text,
} from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, AlertTriangle, ChevronDown,
  Crosshair, Bug, Loader2, Target, RadioTower, Globe, Play, Square,
  CheckCircle, AlertCircle, Key, Package, Server, Cloud, Lock,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/features/auth/AuthContext";
import { useScanStream, Finding, ScannerType, ScannerStatus } from "../hooks/useScanStream";

// ─── Device UUID ─────────────────────────────────────────────────
function getDeviceUUID(): string {
  const KEY = "orizon_device_uuid";
  let uuid = localStorage.getItem(KEY);
  if (!uuid) { uuid = crypto.randomUUID(); localStorage.setItem(KEY, uuid); }
  return uuid;
}

// ─── 3D Solar System Background ──────────────────────────────────
const SolarSystemBackground = () => {
  const sunRef = useRef<THREE.Mesh>(null);
  const earthRef = useRef<THREE.Group>(null);
  const marsRef = useRef<THREE.Group>(null);
  const jupiterRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sunRef.current) sunRef.current.rotation.y += 0.005;
    if (earthRef.current) {
      earthRef.current.position.x = Math.cos(t * 0.5) * 10;
      earthRef.current.position.z = Math.sin(t * 0.5) * 10;
      earthRef.current.rotation.y += 0.02;
    }
    if (marsRef.current) {
      marsRef.current.position.x = Math.cos(t * 0.3 + 2) * 14;
      marsRef.current.position.z = Math.sin(t * 0.3 + 2) * 14;
      marsRef.current.rotation.y += 0.015;
    }
    if (jupiterRef.current) {
      jupiterRef.current.position.x = Math.cos(t * 0.1 + 4) * 20;
      jupiterRef.current.position.z = Math.sin(t * 0.1 + 4) * 20;
      jupiterRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={[0, -2, -15]} rotation={[0.4, 0, 0]}>
      <mesh ref={sunRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#ffaa00" />
        <pointLight color="#ffaa00" intensity={2} distance={100} />
        <Sphere args={[2.2, 32, 32]}>
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
        </Sphere>
      </mesh>
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 10, 0, Math.sin(i / 64 * Math.PI * 2) * 10] as [number,number,number])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={earthRef}>
        <mesh><sphereGeometry args={[0.4, 32, 32]} /><meshStandardMaterial color="#2266ff" roughness={0.7} /></mesh>
      </group>
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 14, 0, Math.sin(i / 64 * Math.PI * 2) * 14] as [number,number,number])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={marsRef}>
        <mesh><sphereGeometry args={[0.3, 32, 32]} /><meshStandardMaterial color="#ff4422" roughness={0.8} /></mesh>
      </group>
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 20, 0, Math.sin(i / 64 * Math.PI * 2) * 20] as [number,number,number])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={jupiterRef}>
        <mesh><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color="#ddaa88" roughness={0.6} /></mesh>
      </group>
    </group>
  );
};

// ─── Attack Particle ──────────────────────────────────────────────
const AttackParticles = React.memo(({ start, end, active }: any) => {
  const [pos, setPos] = useState(0);
  useFrame((_, delta) => { if (active) setPos((p) => (p + delta * 2) % 1); });
  const currentPos = useMemo(() => new THREE.Vector3().lerpVectors(new THREE.Vector3(...start), new THREE.Vector3(...end), pos), [pos, start, end]);
  if (!active) return null;
  return (
    <mesh position={currentPos}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#6C63FF" />
      <pointLight color="#6C63FF" intensity={4} distance={3} />
    </mesh>
  );
});

// ─── Topology Node ────────────────────────────────────────────────
const TopologyNode = React.memo(({ position, label, isTargeted, isRepoNode }: {
  position: number[]; label: string; isTargeted: boolean; isRepoNode?: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (isTargeted && meshRef.current) {
      meshRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 20) * 0.05;
      meshRef.current.position.y = position[1] + Math.cos(state.clock.elapsedTime * 23) * 0.05;
    }
  });
  const nodeColor = isRepoNode ? "#00C2CB" : isTargeted ? "#6C63FF" : "#00C2CB";
  const emissiveIntensity = isRepoNode ? 8 : isTargeted ? 20 : 2;

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position as [number, number, number]}>
        <Icosahedron ref={meshRef} args={[0.5, 1]}>
          <meshStandardMaterial color={nodeColor} emissive={nodeColor} emissiveIntensity={emissiveIntensity} wireframe />
        </Icosahedron>
        <Sphere args={[0.5, 16, 16]}>
          <meshBasicMaterial color={nodeColor} transparent opacity={0.1} />
        </Sphere>
        <Text position={[0, 0.8, 0]} fontSize={0.2} color="#00C2CB"
          font="https://fonts.gstatic.com/s/orbitron/v30/y97pyXG9LrxS4lTz68l6_GfN.woff">
          {label}
        </Text>
        {isTargeted && (
          <Sphere args={[0.6, 16, 16]}>
            <MeshDistortMaterial color="#6C63FF" speed={5} distort={0.4} radius={1} transparent opacity={0.3} />
          </Sphere>
        )}
      </group>
    </Float>
  );
});

// ─── Scan Banner ──────────────────────────────────────────────────
const ScanLineAnimation = ({ targetName, isScanning }: { targetName: string; isScanning: boolean }) => {
  if (!isScanning) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute top-0 left-0 right-0 z-[70] pointer-events-none">
      <div className="relative h-7 bg-[#080B12]/95 border-b border-cyan-400/20 flex items-center justify-center overflow-hidden">
        <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-y-0 w-1/3"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,194,203,0.3), transparent)" }} />
        <span className="relative z-10 text-[9px] font-mono text-cyan-400/80 tracking-[0.35em] uppercase">
          SECURE SCAN ACTIVE // AUDITING: {targetName}
        </span>
      </div>
    </motion.div>
  );
};

// ─── Severity Config ──────────────────────────────────────────────
const SEVERITY_CONFIG = {
  CRITICAL: { bg: "bg-purple-500/10", border: "border-purple-500/25", badge: "bg-purple-600/30 text-purple-300 border border-purple-500/30", text: "text-purple-400" },
  HIGH:     { bg: "bg-red-500/10",    border: "border-red-500/25",    badge: "bg-red-600/30 text-red-300 border border-red-500/30",    text: "text-red-400" },
  MODERATE: { bg: "bg-amber-500/10",  border: "border-amber-500/25",  badge: "bg-amber-600/30 text-amber-300 border border-amber-500/30",  text: "text-amber-400" },
  LOW:      { bg: "bg-emerald-500/10",border: "border-emerald-500/25",badge: "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30",text: "text-emerald-400" },
} as const;

// ─── Scanner Meta Config ──────────────────────────────────────────
const SCANNER_META: Record<ScannerType, { label: string; icon: React.ReactNode; desc: string }> = {
  sast:   { label: "SAST",    icon: <Bug className="w-3.5 h-3.5" />,         desc: "Code logic flaws" },
  secret: { label: "Secrets", icon: <Key className="w-3.5 h-3.5" />,         desc: "Credential leaks" },
  sca:    { label: "SCA",     icon: <Package className="w-3.5 h-3.5" />,     desc: "Dependency CVEs" },
  iac:    { label: "IaC",     icon: <Server className="w-3.5 h-3.5" />,      desc: "Infra misconfigs" },
  dast:   { label: "DAST",    icon: <Globe className="w-3.5 h-3.5" />,       desc: "Live endpoint probe" },
};

// ─── Repo Summary Type ────────────────────────────────────────────
interface RepoSummary {
  id: number; name: string; full_name: string; language: string | null; owner?: { login: string };
}

// ─── Dark Repo Selector ───────────────────────────────────────────
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
    <div ref={dropdownRef} className="relative w-full">
      <button type="button" disabled={disabled} onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:border-cyan-400/30 transition-all disabled:opacity-50 text-left focus:outline-none focus:border-cyan-400/40">
        {selectedRepo ? (
          <div className="flex items-center gap-2 min-w-0">
            <Crosshair className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-sm font-bold text-white truncate">{selectedRepo.name}</span>
            {selectedRepo.language && (
              <span className="text-[9px] font-mono text-cyan-400/60 bg-cyan-400/10 px-2 py-0.5 rounded-full flex-shrink-0">{selectedRepo.language}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-500">Select Git Repository</span>
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1.5 w-full bg-[#0D1117] border border-white/[0.12] rounded-xl overflow-hidden shadow-2xl z-[100]">
            <div className="px-4 py-2 border-b border-white/[0.08] bg-white/[0.02]">
              <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Select repository target</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {repos.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-600">No repositories found. Connect GitHub in Settings.</div>
              ) : (
                repos.map((repo) => (
                  <button key={repo.id} type="button" onClick={() => { onSelect(repo); setIsOpen(false); }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${selectedRepo?.id === repo.id ? "text-cyan-400" : "text-gray-200"}`}>{repo.name}</p>
                      <p className="text-[10px] text-gray-600 truncate font-mono">{repo.full_name}</p>
                    </div>
                    {repo.language && <span className="text-[9px] text-gray-600 font-mono ml-2 flex-shrink-0">{repo.language}</span>}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────
const AttackPath = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Target state
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);
  const [scanType, setScanType] = useState<"repo" | "url">("repo");
  const [liveUrl, setLiveUrl] = useState("");
  const [dastUrl, setDastUrl] = useState(""); // Manual DAST deploy URL override (repo mode)
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [scanRepo, setScanRepo] = useState(true);
  const [scanDast, setScanDast] = useState(true);

  // Scan output state
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
  const [isLockdown, setIsLockdown] = useState(false);
  const [glitch, setGlitch] = useState(false);

  const deviceUUID = useMemo(() => getDeviceUUID(), []);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [terminalLogs]);

  // Fetch repos on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.get("/github/repos").then((res) => setRepos(res.data)).catch(() => {});
  }, [isAuthenticated]);

  // SSE event handlers
  const handleFinding = useCallback((finding: Finding) => {
    setFindings((prev) => {
      if (prev.some((f) => f.id === finding.id)) return prev;
      return [...prev, finding];
    });
    setScannerStatuses((prev) => ({
      ...prev,
      [finding.scanner]: { ...prev[finding.scanner], findingsCount: prev[finding.scanner].findingsCount + 1 },
    }));
    const sev = finding.severity;
    const color = sev === "CRITICAL" ? "[CRITICAL]" : sev === "HIGH" ? "[HIGH]" : sev === "MODERATE" ? "[MODERATE]" : "[LOW]";
    setTerminalLogs((prev) => [...prev, `${color} ${finding.scanner.toUpperCase()}: ${finding.title}${finding.file ? ` in ${finding.file}` : ""}`]);
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
    setTerminalLogs((prev) => [...prev, "[COMPLETE] All scanners finished. Audit report ready."]);
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
        `[DEVICE] Client UUID: ${deviceUUID}`,
        scanRepo ? "[CODE] Code scans (SAST, SCA, Secrets, IaC) enabled" : "[CODE] Code scans disabled",
        scanDast ? (dastUrl.trim() ? `[DAST] Deploy URL override: ${dastUrl.trim()}` : "[DAST] Deploy URL: auto-detecting from GitHub Deployments...") : "[DAST] Live deployment scan disabled",
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
      setTerminalLogs([
        `[SYSTEM] Initializing DAST scan → ${targetUrl}`,
        `[DEVICE] Client UUID: ${deviceUUID}`,
      ]);
      startScan(targetUrl, "url");
    }
  }, [isScanning, scanType, selectedRepo, liveUrl, dastUrl, deviceUUID, startScan, resetScan, scanRepo, scanDast]);

  // Risk score
  const riskScore = useMemo(() => {
    if (findings.length === 0) return 100;
    let penalty = 0;
    findings.forEach((f) => {
      if (f.severity === "CRITICAL") penalty += 15;
      else if (f.severity === "HIGH") penalty += 10;
      else if (f.severity === "MODERATE") penalty += 5;
      else if (f.severity === "LOW") penalty += 2;
    });
    return Math.max(0, 100 - penalty);
  }, [findings]);

  const riskColor = riskScore > 75 ? "#10b981" : riskScore > 40 ? "#f59e0b" : "#ef4444";
  const riskLabel = riskScore > 75 ? "text-emerald-400" : riskScore > 40 ? "text-amber-400" : "text-red-400";

  const filteredFindings = useMemo(() => activeTab === "all" ? findings : findings.filter((f) => f.scanner === activeTab), [findings, activeTab]);

  const handleAutoMedic = useCallback(() => {
    if (findings.length === 0) return;
    const params = new URLSearchParams();
    params.set("source", "attack-path");
    params.set("repo", selectedRepo?.full_name || liveUrl || "Live Target");
    params.set("vulns", JSON.stringify(findings.map((f) => ({ severity: f.severity.toLowerCase(), title: f.title, file: f.file, evidence: f.evidence }))));
    navigate(`/automedic?${params.toString()}`);
  }, [navigate, selectedRepo, liveUrl, findings]);

  const toggleLockdown = () => { setGlitch(true); setTimeout(() => setGlitch(false), 200); setIsLockdown(!isLockdown); };

  // 3D node labels
  const nodeLabels = useMemo(() => {
    const n = (scanType === "repo" && selectedRepo ? selectedRepo.name.toUpperCase() : "LIVE-TARGET");
    return [`${n}-EDGE`, `${n}-CORE-API`, `${n}-DATABASE`, `${n}-IDENTITY`];
  }, [selectedRepo, scanType]);

  const scanTargetLabel = scanType === "repo" ? (selectedRepo?.name || "Repository") : liveUrl;
  const canScan = scanType === "repo" ? (!!selectedRepo && (scanRepo || scanDast)) : !!liveUrl;

  return (
    <div
      className={`relative w-full h-screen overflow-hidden transition-all duration-300 ${glitch ? "filter invert brightness-125" : ""}`}
      style={{ background: "#080B12" }}
    >
      {/* Holographic CRT scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none z-[60] opacity-[0.015]" style={{
        backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))",
        backgroundSize: "100% 2px, 3px 100%",
      }} />

      {/* Scan active banner */}
      <AnimatePresence>
        {isScanning && <ScanLineAnimation targetName={scanTargetLabel} isScanning={isScanning} />}
      </AnimatePresence>

      {/* ── Full-screen 3D Canvas ─────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} />
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#00C2CB" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#6C63FF" />
          <Stars radius={100} depth={50} count={7000} factor={4} saturation={1} fade speed={1.5} />
          <Suspense fallback={null}>
            <SolarSystemBackground />
            <group rotation={[0.2, 0, 0]}>
              <TopologyNode position={[-4, 0, 0]} label={nodeLabels[0]} isTargeted={false} isRepoNode={scanType === "repo" && !!selectedRepo} />
              <TopologyNode position={[0, 2.5, 0]} label={nodeLabels[1]} isTargeted={isScanning} isRepoNode={scanType === "repo" && !!selectedRepo} />
              <TopologyNode position={[4, 0, 0]} label={nodeLabels[2]} isTargeted={false} isRepoNode={scanType === "repo" && !!selectedRepo} />
              <TopologyNode position={[0, -2.5, 0]} label={nodeLabels[3]} isTargeted={false} isRepoNode={scanType === "repo" && !!selectedRepo} />
              <AttackParticles start={[-4, 0, 0]} end={[0, 2, 0]} active={isScanning} />
              <Line points={[[-4, 0, 0], [0, 2, 0]]} color={isScanning ? "#8b5cf6" : "#00C2CB"} lineWidth={1.5} transparent opacity={0.5} />
              <Line points={[[-4, 0, 0], [0, -2, 0]]} color="#00C2CB" lineWidth={1.5} transparent opacity={0.5} />
              <Line points={[[0, 2, 0], [4, 0, 0]]} color="#00C2CB" lineWidth={1.5} transparent opacity={0.5} />
              <Line points={[[0, -2, 0], [4, 0, 0]]} color="#00C2CB" lineWidth={1.5} transparent opacity={0.5} />
            </group>
          </Suspense>
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* ── Left Glass Control Panel ──────────────────────────── */}
      <aside className={`absolute left-0 top-0 bottom-0 w-[400px] z-20 flex flex-col overflow-hidden ${isScanning ? "top-7" : "top-0"}`}
        style={{ background: "rgba(8, 11, 18, 0.94)", backdropFilter: "blur(24px)", borderRight: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Panel header */}
        <div className="p-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-[9px] font-mono text-cyan-400/50 uppercase tracking-[0.35em]">Attack Path // War Room</p>
            <h1 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Vulnerability Scanner
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <RadioTower className={`w-4 h-4 transition-colors ${isScanning ? "text-purple-400 animate-pulse" : "text-cyan-400/50"}`} />
              {isScanning && (
                <motion.div animate={{ scale: [1, 2.2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 border border-purple-400 rounded-full" />
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Radar</p>
              <p className={`text-[10px] font-mono font-bold uppercase ${isScanning ? "text-purple-400" : "text-cyan-400/60"}`}>
                {isScanning ? "PROBING" : "STANDBY"}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Target type tabs */}
          <div className="p-1 rounded-xl flex gap-1" style={{ background: "rgba(255,255,255,0.04)" }}>
            {(["repo", "url"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setScanType(t); if (t === "url") { setScanRepo(false); setScanDast(true); } else { setScanRepo(true); setScanDast(true); } resetScan(); }} disabled={isScanning}
                className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  scanType === t
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    : "text-gray-500 hover:text-gray-300"
                }`}>
                {t === "repo" ? <Target className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                {t === "repo" ? "Git Repository" : "Live Deploy URL"}
              </button>
            ))}
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {scanStreamError && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="flex gap-3 p-3.5 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-red-400 mb-0.5">Scan Error</p>
                  <p className="text-[10px] text-red-400/70 leading-relaxed">{scanStreamError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Target inputs */}
          <div className="space-y-3">
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Configure Target</p>

            {scanType === "repo" ? (
              <>
                <RepoSelector repos={repos} selectedRepo={selectedRepo} onSelect={(r) => setSelectedRepo(r)}
                  isOpen={repoDropdownOpen} setIsOpen={setRepoDropdownOpen} disabled={isScanning} />

                {/* DAST Override URL — the key missing feature */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-cyan-400/50" />
                    DAST Deploy URL
                    <span className="ml-1 text-[8px] text-gray-700 normal-case tracking-normal font-normal">(optional — auto-detected if blank)</span>
                  </label>
                  <input
                    type="url"
                    value={dastUrl}
                    onChange={(e) => setDastUrl(e.target.value)}
                    placeholder="https://your-app.render.com"
                    disabled={isScanning || !scanDast}
                    className="w-full px-3 py-2 rounded-lg text-[11px] font-mono text-gray-300 placeholder-gray-700 focus:outline-none transition-all disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                    onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(0,194,203,0.35)"; e.currentTarget.style.background = "rgba(0,194,203,0.04)"; }}
                    onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  />
                  {dastUrl.trim() && scanDast && (
                    <p className="text-[9px] text-cyan-400/50 font-mono">Puppeteer will probe: {dastUrl.trim()}</p>
                  )}
                </div>

                {/* Scan choices section */}
                <div className="space-y-2 p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">Select Scan Scope</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={scanRepo}
                        disabled={isScanning}
                        onChange={(e) => setScanRepo(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                      />
                      <span>Scan Repository Code (SAST, SCA, Secrets, IaC)</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={scanDast}
                        disabled={isScanning}
                        onChange={(e) => setScanDast(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                      />
                      <span>Scan Live Deployment (DAST)</span>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <input
                type="text"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://yourapp.render.com"
                disabled={isScanning}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-gray-200 placeholder-gray-700 focus:outline-none transition-all disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(0,194,203,0.35)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }}
              />
            )}
          </div>

          {/* Scan action button */}
          {isScanning ? (
            <motion.button type="button" onClick={stopScan} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              <Square className="w-4 h-4 fill-current" />
              Stop Scanning
            </motion.button>
          ) : (
            <motion.button type="button" onClick={handleTriggerScan} disabled={!canScan} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: canScan ? "rgba(0,194,203,0.12)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(0,194,203,0.3)", color: canScan ? "#00C2CB" : "#4b5563" }}>
              <Play className="w-4 h-4 fill-current" />
              Initiate Secure Scan
            </motion.button>
          )}

          {/* Risk score dial */}
          <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Security Health</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-3xl font-black ${riskLabel}`}>{riskScore}</span>
                <span className="text-gray-600 text-sm">/100</span>
              </div>
              <p className="text-[9px] text-gray-700 mt-0.5 font-mono">
                {riskScore > 75 ? "SECURE" : riskScore > 40 ? "AT RISK" : "CRITICAL"}
              </p>
            </div>
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="transparent" />
                <motion.circle cx="32" cy="32" r="26" stroke={riskColor} strokeWidth="6" fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - riskScore / 100) }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">{riskScore}%</span>
            </div>
          </div>

          {/* Scanner status grid */}
          <div className="space-y-2">
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Scanner Matrix</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(scannerStatuses) as [ScannerType, ScannerStatus][]).map(([key, stat]) => {
                const meta = SCANNER_META[key];
                const isInapplicable =
                  scanType === "url"
                    ? key !== "dast"
                    : (key === "dast" ? !scanDast : !scanRepo);

                const borderStyle =
                  stat.status === "scanning"
                    ? "rgba(0,194,203,0.4)"
                    : stat.status === "done" && stat.findingsCount > 0
                    ? "rgba(245,158,11,0.3)"
                    : stat.status === "done"
                    ? "rgba(16,185,129,0.2)"
                    : "rgba(255,255,255,0.06)";

                const iconColor =
                  stat.status === "scanning"
                    ? "text-cyan-400"
                    : stat.status === "done" && stat.findingsCount > 0
                    ? "text-amber-400"
                    : stat.status === "done"
                    ? "text-emerald-400"
                    : "text-gray-700";

                return (
                  <div key={key}
                    className={`rounded-xl p-3 transition-all ${isInapplicable ? "opacity-25" : ""} ${stat.status === "scanning" ? "bg-cyan-400/5" : "bg-white/[0.02]"}`}
                    style={{ border: `1px solid ${borderStyle}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={iconColor}>{meta.icon}</div>
                      {stat.status === "scanning" && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                      {stat.status === "done" && stat.findingsCount > 0 && <AlertCircle className="w-3 h-3 text-amber-400" />}
                      {stat.status === "done" && stat.findingsCount === 0 && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <p className="text-[9px] font-mono text-gray-600 uppercase">{meta.label}</p>
                    <p className="text-lg font-black text-white leading-none mt-0.5">{isInapplicable ? "—" : stat.findingsCount}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal log */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">System Log</p>
            <div className="h-40 rounded-xl p-3 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-thin"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {terminalLogs.length === 0 ? (
                <p className="text-gray-700">Awaiting scan initiation...</p>
              ) : (
                terminalLogs.map((log, idx) => {
                  const isErr = log.startsWith("[ERROR]");
                  const isDone = log.startsWith("[DONE]") || log.startsWith("[COMPLETE]");
                  const isSystem = log.startsWith("[SYSTEM]") || log.startsWith("[DEVICE]") || log.startsWith("[DAST]");
                  const isCrit = log.startsWith("[CRITICAL]");
                  const isHigh = log.startsWith("[HIGH]");
                  const isMod = log.startsWith("[MODERATE]");
                  return (
                    <p key={idx} className={`leading-relaxed ${
                      isErr ? "text-red-400" :
                      isCrit ? "text-purple-400" :
                      isHigh ? "text-red-400/80" :
                      isMod ? "text-amber-400" :
                      isDone ? "text-emerald-400" :
                      isSystem ? "text-cyan-400/60" :
                      "text-gray-500"
                    }`}>{log}</p>
                  );
                })
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Lockdown toggle */}
          <button type="button" onClick={toggleLockdown}
            className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              isLockdown
                ? "bg-purple-600/15 text-purple-400 border border-purple-500/30"
                : "text-gray-700 hover:text-purple-400 hover:border-purple-500/20 border border-white/[0.05]"
            }`}>
            <Lock className="w-3 h-3" />
            {isLockdown ? "Disable Lockdown Protocol" : "Emergency Lockdown Override"}
          </button>

        </div>
      </aside>

      {/* ── Bottom Findings Drawer ────────────────────────────── */}
      <div
        className={`absolute bottom-0 right-0 z-20 max-h-[45vh] flex flex-col ${isScanning ? "left-[400px]" : "left-[400px]"}`}
        style={{ background: "rgba(8,11,18,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.04)" }}
      >
        {/* Tab bar */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button type="button" onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
                  : "text-gray-600 hover:text-gray-400"
              }`}>
              All ({findings.length})
            </button>
            {(Object.keys(scannerStatuses) as ScannerType[]).map((key) => {
              const count = findings.filter((f) => f.scanner === key).length;
              return (
                <button key={key} type="button" onClick={() => setActiveTab(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap uppercase ${
                    activeTab === key
                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
                      : "text-gray-600 hover:text-gray-400"
                  }`}>
                  {key} ({count})
                </button>
              );
            })}
          </div>

          {findings.length > 0 && (
            <button type="button" onClick={handleAutoMedic}
              className="ml-4 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}>
              <Zap className="w-3 h-3" />
              Fix with Auto-Medic
            </button>
          )}
        </div>

        {/* Findings list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[80px]">
          {filteredFindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Shield className="w-8 h-8 text-gray-800 mb-2" />
              <p className="text-sm font-semibold text-gray-600">
                {isScanning ? "Scan in progress — findings will appear here..." : "No vulnerabilities detected."}
              </p>
              {!isScanning && (
                <p className="text-xs text-gray-700 mt-1">Configure a target above and initiate a scan to audit.</p>
              )}
            </div>
          ) : (
            filteredFindings.map((finding) => {
              const cfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.LOW;
              return (
                <div key={finding.id} className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 space-y-2.5`}>
                  {/* Tags row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`${cfg.badge} text-[9px] font-black px-2 py-0.5 rounded-full uppercase`}>{finding.severity}</span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 rounded-md">{finding.scanner}</span>
                    {finding.file && (
                      <span className="text-[9px] font-mono text-gray-600 border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 rounded-md truncate max-w-[200px]">
                        {finding.file}{finding.line ? `:${finding.line}` : ""}
                      </span>
                    )}
                    {finding.cve && (
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">{finding.cve}</span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white leading-tight">{finding.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{finding.description}</p>

                  {finding.evidence && (
                    <div className="rounded-lg p-2 font-mono text-[9px] text-emerald-400 truncate" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      {finding.evidence}
                    </div>
                  )}

                  {finding.remediation && (
                    <div className="text-[10px] text-gray-500 p-2.5 rounded-lg leading-relaxed" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
                      <span className="font-bold text-gray-400">Remediation: </span>
                      {finding.remediation}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Lockdown Overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {isLockdown && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-none"
            style={{ background: "rgba(5,3,15,0.6)", backdropFilter: "blur(12px)" }}>

            <div className="absolute inset-0 opacity-[0.07]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%236C63FF' fill='none'/%3E%3C/svg%3E")`,
              backgroundSize: "60px 60px",
            }} />

            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative text-center">
              <div className="absolute inset-0 bg-purple-500 blur-[180px] opacity-10" />
              <div className="relative border p-16 rounded-2xl flex flex-col items-center gap-8"
                style={{ background: "rgba(10,8,30,0.9)", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 80px rgba(139,92,246,0.15)" }}>
                <div className="relative">
                  <Shield className="w-20 h-20 text-purple-400" />
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-purple-500/40 rounded-full scale-150" />
                </div>
                <div>
                  <h1 className="text-5xl font-black text-white tracking-[0.2em] mb-3">LOCKDOWN PROTOCOL</h1>
                  <div className="h-px w-full mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)" }} />
                  <p className="text-purple-400/60 text-xs font-mono tracking-widest uppercase">Nodes isolated. Encryption shields active.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AttackPath;
