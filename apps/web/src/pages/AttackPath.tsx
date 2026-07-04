import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  ChevronDown,
  Crosshair,
  Bug,
  FileWarning,
  ArrowRight,
  Loader2,
  Target,
  Scan,
  Copy,
  ClipboardCopy,
  ExternalLink,
  X,
  Zap,
  Server,
  Globe,
  Github,
  Activity,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";

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
  source?: string;
}

interface ToolArtifact {
  path: string;
  kind: string;
  sizeBytes?: number;
}

interface ToolStatus {
  tool: string;
  status: "ran" | "skipped" | "failed";
  findingsCount: number;
  error?: string | null;
  rawExitCode?: number | null;
  artifacts: ToolArtifact[];
}

type ScanKind = "repo" | "live" | null;
type ScanStatus = "idle" | "scanning" | "reporting";

// ─── Helpers ────────────────────────────────────────────────────

function normalizeSeverity(value: unknown): Vulnerability["severity"] {
  const upper = String(value || "").toUpperCase();
  if (upper === "CRITICAL" || upper === "HIGH") return "critical";
  if (upper === "MODERATE" || upper === "MEDIUM") return "medium";
  return "low";
}

function normalizeFindings(input: unknown): Vulnerability[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      const title = String(row.title || row.packageName || `Finding ${index + 1}`).trim();
      const detail = String(
        row.detail || row.summary || row.advisorySummary || "Security issue detected during scan."
      ).trim();

      return {
        id: String(row.id || row.findingId || `finding-${index + 1}`),
        severity: normalizeSeverity(row.severity),
        title,
        detail,
        file: typeof row.file === "string" ? row.file : undefined,
        source: typeof row.source === "string" ? row.source : undefined,
      } satisfies Vulnerability;
    })
    .filter((item) => item.title.length > 0);
}

function normalizeToolStatuses(input: unknown): ToolStatus[] {
  if (!Array.isArray(input)) return [];

  return input.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      tool: String(row.tool || "unknown"),
      status: (String(row.status || "skipped") as ToolStatus["status"]),
      findingsCount: Number(row.findingsCount || 0),
      error: row.error ? String(row.error) : null,
      rawExitCode: typeof row.rawExitCode === "number" ? row.rawExitCode : null,
      artifacts: Array.isArray(row.artifacts)
        ? row.artifacts.map((artifact) => {
            const a = artifact as Record<string, unknown>;
            return {
              path: String(a.path || ""),
              kind: String(a.kind || "report"),
              sizeBytes: typeof a.sizeBytes === "number" ? a.sizeBytes : undefined,
            } satisfies ToolArtifact;
          })
        : [],
    } satisfies ToolStatus;
  });
}

function buildStreamUrl(jobId: string): string {
  const baseUrl = String(apiClient.defaults.baseURL || "").replace(/\/+$/, "");
  return `${baseUrl}/attack-paths/jobs/${jobId}/stream`;
}

function getRemediation(vuln: Vulnerability): string {
  const source = String(vuln.source || "").toLowerCase();
  const title = String(vuln.title || "").toLowerCase();

  if (source.includes("github_security_alert") || source.includes("package_scan") || title.includes("dependency")) {
    return `Upgrade the affected package to a patched version, review the advisory, run tests, and rerun the scan to confirm the finding closes.`;
  }
  if (source.includes("secret_scan")) {
    return `Rotate the exposed credential immediately, remove it from source control, store it in a secrets manager, and verify the leak no longer appears in responses.`;
  }
  if (source.includes("sast_scan")) {
    return `Review the reported code pattern, replace unsafe APIs with safer equivalents, add input validation, and rerun the scan.`;
  }
  if (source.includes("iac_scan")) {
    return `Update the infrastructure config to remove overly permissive access, add required security headers or health checks, and rerun the scan.`;
  }
  if (source.includes("dast_scan")) {
    return `Update the application or hosting configuration to add the missing headers/policy, validate inputs, and verify on the live target with another scan.`;
  }
  if (source.includes("sbom_scan")) {
    return `Keep dependencies up to date, remove unused packages, activate security advisories, and rerun the scan.`;
  }
  if (source.includes("cspm_scan")) {
    return `Review cloud or hosting config for least privilege, remove public exposure where not needed, and verify provider security settings.`;
  }
  if (source.includes("live_deployment_scan")) {
    return `Rotate the exposed credential, remove it from source control, store it in a secrets manager, and verify the leak no longer appears in production responses.`;
  }
  return `Review the reported issue in context, apply a targeted code or configuration fix, and rerun a security scan to verify remediation.`;
}

function formatVulnerabilityForCopy(vuln: Vulnerability): string {
  const lines = [
    `Title: ${vuln.title}`,
    `Severity: ${vuln.severity.toUpperCase()}`,
    vuln.source ? `Source: ${vuln.source.replace(/_/g, " ")}` : null,
    vuln.file ? `Location: ${vuln.file}` : null,
    `Detail: ${vuln.detail}`,
    `Suggested fix: ${getRemediation(vuln)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

// ─── UI Components ──────────────────────────────────────────────

const StatusBadge = ({ status }: { status: ScanStatus }) => {
  const config = {
    idle: { label: "Ready", icon: ShieldCheck, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    scanning: { label: "Scanning", icon: Loader2, className: "bg-blue-50 text-blue-700 border-blue-200" },
    reporting: { label: "Report", icon: CheckCircle2, className: "bg-[#6C63FF]/10 text-[#6C63FF] border-[#6C63FF]/20" },
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono ${config.className}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "scanning" ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
};

const SeverityBadge = ({ severity }: { severity: Vulnerability["severity"] }) => {
  const config = {
    critical: "bg-[#6C63FF]/10 text-[#6C63FF] border-[#6C63FF]/20",
    medium: "bg-[#00C2CB]/10 text-[#00C2CB] border-[#00C2CB]/20",
    low: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
  }[severity];

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold ${config}`}>
      {severity.toUpperCase()}
    </span>
  );
};

const RepoDropdown = ({
  repos,
  selectedRepo,
  onSelect,
  isOpen,
  setIsOpen,
  disabled,
}: {
  repos: RepoSummary[];
  selectedRepo: RepoSummary | null;
  onSelect: (repo: RepoSummary) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled?: boolean;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [setIsOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm transition hover:border-[#00C2CB] disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <Github className="h-4 w-4 text-gray-500" />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">
              {selectedRepo ? selectedRepo.full_name : "Select a repository"}
            </p>
            {selectedRepo?.language && (
              <p className="text-[11px] text-gray-500">{selectedRepo.language}</p>
            )}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl"
          >
            <div className="max-h-64 overflow-auto">
              {repos.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-500">No repositories linked.</div>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.id}
                    onSelect={() => {}}
                    onClick={() => {
                      onSelect(repo);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                      selectedRepo?.id === repo.id ? "border-l-2 border-l-[#00C2CB] bg-gray-50" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <Crosshair className={`h-3.5 w-3.5 ${selectedRepo?.id === repo.id ? "text-[#00C2CB]" : "text-gray-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{repo.name}</p>
                      <p className="truncate text-[11px] text-gray-500">{repo.full_name}</p>
                    </div>
                    {repo.language && (
                      <span className="text-[10px] text-gray-500 font-mono">{repo.language}</span>
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

const VulnerabilityCard = ({ vuln, onCopy, copiedId }: { vuln: Vulnerability; onCopy: (vuln: Vulnerability) => void; copiedId: string | null }) => {
  const cfg = {
    critical: "border-[#6C63FF]/30 bg-[#6C63FF]/5",
    medium: "border-[#00C2CB]/30 bg-[#00C2CB]/5",
    low: "border-[#F59E0B]/30 bg-[#F59E0B]/5",
  }[vuln.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${cfg} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={vuln.severity} />
            {vuln.file && (
              <span className="text-[11px] font-mono text-gray-500">{vuln.file}</span>
            )}
            {vuln.source && (
              <span className="text-[10px] font-mono text-gray-500 bg-white/50 border border-gray-200 rounded-full px-2 py-0.5">
                {vuln.source.replace(/_/g, " ")}
              </span>
            )}
          </div>

          <h4 className="mt-2 text-sm font-semibold text-gray-900">{vuln.title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">{vuln.detail}</p>

          <div className="mt-3 rounded-lg border border-gray-200 bg-white/70 p-3">
            <p className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Suggested Fix</p>
            <p className="mt-1 text-xs text-gray-700">{getRemediation(vuln)}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Bug className="h-4 w-4 text-gray-600" />
          <button
            type="button"
            onClick={() => onCopy(vuln)}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:text-[#00C2CB]"
            title="Copy for AI agent"
          >
            {copiedId === vuln.id ? (
              <ClipboardCopy className="h-3.5 w-3.5 text-[#00C2CB]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 p-10 text-center">
    <Shield className="h-10 w-10 text-gray-400" />
    <h3 className="mt-3 text-sm font-semibold text-gray-900">No scan results yet</h3>
    <p className="mt-1 max-w-sm text-xs text-gray-600">
      Select a repository and start a scan to discover GitHub security alerts and live deployment
      exposure issues.
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#00C2CB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00C2CB]/90"
    >
      <Scan className="h-3.5 w-3.5" />
      Start Scan
    </button>
  </div>
);

const ToolStatusPanel = ({ toolStatuses }: { toolStatuses: ToolStatus[] }) => {
  if (toolStatuses.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Scanner Status</h3>
        <span className="text-[10px] font-mono text-gray-500">{toolStatuses.length} tools</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {toolStatuses.map((tool) => (
          <div key={tool.tool} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-900">{tool.tool}</p>
                <p className="text-[11px] text-gray-500">
                  {tool.status} • {tool.findingsCount} findings
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                tool.status === "ran"
                  ? "bg-emerald-50 text-emerald-700"
                  : tool.status === "failed"
                    ? "bg-red-50 text-red-700"
                    : "bg-gray-100 text-gray-600"
              }`}>
                {tool.status.toUpperCase()}
              </span>
            </div>
            {tool.error && (
              <p className="mt-2 text-[11px] text-red-600">{tool.error}</p>
            )}
            {tool.artifacts.length > 0 && (
              <div className="mt-2 space-y-1">
                {tool.artifacts.map((artifact, index) => (
                  <p key={`${tool.tool}-${index}`} className="text-[11px] font-mono text-gray-500 break-all">
                    {artifact.kind}: {artifact.path}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────

const AttackPath = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [repoLoadError, setRepoLoadError] = useState<string | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);

  const [scanKind, setScanKind] = useState<ScanKind>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetUrlError, setTargetUrlError] = useState<string | null>(null);

  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [
    resultsSummary,
    setResultsSummary,
  ] = useState<{
    total: number;
    github: number;
    package: number;
    secret: number;
    sast: number;
    iac: number;
    dast: number;
    sbom: number;
    cspm: number;
    live: number;
  } | null>(null);
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const activeStreamRef = useRef<AbortController | null>(null);
  const deviceUUID = useMemo(() => {
    const KEY = "orizon_device_uuid";
    let uuid = localStorage.getItem(KEY);
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem(KEY, uuid);
    }
    return uuid;
  }, []);

  // ─── Repo loading ────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadRepos = async () => {
      setRepoLoading(true);
      setRepoLoadError(null);
      try {
        const res = await apiClient.get("/github/repos");
        setRepos(res.data || []);
      } catch (err) {
        console.error("Failed to load repositories for /attack", err);
        setRepos([]);
        setRepoLoadError("Repository load failed. Please refresh or re-link your GitHub connection.");
      } finally {
        setRepoLoading(false);
      }
    };

    loadRepos();
  }, [isAuthenticated]);

  useEffect(() => {
    return () => activeStreamRef.current?.abort();
  }, []);

  // ─── Scan ────────────────────────────────────────────────────

  const startScan = useCallback(
    async (kind: ScanKind) => {
      if (scanStatus === "scanning") return;
      if (!selectedRepo && kind === "repo") return;

      setScanKind(kind);
      setScanStatus("scanning");
      setResultsSummary(null);
      setToolStatuses([]);
      setVulnerabilities([]);

      const logs: string[] = [];
      const timestamp = new Date().toISOString();
      logs.push(`[${timestamp}] DEVICE ${deviceUUID.slice(0, 8)}... initiating ${kind} scan`);

      if (kind === "repo") {
        logs.push(`[TARGET] ${selectedRepo!.full_name}`);
      }

      const trimmedTargetUrl = targetUrl.trim();
      if (kind === "live" && trimmedTargetUrl) {
        try {
          new URL(trimmedTargetUrl);
          setTargetUrlError(null);
        } catch {
          setTargetUrlError("Enter a valid live deployment URL, including https://");
          setScanStatus("idle");
          setScanKind(null);
          return;
        }
        logs.push(`[LIVE] ${trimmedTargetUrl}`);
      }

      if (kind === "repo" && !trimmedTargetUrl) {
        logs.push(`[MODE] Repository vulnerability scan only`);
      }

      setScanLog([...logs]);

      activeStreamRef.current?.abort();
      const controller = new AbortController();
      activeStreamRef.current = controller;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error("Missing authenticated session for security scan stream");
        }

        const scanTypes = kind === "repo" ? ["supply_chain"] : ["secrets", "injection"];
        const requestBody: Record<string, unknown> = {
          scanTypes,
          analysisDepth: 2,
          deviceId: deviceUUID,
        };

        if (kind === "repo" && selectedRepo) {
          requestBody.repoId = String(selectedRepo.id);
          requestBody.repoFullName = selectedRepo.full_name;
          if (trimmedTargetUrl) requestBody.targetUrl = trimmedTargetUrl;
        }

        if (kind === "live" && trimmedTargetUrl) {
          requestBody.targetUrl = trimmedTargetUrl;
          requestBody.repoId = String(selectedRepo?.id || trimmedTargetUrl);
          requestBody.repoFullName = selectedRepo?.full_name || trimmedTargetUrl;
        }

        const createRes = await apiClient.post("/attack-paths/jobs", requestBody);
        const jobId = String(createRes.data.jobId);
        logs.push(`[JOB] ${jobId}`);
        setScanLog([...logs]);

        const streamUrl = buildStreamUrl(jobId);
        const resp = await fetch(streamUrl, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          throw new Error(`Scan stream failed: ${resp.status}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let resultLoaded = false;

        const loadFinalResults = async () => {
          if (resultLoaded) return;
          resultLoaded = true;

          const resultRes = await apiClient.get(`/attack-paths/jobs/${jobId}`);
          const findings = normalizeFindings(resultRes.data?.findings || resultRes.data?.results);
          const summary = {
            total: findings.length,
            github: findings.filter((item) => item.source === "github_security_alert").length,
            package: findings.filter((item) => item.source === "package_scan").length,
            secret: findings.filter((item) => item.source === "secret_scan").length,
            sast: findings.filter((item) => item.source === "sast_scan").length,
            iac: findings.filter((item) => item.source === "iac_scan").length,
            dast: findings.filter((item) => item.source === "dast_scan").length,
            sbom: findings.filter((item) => item.source === "sbom_scan").length,
            cspm: findings.filter((item) => item.source === "cspm_scan").length,
            live: findings.filter((item) => item.source === "live_deployment_scan").length,
          };

          setResultsSummary(summary);
          setToolStatuses(normalizeToolStatuses(resultRes.data?.toolStatuses || []));
          setVulnerabilities(findings);
          setScanStatus("reporting");
          setScanLog((prev) => [...prev, `[REPORT] Scan complete. ${findings.length} findings detected.`]);
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n").filter(Boolean);
            const eventLine = lines.find((line) => line.startsWith("event:"));
            const dataLine = lines.find((line) => line.startsWith("data:"));
            const event = eventLine ? eventLine.replace("event:", "").trim() : "progress";
            const dataStr = dataLine ? dataLine.replace("data:", "").trim() : "";
            const data = dataStr ? JSON.parse(dataStr) : {};
            const phase = String(data?.phase || data?.status || "");
            const statusMessage = String(data?.statusMessage || "");

            if (event === "progress") {
              if (statusMessage) {
                setScanLog((prev) => [...prev, `[${phase || event}] ${statusMessage}`]);
              }
            }

            if (event === "completed" || phase === "completed") {
              await loadFinalResults();
              break;
            }

            if (event === "failed" || phase === "failed" || event === "error") {
              const message = String(data?.lastError || data?.message || "Scan failed");
              setScanLog((prev) => [...prev, `[ERROR] ${message}`]);
              setScanStatus("idle");
              setScanKind(null);
              break;
            }
          }
        }

        if (!resultLoaded) {
          const resultRes = await apiClient.get(`/attack-paths/jobs/${jobId}`);
          if (String(resultRes.data?.status || "") === "completed") {
            await loadFinalResults();
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setScanLog((prev) => [...prev, `[ERROR] ${err?.message || "Failed to start scan"}`]);
        setScanStatus("idle");
        setScanKind(null);
      } finally {
        activeStreamRef.current = null;
      }
    },
    [deviceUUID, selectedRepo, scanStatus, targetUrl]
  );

  const resetScan = useCallback(() => {
    activeStreamRef.current?.abort();
    setScanStatus("idle");
    setScanKind(null);
    setResultsSummary(null);
    setToolStatuses([]);
    setVulnerabilities([]);
    setScanLog([]);
    setTargetUrlError(null);
  }, []);

  const copyVulnerability = useCallback(async (vuln: Vulnerability) => {
    await navigator.clipboard.writeText(formatVulnerabilityForCopy(vuln));
    setCopiedId(vuln.id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const copyReport = useCallback(async () => {
    const header = [
      `Vulnerability Report`,
      selectedRepo ? `Repository: ${selectedRepo.full_name}` : "Live scan only",
      targetUrl.trim() ? `Live target: ${targetUrl.trim()}` : null,
      `Total findings: ${vulnerabilities.length}`,
      "",
    ].filter(Boolean);

    const body = vulnerabilities
      .map((vuln, index) => `[${index + 1}] ${formatVulnerabilityForCopy(vuln)}`)
      .join("\n\n");

    await navigator.clipboard.writeText([...header, body].join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }, [selectedRepo, targetUrl, vulnerabilities]);

  const sendToAutoMedic = useCallback(
    (vulns: Vulnerability[]) => {
      const params = new URLSearchParams();
      params.set("source", "attack-path");
      if (selectedRepo?.full_name) params.set("repo", selectedRepo.full_name);
      if (targetUrl.trim()) params.set("targetUrl", targetUrl.trim());
      params.set("vulns", JSON.stringify(vulns.map((v) => ({ severity: v.severity, title: v.title, file: v.file }))));
      navigate(`/automedic?${params.toString()}`);
    },
    [navigate, selectedRepo, targetUrl]
  );

  const scanDisabled = scanStatus === "scanning";

  return (
    <div className="flex flex-1 flex-col bg-white text-gray-900">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
              <Shield className="h-5 w-5 text-[#00C2CB]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Attack Paths</h1>
              <p className="text-xs text-gray-500">
                Scan repositories and live deployments for real vulnerabilities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={scanStatus} />
            <button
              type="button"
              onClick={resetScan}
              disabled={scanStatus === "idle"}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Server className="h-4 w-4 text-[#00C2CB]" />
              Repository Scan
            </div>
            <div className="mt-3">
              <RepoDropdown
                repos={repos}
                selectedRepo={selectedRepo}
                onSelect={(repo) => {
                  setSelectedRepo(repo);
                  resetScan();
                }}
                isOpen={repoDropdownOpen}
                setIsOpen={setRepoDropdownOpen}
                disabled={scanDisabled}
              />
              {repoLoading && <p className="mt-2 text-[11px] text-gray-500">Loading repositories...</p>}
              {repoLoadError && <p className="mt-2 text-[11px] text-red-600">{repoLoadError}</p>}
            </div>
            <button
              type="button"
              onClick={() => startScan("repo")}
              disabled={scanDisabled || !selectedRepo}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C2CB] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#00C2CB]/90 disabled:opacity-50"
            >
              <Scan className="h-3.5 w-3.5" />
              Scan Repository
            </button>
            <p className="mt-2 text-[10px] text-gray-500">Covers GitHub alerts, dependency scan, secrets, SAST, IaC, SBOM, and CSPM configs.</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Globe className="h-4 w-4 text-[#F59E0B]" />
              Live Deployment Scan
            </div>
            <div className="mt-3">
              <input
                type="url"
                value={targetUrl}
                onChange={(event) => {
                  setTargetUrl(event.target.value);
                  if (targetUrlError) setTargetUrlError(null);
                }}
                placeholder="https://your-site.example"
                disabled={scanDisabled}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#00C2CB] focus:ring-2 focus:ring-[#00C2CB]/20 disabled:opacity-50"
              />
              {targetUrlError && <p className="mt-2 text-[11px] text-red-600">{targetUrlError}</p>}
              <p className="mt-2 text-[11px] text-gray-500">Optional. Scans for exposed secrets and unsafe public responses.</p>
            </div>
            <button
              type="button"
              onClick={() => startScan("live")}
              disabled={scanDisabled || !targetUrl.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#F59E0B]/90 disabled:opacity-50"
            >
              <Activity className="h-3.5 w-3.5" />
              Scan Live Target
            </button>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Target className="h-4 w-4 text-gray-500" />
              Quick Actions
            </div>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setTargetUrl("")}
                disabled={scanDisabled}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Clear live target
              </button>
              <button
                type="button"
                onClick={resetScan}
                disabled={scanDisabled && scanStatus !== "idle"}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Clear results
              </button>
            </div>
            <p className="mt-3 text-[11px] text-gray-500">
              Need help? Use <strong>Auto-Medic</strong> to hand off vulnerabilities to an AI agent.
            </p>
          </div>
        </div>

        {/* Scan Log */}
        <AnimatePresence>
          {scanLog.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Scan Log</p>
                <span className="text-[10px] text-gray-500">{scanLog.length} events</span>
              </div>
              <div className="mt-3 max-h-40 space-y-1 overflow-auto">
                {scanLog.map((line, index) => (
                  <p key={index} className="text-[11px] font-mono text-gray-600">
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ToolStatusPanel toolStatuses={toolStatuses} />

        {/* Report */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Findings</h2>
              {resultsSummary && (
                <p className="text-[11px] text-gray-500">
                  {resultsSummary.total} total • {resultsSummary.github} github • {resultsSummary.package} packages • {resultsSummary.secret} secrets • {resultsSummary.sast} sast • {resultsSummary.iac} iac • {resultsSummary.dast} dast • {resultsSummary.sbom} sbom • {resultsSummary.cspm} cspm • {resultsSummary.live} live
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {vulnerabilities.length > 0 && (
                <button
                  type="button"
                  onClick={copyReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {copiedAll ? <ClipboardCopy className="h-3.5 w-3.5 text-[#00C2CB]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedAll ? "Copied" : "Copy Report"}
                </button>
              )}
              {vulnerabilities.length > 0 && (
                <button
                  type="button"
                  onClick={() => sendToAutoMedic(vulnerabilities)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5a53e0]"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Fix with Auto-Medic
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {scanStatus === "idle" && vulnerabilities.length === 0 ? (
            <EmptyState onRetry={() => startScan(selectedRepo ? "repo" : "live")} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {vulnerabilities.map((vuln) => (
                <VulnerabilityCard
                  key={vuln.id}
                  vuln={vuln}
                  onCopy={copyVulnerability}
                  copiedId={copiedId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 px-5 py-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#00C2CB]" />
            Scans run through your connected GitHub credentials and optional live target. Results are real.
          </div>
          {selectedRepo && (
            <div className="hidden items-center gap-2 md:flex">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="font-mono">{selectedRepo.full_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttackPath;
