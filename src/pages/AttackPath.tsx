import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Float, MeshDistortMaterial, Sphere, Icosahedron, Line, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Lock, AlertTriangle, ChevronDown,
  Crosshair, Bug, FileWarning, ArrowRight, Cpu, X,
  Loader2, Target, RadioTower, Scan
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import apiClient from "@/lib/apiClient";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ─── Types ──────────────────────────────────────────────────────

interface RepoSummary {
  id: number;
  name: string;
  full_name: string;
  language: string | null;
  owner?: { login: string };
}

interface Vulnerability {
  id: string;
  severity: "critical" | "medium" | "low";
  title: string;
  detail: string;
  file?: string;
}

type AttackType = "ddos" | "injection" | null;
type ScanPhase = "idle" | "scanning" | "attacking" | "reporting";

// ─── Device UUID (persistent per browser) ───────────────────────

function getDeviceUUID(): string {
  const KEY = "orizon_device_uuid";
  let uuid = localStorage.getItem(KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(KEY, uuid);
  }
  return uuid;
}

// --- sub-components ---

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
      {/* Sun */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#ffaa00" />
        <pointLight color="#ffaa00" intensity={2} distance={100} />
        {/* Sun Glow */}
        <Sphere args={[2.2, 32, 32]}>
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
        </Sphere>
      </mesh>

      {/* Earth Orbit */}
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 10, 0, Math.sin(i / 64 * Math.PI * 2) * 10])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#2266ff" roughness={0.7} />
        </mesh>
      </group>

      {/* Mars Orbit */}
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 14, 0, Math.sin(i / 64 * Math.PI * 2) * 14])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={marsRef}>
        <mesh>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#ff4422" roughness={0.8} />
        </mesh>
      </group>

      {/* Jupiter Orbit */}
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 20, 0, Math.sin(i / 64 * Math.PI * 2) * 20])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={jupiterRef}>
        <mesh>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial color="#ddaa88" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

const AttackParticles = React.memo(({ start, end, active }: any) => {
  const [pos, setPos] = useState(0);
  
  useFrame((state, delta) => {
    if (!active) return;
    setPos((prev) => (prev + delta * 2) % 1);
  });

  const currentPos = useMemo(() => {
    return new THREE.Vector3().lerpVectors(new THREE.Vector3(...start), new THREE.Vector3(...end), pos);
  }, [pos, start, end]);

  if (!active) return null;

  return (
    <mesh position={currentPos}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#6C63FF" />
      <pointLight color="#6C63FF" intensity={4} distance={3} />
    </mesh>
  );
});

const TopologyNode = React.memo(({ position, label, isTargeted, isRepoNode }: {
  position: number[];
  label: string;
  isTargeted: boolean;
  isRepoNode?: boolean;
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
      <group position={position}>
        <Icosahedron ref={meshRef} args={[0.5, 1]} onPointerOver={(e) => (e.stopPropagation())}>
          <meshStandardMaterial
            color={nodeColor}
            emissive={nodeColor}
            emissiveIntensity={emissiveIntensity}
            wireframe
          />
        </Icosahedron>

        <Sphere args={[0.5, 16, 16]}>
          <meshBasicMaterial
            color={nodeColor}
            transparent
            opacity={0.1}
          />
        </Sphere>

        <Text
          position={[0, 0.8, 0]}
          fontSize={0.2}
          color="#00C2CB"
          font="https://fonts.gstatic.com/s/orbitron/v30/y97pyXG9LrxS4lTz68l6_GfN.woff"
        >
          {label}
        </Text>

        {isTargeted && (
          <Sphere args={[0.6, 16, 16]}>
            <MeshDistortMaterial
              color="#6C63FF"
              speed={5}
              distort={0.4}
              radius={1}
              transparent
              opacity={0.3}
            />
          </Sphere>
        )}

        {isRepoNode && !isTargeted && (
          <Sphere args={[0.55, 16, 16]}>
            <meshBasicMaterial color="#00C2CB" transparent opacity={0.15} />
          </Sphere>
        )}
      </group>
    </Float>
  );
});

// ─── Scanning Animation Overlay ─────────────────────────────────

const ScanLineAnimation = ({ repoName, phase }: { repoName: string; phase: ScanPhase }) => {
  if (phase !== "scanning" && phase !== "attacking") return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute top-0 left-0 right-0 z-[70] pointer-events-none"
    >
      <div className="relative h-8 bg-[#0B0E14]/90 border-b border-[#00C2CB]/30 flex items-center justify-center overflow-hidden">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-y-0 w-1/3"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(0,194,203,0.4), transparent)"
          }}
        />
        <span className="relative z-10 text-[10px] font-mono text-[#00C2CB] tracking-[0.3em] uppercase">
          {phase === "scanning" ? `Scanning ${repoName}` : `Attacking ${repoName}`}
        </span>
      </div>
    </motion.div>
  );
};

// ─── Severity Config ────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { color: "#6C63FF", bg: "bg-[#6C63FF]/10", border: "border-[#6C63FF]/30", badge: "bg-[#6C63FF]", label: "CRITICAL" },
  medium:   { color: "#00C2CB", bg: "bg-[#00C2CB]/10", border: "border-[#00C2CB]/30", badge: "bg-[#00C2CB]", label: "MEDIUM" },
  low:      { color: "#F59E0B", bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/30", badge: "bg-[#F59E0B]", label: "LOW" },
};

// ─── Vulnerability Report Modal ─────────────────────────────────

const VulnerabilityReport = ({ vulns, repoName, onClose, onAutoMedic }: {
  vulns: Vulnerability[];
  repoName: string;
  onClose: () => void;
  onAutoMedic: (vulns: Vulnerability[]) => void;
}) => {
  const criticals = vulns.filter(v => v.severity === "critical");
  const mediums = vulns.filter(v => v.severity === "medium");
  const lows = vulns.filter(v => v.severity === "low");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] max-h-[80vh] bg-[#0B0E14] border border-[#00C2CB]/30 rounded-2xl overflow-hidden shadow-2xl shadow-[#00C2CB]/10"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6C63FF]/20 rounded-lg border border-[#6C63FF]/30">
              <FileWarning className="w-5 h-5 text-[#6C63FF]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm tracking-tight">Vulnerability Report</h2>
              <p className="text-[10px] text-[#A4ADB3] font-mono mt-0.5">{repoName} // POST-SCAN ANALYSIS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[#A4ADB3] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-6 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#6C63FF]" />
            <span className="text-xs text-white font-mono">{criticals.length} Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00C2CB]" />
            <span className="text-xs text-white font-mono">{mediums.length} Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span className="text-xs text-white font-mono">{lows.length} Low</span>
          </div>
          <div className="ml-auto text-[10px] font-mono text-[#A4ADB3]">{vulns.length} TOTAL</div>
        </div>

        {/* Vulnerability List */}
        <div className="px-6 py-4 space-y-3 max-h-[400px] overflow-auto">
          {vulns.map((v) => {
            const cfg = SEVERITY_CONFIG[v.severity];
            return (
              <motion.div
                key={v.id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`${cfg.badge} text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider`}>
                        {cfg.label}
                      </span>
                      {v.file && (
                        <span className="text-[10px] font-mono text-[#A4ADB3] truncate">{v.file}</span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1">{v.title}</h4>
                    <p className="text-xs text-[#A4ADB3] leading-relaxed">{v.detail}</p>
                  </div>
                  <Bug className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: cfg.color }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[#A4ADB3] text-xs font-medium hover:bg-white/10 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => onAutoMedic(vulns)}
            className="px-5 py-2 rounded-lg bg-[#6C63FF] text-white text-xs font-bold tracking-wide flex items-center gap-2 hover:bg-[#5a53e0] transition-colors shadow-lg shadow-[#6C63FF]/20"
          >
            <Zap className="w-3.5 h-3.5" />
            Fix with Auto-Medic
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Repository Selector Dropdown ───────────────────────────────

const RepoSelector = ({ repos, selectedRepo, onSelect, isOpen, setIsOpen, scanPhase }: {
  repos: RepoSummary[];
  selectedRepo: RepoSummary | null;
  onSelect: (r: RepoSummary) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  scanPhase: ScanPhase;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  return (
    <div ref={dropdownRef} className="relative pointer-events-auto">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-[#0B0E14]/90 backdrop-blur-xl border border-[#00C2CB]/40 rounded-xl hover:border-[#00C2CB]/70 transition-all group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {selectedRepo ? (
          <>
            <div className="relative">
              <Crosshair className="w-4 h-4 text-[#00C2CB]" />
              {scanPhase !== "idle" && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#00C2CB] rounded-full"
                />
              )}
            </div>
            <span className="text-sm font-bold text-white tracking-tight">{selectedRepo.name}</span>
            {selectedRepo.language && (
              <span className="text-[9px] font-mono text-[#00C2CB] bg-[#00C2CB]/10 px-1.5 py-0.5 rounded-full">{selectedRepo.language}</span>
            )}
          </>
        ) : (
          <>
            <Target className="w-4 h-4 text-[#A4ADB3]" />
            <span className="text-sm text-[#A4ADB3]">Select Target Repository</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-[#A4ADB3] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-72 bg-[#0B0E14]/95 backdrop-blur-xl border border-[#00C2CB]/30 rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-[100]"
          >
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-[9px] font-mono text-[#00C2CB] uppercase tracking-[0.25em]">Target Selection</p>
            </div>
            <div className="max-h-64 overflow-auto">
              {repos.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-[#A4ADB3]">
                  No repositories linked.
                </div>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => { onSelect(repo); setIsOpen(false); }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[#00C2CB]/10 ${
                      selectedRepo?.id === repo.id ? "bg-[#00C2CB]/5 border-l-2 border-l-[#00C2CB]" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <Crosshair className={`w-3.5 h-3.5 flex-shrink-0 ${selectedRepo?.id === repo.id ? "text-[#00C2CB]" : "text-[#A4ADB3]"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${selectedRepo?.id === repo.id ? "text-[#00C2CB]" : "text-white"}`}>
                        {repo.name}
                      </p>
                      <p className="text-[10px] text-[#A4ADB3] truncate font-mono">{repo.full_name}</p>
                    </div>
                    {repo.language && (
                      <span className="text-[9px] text-[#A4ADB3] font-mono">{repo.language}</span>
                    )}
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

// ─── Defense Radar Widget ───────────────────────────────────────

const DefenseRadar = ({ selectedRepo, scanPhase }: { selectedRepo: RepoSummary | null; scanPhase: ScanPhase }) => {
  const isActive = scanPhase === "attacking" && !!selectedRepo;
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8">
        <RadioTower className={`w-4 h-4 absolute inset-0 m-auto transition-colors ${isActive ? "text-[#6C63FF]" : "text-[#A4ADB3]"}`} />
        {isActive && (
          <motion.div
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 border border-[#6C63FF] rounded-full"
          />
        )}
      </div>
      <div className="text-right">
        <p className="text-[10px] text-[#A4ADB3] uppercase tracking-widest font-mono">Defense Radar</p>
        <p className={`text-xs font-mono font-bold ${isActive ? "text-[#6C63FF]" : "text-[#00C2CB]"}`}>
          {isActive ? selectedRepo!.name.toUpperCase() : "ALL NODES"}
        </p>
      </div>
    </div>
  );
};

// ─── Simulated Vulnerability Generator ──────────────────────────

function generateVulnerabilities(repo: RepoSummary): Vulnerability[] {
  const name = repo.name.toLowerCase();
  const vulns: Vulnerability[] = [
    {
      id: `${repo.id}-crit-1`,
      severity: "critical",
      title: "Hardcoded Firebase Key found in config.js",
      detail: `Plaintext API credentials detected in the ${repo.name} repository. This allows unauthenticated access to the Firebase project and all associated user data.`,
      file: "src/config.js:14",
    },
    {
      id: `${repo.id}-crit-2`,
      severity: "critical",
      title: "Exposed .env file in public directory",
      detail: "Environment variables containing database credentials are served as a static asset. Immediate remediation required.",
      file: "public/.env",
    },
    {
      id: `${repo.id}-med-1`,
      severity: "medium",
      title: "Outdated dependency: axios v0.21.1",
      detail: "Known SSRF vulnerability (CVE-2023-45857) in axios versions below 1.6.0. Upgrade to latest stable release.",
      file: "package.json",
    },
    {
      id: `${repo.id}-med-2`,
      severity: "medium",
      title: "Missing Content-Security-Policy header",
      detail: "The application does not set CSP headers, leaving it vulnerable to XSS attacks via injected scripts.",
    },
    {
      id: `${repo.id}-med-3`,
      severity: "medium",
      title: "Insecure CORS configuration",
      detail: `Access-Control-Allow-Origin is set to '*' allowing any origin to make authenticated requests.`,
      file: "server/server.js:28",
    },
  ];

  if (name.includes("quiz") || name.includes("game")) {
    vulns.push({
      id: `${repo.id}-low-1`,
      severity: "low",
      title: "Rate limiting not configured on API routes",
      detail: "Public API endpoints lack rate limiting, making brute-force enumeration feasible.",
      file: "server/routes/api.js",
    });
  } else {
    vulns.push({
      id: `${repo.id}-low-1`,
      severity: "low",
      title: "Debug logging enabled in production build",
      detail: "Console.log statements found in 14 files. Sensitive data may be leaked to browser devtools.",
    });
  }

  return vulns;
}

const AttackPath = () => {
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);

  const [isAttackActive, setIsAttackActive] = useState(false);
  const [activeAttackType, setActiveAttackType] = useState<AttackType>(null);
  const [isLockdown, setIsLockdown] = useState(false);
  const [glitch, setGlitch] = useState(false);

  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const deviceUUID = useMemo(() => getDeviceUUID(), []);

  // Auth + fetch repos
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.get("/github/repos").then((res) => {
      setRepos(res.data);
    }).catch(() => {});
  }, [isAuthenticated]);

  // 3D node labels — replace default label when repo is selected
  const nodeLabels = useMemo(() => {
    if (selectedRepo) {
      return [
        `${selectedRepo.name.toUpperCase()}-FE`,
        `${selectedRepo.name.toUpperCase()}-API`,
        `${selectedRepo.name.toUpperCase()}-DB`,
        `${selectedRepo.name.toUpperCase()}-AUTH`,
      ];
    }
    return ["G-FRONTEND-01", "G-CORE-API-07", "G-PERSIST-09", "G-AUTH-SYS-04"];
  }, [selectedRepo]);

  // Simulate attack sequence
  const runAttack = useCallback((type: AttackType) => {
    if (!selectedRepo || scanPhase !== "idle") return;

    setActiveAttackType(type);
    setScanPhase("scanning");
    setIsAttackActive(false);
    setVulnerabilities([]);
    setShowReport(false);

    const logs: string[] = [];
    logs.push(`[${new Date().toISOString()}] DEVICE ${deviceUUID.slice(0, 8)}... initiated ${type} scan`);
    logs.push(`[TARGET] ${selectedRepo.full_name}`);
    setScanLog([...logs]);

    // Phase 1: Scanning (2s)
    setTimeout(() => {
      logs.push("[SCAN] Enumerating attack surface...");
      logs.push("[SCAN] Probing endpoints...");
      setScanLog([...logs]);
      setScanPhase("attacking");
      setIsAttackActive(true);

      // Phase 2: Attacking (3s)
      setTimeout(() => {
        logs.push(`[ATTACK] ${type === "ddos" ? "DDoS flood packets" : "SQL injection payloads"} deployed`);
        logs.push("[ATTACK] Monitoring response degradation...");
        setScanLog([...logs]);

        // Phase 3: Reporting (2s)
        setTimeout(() => {
          const vulns = generateVulnerabilities(selectedRepo);
          logs.push(`[REPORT] Scan complete. ${vulns.length} vulnerabilities detected.`);
          setScanLog([...logs]);

          setIsAttackActive(false);
          setScanPhase("reporting");
          setVulnerabilities(vulns);
          setShowReport(true);
          setActiveAttackType(null);
        }, 2000);
      }, 3000);
    }, 2000);
  }, [selectedRepo, scanPhase, deviceUUID]);

  const handleChaosToggle = useCallback((type: AttackType) => {
    if (scanPhase !== "idle") return;
    if (!selectedRepo) {
      setRepoDropdownOpen(true);
      return;
    }
    runAttack(type);
  }, [selectedRepo, scanPhase, runAttack]);

  const handleAutoMedic = useCallback((vulns: Vulnerability[]) => {
    const params = new URLSearchParams();
    params.set("source", "attack-path");
    params.set("repo", selectedRepo?.full_name || "");
    params.set("vulns", JSON.stringify(vulns.map(v => ({ severity: v.severity, title: v.title, file: v.file }))));
    navigate(`/automedic?${params.toString()}`);
  }, [navigate, selectedRepo]);

  const resetScan = useCallback(() => {
    setScanPhase("idle");
    setIsAttackActive(false);
    setActiveAttackType(null);
    setVulnerabilities([]);
    setShowReport(false);
    setScanLog([]);
  }, []);

  const toggleLockdown = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 200);
    setIsLockdown(!isLockdown);
  };

  return (
    <div className={`flex min-h-screen bg-white text-black overflow-hidden transition-all duration-500 ${glitch ? 'filter invert brightness-150' : ''}`}>
      <Sidebar />

      {/* Holographic Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 2px, 3px 100%'
      }} />

      <main className="ml-56 flex-1 relative flex flex-col items-center justify-center">
        {/* Scan Line Animation */}
        <AnimatePresence>
          {selectedRepo && scanPhase !== "idle" && scanPhase !== "reporting" && (
            <ScanLineAnimation repoName={selectedRepo.name} phase={scanPhase} />
          )}
        </AnimatePresence>

        {/* 3D Viewport */}
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
                <TopologyNode position={[-4, 0, 0]} label={nodeLabels[0]} isTargeted={false} isRepoNode={!!selectedRepo} />
                <TopologyNode position={[0, 2.5, 0]} label={nodeLabels[1]} isTargeted={isAttackActive} isRepoNode={!!selectedRepo} />
                <TopologyNode position={[4, 0, 0]} label={nodeLabels[2]} isTargeted={false} isRepoNode={!!selectedRepo} />
                <TopologyNode position={[0, -2.5, 0]} label={nodeLabels[3]} isTargeted={false} isRepoNode={!!selectedRepo} />

                {/* Attack Animation */}
                <AttackParticles start={[-4, 0, 0]} end={[0, 2, 0]} active={isAttackActive} />

                {/* Holographic Flow Paths */}
                <Line
                  points={[[-4, 0, 0], [0, 2, 0]]}
                  color={isAttackActive ? "#6C63FF" : "#00C2CB"}
                  lineWidth={1.5}
                  transparent
                  opacity={0.5}
                />
                <Line
                  points={[[-4, 0, 0], [0, -2, 0]]}
                  color="#00C2CB"
                  lineWidth={1.5}
                  transparent
                  opacity={0.5}
                />
                <Line
                  points={[[0, 2, 0], [4, 0, 0]]}
                  color="#00C2CB"
                  lineWidth={1.5}
                  transparent
                  opacity={0.5}
                />
                <Line
                  points={[[0, -2, 0], [4, 0, 0]]}
                  color="#00C2CB"
                  lineWidth={1.5}
                  transparent
                  opacity={0.5}
                />
              </group>
            </Suspense>

            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        </div>

        {/* UI Overlay */}
        <div className="relative z-10 w-full h-full p-8 flex flex-col justify-between pointer-events-none">
          {/* Top Header */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-3">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-sm pointer-events-auto"
              >
                <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] mb-1">War Room Context</h2>
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${isAttackActive ? 'text-purple-500 animate-pulse' : 'text-blue-500'}`} />
                  <span className="text-xl font-bold tracking-tight text-black">Active Infrastructure Map</span>
                </div>
              </motion.div>

              {/* Repository Selector */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <RepoSelector
                  repos={repos}
                  selectedRepo={selectedRepo}
                  onSelect={(r) => { setSelectedRepo(r); resetScan(); }}
                  isOpen={repoDropdownOpen}
                  setIsOpen={setRepoDropdownOpen}
                  scanPhase={scanPhase}
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-sm pointer-events-auto"
            >
              <div className="flex items-center gap-4">
                <DefenseRadar selectedRepo={selectedRepo} scanPhase={scanPhase} />
                <div className="h-10 w-px bg-gray-200" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Network Load</p>
                  <p className="text-lg font-mono font-bold text-blue-500">{isAttackActive ? '94.2%' : '12.4%'}</p>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active Threats</p>
                  <p className={`text-lg font-mono font-bold ${isAttackActive ? 'text-purple-500' : 'text-blue-500'}`}>
                    {isAttackActive ? '01' : '00'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Controls (Bento Style) */}
          <div className="grid grid-cols-4 gap-6">
            {/* Chaos Control */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="col-span-1 bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-sm pointer-events-auto"
            >
              <h3 className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-4">Chaos Simulation</h3>
              <div className="space-y-4">
                <ChaosToggle
                  label="Simulate DDoS"
                  active={activeAttackType === "ddos" && scanPhase !== "idle"}
                  onClick={() => handleChaosToggle("ddos")}
                  disabled={scanPhase !== "idle"}
                />
                <ChaosToggle
                  label="Inject Payload"
                  active={activeAttackType === "injection" && scanPhase !== "idle"}
                  onClick={() => handleChaosToggle("injection")}
                  disabled={scanPhase !== "idle"}
                />
                {scanPhase !== "idle" && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={resetScan}
                    className="w-full mt-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-3 h-3" /> Reset
                  </motion.button>
                )}
              </div>

              {/* Scan Phase Indicator */}
              {scanPhase !== "idle" && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    {scanPhase === "reporting" ? (
                      <Scan className="w-3 h-3 text-[#6C63FF]" />
                    ) : (
                      <Loader2 className="w-3 h-3 text-[#00C2CB] animate-spin" />
                    )}
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      {scanPhase === "scanning" && "Scanning target..."}
                      {scanPhase === "attacking" && "Attack in progress..."}
                      {scanPhase === "reporting" && `${vulnerabilities.length} vulns found`}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Scan Log (center column) */}
            <div className="col-span-2 flex items-end">
              <AnimatePresence>
                {scanLog.length > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="w-full bg-[#0B0E14]/90 backdrop-blur-xl border border-[#00C2CB]/20 rounded-xl p-4 pointer-events-auto max-h-32 overflow-auto"
                  >
                    {scanLog.map((line, i) => (
                      <motion.p
                        key={i}
                        initial={{ x: -5, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="text-[10px] font-mono text-[#00C2CB]/80 leading-relaxed"
                      >
                        {line}
                      </motion.p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Master Override */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="col-span-1 bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-sm pointer-events-auto flex flex-col items-center justify-center gap-4"
            >
              <h3 className="text-[10px] text-purple-500 font-bold uppercase tracking-widest">Security Protocol</h3>
              <MasterOverride onClick={toggleLockdown} active={isLockdown} />
            </motion.div>
          </div>

          {/* Device UUID watermark */}
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <p className="text-[8px] font-mono text-gray-300 tracking-wider">DEVICE {deviceUUID.slice(0, 12)}...</p>
          </div>
        </div>

        {/* Vulnerability Report Overlay */}
        <AnimatePresence>
          {showReport && selectedRepo && (
            <VulnerabilityReport
              vulns={vulnerabilities}
              repoName={selectedRepo.full_name}
              onClose={() => setShowReport(false)}
              onAutoMedic={handleAutoMedic}
            />
          )}
        </AnimatePresence>

        {/* Lockdown Overlay */}
        <AnimatePresence>
          {isLockdown && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-purple-500/5 backdrop-blur-md pointer-events-none overflow-hidden"
            >
              {/* Hexagonal Grid Overlay */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%236C63FF' fill='none'/%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
              }} />

              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-purple-500 blur-[120px] opacity-20 animate-pulse" />
                <div className="border border-purple-200 p-16 relative flex flex-col items-center gap-8 bg-white/90 backdrop-blur-3xl shadow-2xl rounded-2xl">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 border-purple-500" />
                  <div className="absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 border-purple-500" />
                  <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 border-purple-500" />
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 border-purple-500" />
                  
                  <div className="relative">
                    <Shield className="w-24 h-24 text-purple-600 animate-pulse" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-dashed border-purple-300 rounded-full scale-150"
                    />
                  </div>

                  <div className="text-center">
                    <h1 className="text-7xl font-black text-black tracking-[0.3em] mb-4">LOCKDOWN</h1>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent mb-4" />
                    <p className="text-purple-600 text-sm font-mono tracking-[0.5em] animate-pulse">ENCRYPTING ALL NETWORK NODES // LEVEL 4 PROTOCOL</p>
                  </div>

                  <div className="flex gap-8 text-[10px] font-mono text-gray-500">
                    <div className="flex flex-col items-center">
                      <span>NODES ISOLATED</span>
                      <span className="text-black font-bold">14/14</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>DATA SHIELD</span>
                      <span className="text-purple-600 font-bold">MAXIMUM</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const ChaosToggle = ({ label, active, onClick }: any) => {
  return (
    <div className="flex items-center justify-between group pointer-events-auto">
      <span className={`text-xs font-bold tracking-wider transition-colors duration-300 ${active ? 'text-black' : 'text-gray-500'}`}>
        {label}
      </span>
      <div 
        onClick={onClick}
        className="relative w-14 h-7 cursor-pointer"
      >
        {/* Track */}
        <div className={`absolute inset-0 rounded-full border transition-all duration-500 ${active ? 'bg-purple-100 border-purple-500' : 'bg-gray-100 border-gray-300'}`} />
        
        {/* Handle */}
        <motion.div 
          animate={{ 
            x: active ? 28 : 0,
            backgroundColor: active ? "#8b5cf6" : "#9ca3af"
          }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            mass: 0.8
          }}
          className="absolute top-1 left-1 w-5 h-5 rounded-full shadow-sm flex items-center justify-center"
        >
          <div className={`w-1 h-1 rounded-full ${active ? 'bg-white' : 'bg-gray-200'}`} />
        </motion.div>

        {/* Ripple Effect */}
        <AnimatePresence>
          {active && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-blue-500 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const MasterOverride = ({ onClick, active }: any) => {
  const [coverOpen, setCoverOpen] = useState(false);

  return (
    <div className="relative group flex flex-col items-center gap-6">
      <div 
        className="relative w-40 h-40 flex items-center justify-center cursor-pointer perspective-1000"
        onMouseEnter={() => setCoverOpen(true)}
        onMouseLeave={() => setCoverOpen(false)}
        onClick={() => coverOpen && onClick()}
      >
        {/* Glow Background */}
        <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${active ? 'bg-purple-500 opacity-40' : 'bg-blue-500'}`} />

        {/* Under Button */}
        <div className={`relative z-0 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${active ? 'bg-purple-500 shadow-purple-200' : 'bg-white border-2 border-purple-200'}`}>
          <motion.div
            animate={{ scale: active ? [1, 1.2, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {active ? <Shield className="w-12 h-12 text-white" /> : <Lock className="w-12 h-12 text-purple-300" />}
          </motion.div>
        </div>

        {/* Glass Cover */}
        <motion.div 
          animate={{ rotateX: coverOpen ? -130 : 0, y: coverOpen ? -20 : 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
          style={{ transformOrigin: "top", transformStyle: "preserve-3d" }}
          className="absolute inset-x-0 top-0 h-40 bg-white/50 backdrop-blur-md border border-gray-200 rounded-2xl flex flex-col items-center justify-center pointer-events-none z-10 shadow-lg"
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
          <p className="text-[10px] font-black italic text-gray-500 uppercase tracking-[0.4em] mb-2">Level 4 Clearance</p>
          <div className="flex gap-1">
             {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" />)}
          </div>
        </motion.div>
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-mono tracking-widest transition-colors ${coverOpen ? 'text-purple-600' : 'text-gray-400'}`}>
          {coverOpen ? "ENGAGE MASTER OVERRIDE" : "RESTRICTED ACCESS"}
        </p>
      </div>
    </div>
  );
};

export default AttackPath;
