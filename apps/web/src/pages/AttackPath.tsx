import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Copy,
  Crosshair,
  ExternalLink,
  FileWarning,
  Github,
  Loader2,
  Route,
  Scan,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Target,
  X,
  Zap,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";

/* ─── Interfaces ─── */

interface RepoSummary {
  id: number;
  name: string;
  full_name: string;
  language: string | null;
}

interface Vulnerability {
  id: string;
  severity: "critical" | "medium" | "low";
  title: string;
  detail: string;
  file?: string;
  source?: string;
}

interface ToolStatus {
  tool: string;
  status: "ran" | "skipped" | "failed";
  findingsCount: number;
  error?: string | null;
}

interface AttackPathCandidate {
  id: string;
  route: string;
  routeFile: string;
  authBoundary: "present" | "not_detected";
  findingId: string;
  findingTitle: string;
  findingFile?: string;
  severity: Vulnerability["severity"];
  confidence: "partial";
  note: string;
}

type ScanLifecycle = "idle" | "warming" | "queued" | "running" | "completed" | "cancelled" | "failed";

interface ScanJob {
  jobId: string;
  repoFullName: string;
  status: string;
  progressPct: number;
  phaseMessage: string;
  queuePosition: number;
  queueReason: string;
  lastError: string;
  quotaRemaining?: number;
  toolStatuses: ToolStatus[];
  scanMetrics?: Record<string, unknown>;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
}

interface ScanAllowance {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string | null;
}

/** Findings grouped by rule title */
interface FindingGroup {
  ruleTitle: string;
  severity: Vulnerability["severity"];
  source?: string;
  instances: Vulnerability[];
}

/* ─── Constants ─── */

const ACTIVE_JOB_STORAGE_KEY = "servx_attack_paths_active_job";
const LAST_JOB_STORAGE_KEY = "servx_attack_paths_last_job";

const STAGES = [
  { id: "queued", label: "Queue", detail: "Waiting for the shared executor" },
  { id: "repository", label: "Repository", detail: "Preparing the authorized source" },
  { id: "secrets", label: "Secrets", detail: "Checking source and history" },
  { id: "code", label: "Code", detail: "Applying source-security rules" },
  { id: "dependencies", label: "Dependencies & IaC", detail: "Checking packages and configuration" },
  { id: "inventory", label: "Inventory", detail: "Building the software inventory" },
  { id: "report", label: "Report", detail: "Normalizing evidence for review" },
] as const;

/* ─── Normalizers ─── */

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
      return {
        id: String(row.id || row.findingId || `finding-${index + 1}`),
        severity: normalizeSeverity(row.severity),
        title: String(row.title || row.packageName || `Finding ${index + 1}`).trim(),
        detail: String(row.detail || row.summary || row.advisorySummary || "Security issue detected during scan.").trim(),
        file: typeof row.file === "string" ? row.file : undefined,
        source: typeof row.source === "string" ? row.source : undefined,
      } satisfies Vulnerability;
    })
    .filter((finding) => finding.title.length > 0);
}

function normalizeToolStatuses(input: unknown): ToolStatus[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const row = item as Record<string, unknown>;
    const rawStatus = String(row.status || "skipped");
    return {
      tool: String(row.tool || "unknown"),
      status: rawStatus === "ran" || rawStatus === "failed" ? rawStatus : "skipped",
      findingsCount: Number(row.findingsCount || 0),
      error: row.error ? String(row.error) : null,
    } satisfies ToolStatus;
  });
}

function normalizeAttackPathCandidates(input: unknown): AttackPathCandidate[] {
  if (!Array.isArray(input)) return [];
  return input.map((item, index) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id || `candidate-${index + 1}`),
      route: String(row.route || "unknown route"),
      routeFile: String(row.routeFile || "repository source"),
      authBoundary: row.authBoundary === "present" ? "present" : "not_detected",
      findingId: String(row.findingId || ""),
      findingTitle: String(row.findingTitle || "Source finding"),
      findingFile: typeof row.findingFile === "string" ? row.findingFile : undefined,
      severity: normalizeSeverity(row.severity),
      confidence: "partial",
      note: String(row.note || "Source-local candidate; reachability and deployment exposure are not verified."),
    } satisfies AttackPathCandidate;
  });
}

function normalizeScanAllowance(input: unknown): ScanAllowance | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const remaining = Number(row.remaining);
  if (!Number.isFinite(remaining)) return null;
  const limit = Number(row.limit);
  const used = Number(row.used);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 3,
    used: Number.isFinite(used) && used >= 0 ? Math.floor(used) : 0,
    remaining: Math.max(0, Math.floor(remaining)),
    resetAt: typeof row.resetAt === "string" ? row.resetAt : null,
  };
}

/* ─── Lifecycle helpers ─── */

function lifecycleForStatus(status: string): ScanLifecycle {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "failed";
  if (status === "warming" || status === "retrying") return "warming";
  if (status === "queued") return "queued";
  return "running";
}

function isTerminal(status: string): boolean {
  return ["completed", "cancelled", "failed"].includes(status);
}

function activeStageIndex(job: ScanJob | null): number {
  if (!job) return -1;
  if (job.status === "completed") return STAGES.length - 1;
  if (["warming", "queued", "retrying"].includes(job.status)) return 0;
  const message = job.phaseMessage.toLowerCase();
  if (message.includes("secret")) return 2;
  if (message.includes("semgrep") || message.includes("source code")) return 3;
  if (message.includes("dependenc") || message.includes("infrastructure") || message.includes("configuration")) return 4;
  if (message.includes("inventory") || message.includes("sbom")) return 5;
  if (message.includes("normalizing") || message.includes("report")) return 6;
  if (job.progressPct < 20) return 1;
  if (job.progressPct < 40) return 2;
  if (job.progressPct < 55) return 3;
  if (job.progressPct < 65) return 4;
  if (job.progressPct < 85) return 5;
  return 6;
}

/* ─── Format helpers ─── */

function formatDuration(value: unknown): string | null {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return null;
  const seconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

function formatTimestamp(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatTimeUntil(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "shortly";
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  return `in ${diffHours}h ${remMin}m`;
}

function streamUrl(jobId: string): string {
  const baseUrl = String(apiClient.defaults.baseURL || "").replace(/\/+$/, "");
  return `${baseUrl}/attack-paths/jobs/${jobId}/stream`;
}

function remediationFor(finding: Vulnerability): string {
  const source = String(finding.source || "").toLowerCase();
  if (source.includes("package") || source.includes("github_security")) return "Upgrade to a patched version, review the advisory, and rerun the scan.";
  if (source.includes("secret")) return "Rotate the credential, remove it from source, and rerun the scan to confirm the finding closes.";
  if (source.includes("sast")) return "Replace the unsafe pattern, validate untrusted input, and add a regression test.";
  if (source.includes("iac")) return "Restrict the configuration, apply least privilege, and rerun the scan.";
  return "Review the evidence in context, apply a targeted fix, and rerun the scan.";
}

function severityClass(severity: Vulnerability["severity"]): string {
  if (severity === "critical") return "border-[#E5B6B4] bg-[#FFF4F3] text-[#B12926]";
  if (severity === "medium") return "border-[#E8CE9C] bg-[#FFF9EA] text-[#A05B00]";
  return "border-[#B9D5DC] bg-[#F0FAFC] text-[#286778]";
}

function sourceLabel(source?: string): string {
  return source ? source.replace(/_/g, " ") : "repository evidence";
}

/** Derive a domain tab key from the raw finding source string */
function sourceDomain(source?: string): string {
  const s = (source || "").toLowerCase();
  if (s.includes("secret")) return "secrets";
  if (s.includes("sast") || s.includes("semgrep")) return "sast";
  if (s.includes("package") || s.includes("depend") || s.includes("github_security")) return "deps";
  if (s.includes("iac") || s.includes("cspm") || s.includes("trivy") || s.includes("config")) return "cspm";
  return "other";
}

const DOMAIN_LABELS: Record<string, string> = {
  secrets: "Secrets",
  sast: "SAST",
  deps: "Dependencies",
  cspm: "Config & IaC",
  other: "Other",
};

/* ─── Group findings by rule title ─── */

function groupFindingsByRule(findings: Vulnerability[]): FindingGroup[] {
  const map = new Map<string, FindingGroup>();
  for (const f of findings) {
    const key = `${f.title}::${f.severity}::${f.source || ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.instances.push(f);
    } else {
      map.set(key, { ruleTitle: f.title, severity: f.severity, source: f.source, instances: [f] });
    }
  }
  // Sort: critical first, then medium, then low; within same severity, more instances first
  const order: Record<string, number> = { critical: 0, medium: 1, low: 2 };
  return [...map.values()].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3) || b.instances.length - a.instances.length);
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

/* ─── RepoSelect (unchanged) ─── */

const RepoSelect = ({
  repos,
  selectedRepo,
  disabled,
  onSelect,
}: {
  repos: RepoSummary[];
  selectedRepo: RepoSummary | null;
  disabled: boolean;
  onSelect: (repo: RepoSummary) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [open]);

  const filteredRepos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return repos;
    return repos.filter(
      (repo) =>
        repo.full_name.toLowerCase().includes(query) ||
        repo.name.toLowerCase().includes(query) ||
        (repo.language && repo.language.toLowerCase().includes(query))
    );
  }, [repos, searchQuery]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="attack-paths-repositories"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-9 w-full items-center justify-between gap-3 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-left outline-none transition hover:border-[#008E9A] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Github className="h-3.5 w-3.5 shrink-0 text-[#53656D]" />
          <span className="truncate text-sm font-semibold text-[#17262D]">{selectedRepo?.full_name || "Select repository"}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#53656D] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id="attack-paths-repositories" role="listbox" className="absolute z-30 mt-2 flex max-h-80 w-full min-w-[280px] flex-col overflow-hidden rounded-xl border border-[#D4E0E3] bg-[#FCFEFE] shadow-[0_12px_32px_rgb(23_38_45_/_0.12)]">
          <div className="border-b border-[#D4E0E3] bg-[#FCFEFE] p-2">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-3.5 w-3.5 text-[#53656D]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repository or language..."
                className="w-full rounded-md border border-[#D4E0E3] bg-[#F4F8F9] py-1.5 pl-8 pr-7 text-xs text-[#17262D] outline-none placeholder:text-[#839198] focus:border-[#008E9A] focus:bg-[#FCFEFE]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 rounded p-0.5 text-[#53656D] hover:text-[#17262D]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredRepos.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-[#53656D]">
                {repos.length === 0 ? "No connected repositories found." : `No repositories matching "${searchQuery}".`}
              </p>
            ) : (
              filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  role="option"
                  aria-selected={selectedRepo?.id === repo.id}
                  onClick={() => { onSelect(repo); setOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition hover:bg-[#EDF4F5] focus-visible:bg-[#EDF4F5] ${selectedRepo?.id === repo.id ? "bg-[#EDF4F5]" : ""}`}
                >
                  <Crosshair className="h-4 w-4 shrink-0 text-[#008E9A]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#17262D]">{repo.full_name}</span>
                    <span className="block truncate font-mono text-[10px] text-[#53656D]">{repo.language || "repository"}</span>
                  </span>
                  {selectedRepo?.id === repo.id && <CheckCircle2 className="h-4 w-4 text-[#16754B]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── LifecycleBadge (unchanged) ─── */

const LifecycleBadge = ({ lifecycle }: { lifecycle: ScanLifecycle }) => {
  const details = {
    idle: { label: "Ready", className: "border-[#B9D5DC] bg-[#F0FAFC] text-[#286778]", icon: ShieldCheck },
    warming: { label: "Waking executor", className: "border-[#E8CE9C] bg-[#FFF9EA] text-[#A05B00]", icon: Loader2 },
    queued: { label: "Queued", className: "border-[#B9D5DC] bg-[#F0FAFC] text-[#2867A5]", icon: Loader2 },
    running: { label: "Scanning", className: "border-[#B9D5DC] bg-[#F0FAFC] text-[#2867A5]", icon: Loader2 },
    completed: { label: "Evidence ready", className: "border-[#B9DCC7] bg-[#F2FAF5] text-[#16754B]", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", className: "border-[#D4E0E3] bg-[#EDF4F5] text-[#53656D]", icon: X },
    failed: { label: "Needs attention", className: "border-[#E5B6B4] bg-[#FFF4F3] text-[#B12926]", icon: AlertTriangle },
  }[lifecycle];
  const Icon = details.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${details.className}`}><Icon className={`h-3 w-3 ${["warming", "queued", "running"].includes(lifecycle) ? "animate-spin" : ""}`} />{details.label}</span>;
};

/* ─── Scan Command Mode: full stepper + controls (before/during scan) ─── */

const ScanCommandMode = ({
  job,
  lifecycle,
  onCancel,
}: {
  job: ScanJob;
  lifecycle: ScanLifecycle;
  onCancel: () => void;
}) => {
  const current = activeStageIndex(job);
  const canCancel = ["warming", "queued", "running"].includes(lifecycle);

  return (
    <section className="rounded-2xl border border-[#D4E0E3] bg-[#FCFEFE] p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)] lg:gap-10">
        {/* Stepper */}
        <div>
          <div className="flex items-end justify-between gap-4 border-b border-[#D4E0E3] pb-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">
                Scan progress
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#17262D]">
                Evidence in progress
              </h2>
            </div>
            <span className="font-mono text-xs font-semibold text-[#008E9A]">{Math.max(0, Math.min(100, job.progressPct))}%</span>
          </div>
          <ol className="mt-1">
            {STAGES.map((stage, index) => {
              const completed = lifecycle === "completed" || index < current;
              const active = index === current && !isTerminal(job.status);
              const stopped = ["cancelled", "failed"].includes(lifecycle) && index === current;
              return (
                <li key={stage.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-b border-[#D4E0E3] py-2.5">
                  <div className="relative flex justify-center pt-0.5">
                    {index < STAGES.length - 1 && <span className={`absolute top-5 h-[calc(100%+6px)] w-px ${completed ? "bg-[#008E9A]" : "bg-[#D4E0E3]"}`} />}
                    <span className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border ${completed ? "border-[#16754B] bg-[#16754B] text-white" : active ? "border-[#008E9A] bg-[#F0FAFC] text-[#008E9A]" : stopped ? "border-[#B12926] bg-[#FFF4F3] text-[#B12926]" : "border-[#D4E0E3] bg-[#FCFEFE] text-[#839198]"}`}>
                      {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : stopped ? <X className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${active ? "text-[#17262D]" : "text-[#53656D]"}`}>{stage.label}</p>
                    <p className="mt-0.5 text-xs text-[#53656D]">{active ? job.phaseMessage || stage.detail : stage.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Current state sidebar */}
        <aside className="self-start border-l-2 border-[#008E9A] pl-4 sm:pl-5" aria-live="polite">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Current state</p>
          <p className="mt-2 text-base font-semibold leading-snug text-[#17262D]">{job.phaseMessage || "Preparing scan evidence."}</p>
          {canCancel && (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-[#B9D5DC] bg-[#F0FAFC] p-2.5 text-xs text-[#286778]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#008E9A]" />
              <span>Runs in the background. You can safely leave this page or close your browser — results are saved automatically.</span>
            </div>
          )}
          <div className="mt-4 space-y-1 border-t border-[#D4E0E3] pt-3 font-mono text-[11px] text-[#53656D]">
            {job.createdAt && <p><span className="font-semibold text-[#17262D]">Queued:</span> {formatTimestamp(job.createdAt)}</p>}
            {job.startedAt && <p><span className="font-semibold text-[#17262D]">Started:</span> {formatTimestamp(job.startedAt)}</p>}
            {job.completedAt && <p><span className="font-semibold text-[#16754B]">Completed:</span> {formatTimestamp(job.completedAt)}</p>}
          </div>
          <div className="mt-4 border-t border-[#D4E0E3] pt-3">
            <p className="text-xs leading-relaxed text-[#53656D]">Coverage includes GitHub alerts, source secrets, Semgrep rules, Trivy dependency and IaC checks, and a software inventory. A clean result is not proof of security.</p>
            {canCancel && <button type="button" onClick={onCancel} className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#D4E0E3] px-3 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#B12926] hover:text-[#B12926] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2"><X className="h-3.5 w-3.5" />Cancel scan</button>}
          </div>
        </aside>
      </div>
    </section>
  );
};

/* ─── Collapsed scan ribbon (after completion) ─── */

const CompletedScanRibbon = ({
  job,
  lifecycle,
  expanded,
  onToggle,
}: {
  job: ScanJob;
  lifecycle: ScanLifecycle;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const scanDuration = formatDuration(job.scanMetrics?.durationMs);
  const queueWait = formatDuration(job.scanMetrics?.queueWaitMs);

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl border border-[#D4E0E3] bg-[#FCFEFE] px-4 py-2.5 text-left transition hover:border-[#008E9A]/40"
    >
      {lifecycle === "completed" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16754B]" />
      ) : lifecycle === "failed" ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-[#B12926]" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-[#53656D]" />
      )}
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#53656D]">
        <span className="font-semibold text-[#17262D]">{job.repoFullName}</span>
        <span className="mx-1.5 text-[#D4E0E3]">·</span>
        {lifecycle === "completed" ? "Completed" : lifecycle === "failed" ? "Failed" : "Cancelled"}
        {job.completedAt && <> {formatRelativeTime(job.completedAt)}</>}
        {queueWait && <><span className="mx-1.5 text-[#D4E0E3]">·</span>Queue {queueWait}</>}
        {scanDuration && <><span className="mx-1.5 text-[#D4E0E3]">·</span>Scan {scanDuration}</>}
        {job.scanMetrics?.attemptCount && <><span className="mx-1.5 text-[#D4E0E3]">·</span>{String(job.scanMetrics.attemptCount)} attempt{Number(job.scanMetrics.attemptCount) !== 1 ? "s" : ""}</>}
      </span>
      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#53656D] transition ${expanded ? "rotate-180" : ""}`} />
    </button>
  );
};

/* ─── Detail Drawer: shown when a finding is selected ─── */

const FindingDetailDrawer = ({
  finding,
  candidates,
  copiedFinding,
  onCopy,
  onClose,
}: {
  finding: Vulnerability;
  candidates: AttackPathCandidate[];
  copiedFinding: string | null;
  onCopy: (finding: Vulnerability) => void;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<"evidence" | "routes" | "fix">("evidence");

  // Mapped routes for this specific finding
  const mappedRoutes = useMemo(() => {
    return candidates.filter((c) => {
      // Match by findingId or by title+file
      if (c.findingId === finding.id) return true;
      if (c.findingTitle === finding.title && (c.findingFile === finding.file || !finding.file)) return true;
      return false;
    });
  }, [candidates, finding]);

  const uniqueRoutes = useMemo(() => {
    return [...new Map(mappedRoutes.map((r) => [`${r.routeFile}:${r.route}`, r])).values()].sort((a, b) => a.route.localeCompare(b.route));
  }, [mappedRoutes]);

  const tabs = [
    { id: "evidence" as const, label: "Evidence" },
    { id: "routes" as const, label: `Routes (${uniqueRoutes.length})` },
    { id: "fix" as const, label: "Fix" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Drawer header */}
      <div className="shrink-0 border-b border-[#D4E0E3] bg-[#FCFEFE] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${severityClass(finding.severity)}`}>
              {finding.severity}
            </span>
            <h3 className="mt-1.5 text-sm font-bold text-[#17262D]">{finding.title}</h3>
            <p className="mt-1 font-mono text-[10px] text-[#53656D]">{sourceLabel(finding.source)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#53656D] outline-none transition hover:text-[#17262D] focus-visible:ring-2 focus-visible:ring-[#008E9A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Drawer tabs */}
        <div className="mt-3 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-[#008E9A]/10 text-[#008E9A]"
                  : "text-[#53656D] hover:bg-[#EDF4F5] hover:text-[#17262D]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drawer body (scrolls internally) */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "evidence" && (
          <div className="space-y-4">
            {finding.file && (
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#53656D]">Location</p>
                <p className="mt-1 break-all font-mono text-xs text-[#17262D]">{finding.file}</p>
              </div>
            )}
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#53656D]">Evidence detail</p>
              <p className="mt-1 text-sm leading-relaxed text-[#53656D]">{finding.detail}</p>
            </div>
            {mappedRoutes.length > 0 && mappedRoutes[0].authBoundary && (
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#53656D]">Auth boundary</p>
                <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${
                  mappedRoutes[0].authBoundary === "present"
                    ? "border-[#B9DCC7] bg-[#F2FAF5] text-[#16754B]"
                    : "border-[#E8CE9C] bg-[#FFF9EA] text-[#A05B00]"
                }`}>
                  {mappedRoutes[0].authBoundary === "present" ? "Auth referenced" : "Auth not detected"}
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === "routes" && (
          <div>
            {uniqueRoutes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#D4E0E3] px-4 py-8 text-center">
                <Route className="mx-auto h-6 w-6 text-[#839198]" />
                <p className="mt-2 text-sm font-semibold text-[#17262D]">No mapped routes</p>
                <p className="mt-1 text-xs text-[#53656D]">No source-local route-to-sink candidates detected for this finding.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#53656D]">
                  {uniqueRoutes.length} entry route{uniqueRoutes.length !== 1 ? "s" : ""} mapped to this finding
                </p>
                <ul className="space-y-1.5">
                  {uniqueRoutes.map((route) => (
                    <li key={`${route.routeFile}:${route.route}`} className="rounded-lg border border-[#D4E0E3] bg-[#F4F8F9] px-3 py-2.5">
                      <p className="break-all font-mono text-xs font-semibold text-[#17262D]">{route.route}</p>
                      <p className="mt-0.5 break-all font-mono text-[10px] text-[#53656D]">{route.routeFile}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-[#53656D]">Each route connects a detected endpoint to this source-security finding. This is triage evidence, not a claim that an attacker can reach or exploit the sink.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "fix" && (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#53656D]">Suggested remediation</p>
              <div className="mt-2 border-l-2 border-[#008E9A] pl-3">
                <p className="text-sm leading-relaxed text-[#17262D]">{remediationFor(finding)}</p>
              </div>
            </div>
            {finding.file && (
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#53656D]">Affected file</p>
                <p className="mt-1 break-all font-mono text-xs text-[#17262D]">{finding.file}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer footer actions */}
      <div className="shrink-0 border-t border-[#D4E0E3] bg-[#FCFEFE] px-4 py-3">
        <button
          type="button"
          onClick={() => onCopy(finding)}
          className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#008E9A] hover:text-[#17262D] focus-visible:ring-2 focus-visible:ring-[#008E9A]"
        >
          {copiedFinding === finding.id ? <ClipboardCopy className="h-3.5 w-3.5 text-[#16754B]" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedFinding === finding.id ? "Copied finding" : "Copy finding"}
        </button>
      </div>
    </div>
  );
};

/* ─── Footer status bar for scanner coverage ─── */

const CoverageFooter = ({ tools, scanMetrics, lifecycle }: { tools: ToolStatus[]; scanMetrics?: Record<string, unknown>; lifecycle: ScanLifecycle }) => {
  const [expanded, setExpanded] = useState(false);
  if (tools.length === 0 && !scanMetrics) return null;

  const hasPartial = tools.some((t) => t.status !== "ran");
  const scanDuration = formatDuration(scanMetrics?.durationMs);
  const attempts = scanMetrics?.attemptCount ? String(scanMetrics.attemptCount) : null;

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 border-t border-[#D4E0E3] bg-[#FCFEFE] px-4 py-2 text-left transition hover:bg-[#F4F8F9]"
      >
        <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-[#53656D]">
          {tools.map((tool) => (
            <span key={tool.tool} className="inline-flex items-center gap-1">
              {tool.status === "ran" ? (
                <CheckCircle2 className="h-2.5 w-2.5 text-[#16754B]" />
              ) : tool.status === "failed" ? (
                <X className="h-2.5 w-2.5 text-[#B12926]" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full border border-[#E8CE9C] bg-[#FFF9EA]" />
              )}
              <span className="font-semibold">{tool.tool}</span>
              <span>{tool.findingsCount}</span>
            </span>
          ))}
          {scanDuration && <><span className="text-[#D4E0E3]">│</span><span>{scanDuration}</span></>}
          {attempts && <><span className="text-[#D4E0E3]">│</span><span>{attempts} attempt{attempts !== "1" ? "s" : ""}</span></>}
          {hasPartial && <span className="font-semibold text-[#A05B00]">Partial coverage</span>}
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-[#53656D] transition ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="border-t border-[#D4E0E3] bg-[#FCFEFE] px-4 py-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Scanner evidence</p>
          <ul className="mt-2 divide-y divide-[#D4E0E3]">
            {tools.map((tool) => {
              const status = tool.status === "ran" ? "text-[#16754B]" : tool.status === "failed" ? "text-[#B12926]" : "text-[#A05B00]";
              return (
                <li key={tool.tool} className="grid gap-1 py-2 sm:grid-cols-[140px_80px_1fr_auto] sm:items-center sm:gap-3">
                  <span className="font-mono text-xs font-semibold text-[#17262D]">{tool.tool}</span>
                  <span className={`font-mono text-[10px] font-semibold uppercase ${status}`}>{tool.status}</span>
                  <span className="text-xs text-[#53656D]">{tool.error || "Completed with recorded evidence."}</span>
                  <span className="font-mono text-xs text-[#53656D]">{tool.findingsCount} findings</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

const AttackPath = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ─── Core state ─── */
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [job, setJob] = useState<ScanJob | null>(null);
  const [lifecycle, setLifecycle] = useState<ScanLifecycle>("idle");
  const [findings, setFindings] = useState<Vulnerability[]>([]);
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [attackPathCandidates, setAttackPathCandidates] = useState<AttackPathCandidate[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | Vulnerability["severity"]>("all");
  const [domainTab, setDomainTab] = useState("all");
  const [copiedFinding, setCopiedFinding] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [quota, setQuota] = useState<ScanAllowance | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [ribbonExpanded, setRibbonExpanded] = useState(false);
  const [groupByRule, setGroupByRule] = useState(true);
  const streamRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deviceId = useMemo(() => {
    const existing = localStorage.getItem("servx_device_uuid");
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem("servx_device_uuid", next);
    return next;
  }, []);

  /* ─── Derived state ─── */
  const activeScan = ["warming", "queued", "running"].includes(lifecycle);
  const allowanceExhausted = quota?.remaining === 0;
  const isEvidenceMode = lifecycle === "completed" && findings.length > 0;

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of findings) {
      const d = sourceDomain(f.source);
      counts[d] = (counts[d] || 0) + 1;
    }
    return counts;
  }, [findings]);

  const domainTabs = useMemo(() => {
    const tabs: { id: string; label: string; count: number }[] = [
      { id: "all", label: "All", count: findings.length },
    ];
    for (const [key, count] of Object.entries(domainCounts)) {
      tabs.push({ id: key, label: DOMAIN_LABELS[key] || key, count });
    }
    return tabs;
  }, [domainCounts, findings.length]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (domainTab !== "all" && sourceDomain(f.source) !== domainTab) return false;
      return true;
    });
  }, [findings, severityFilter, domainTab]);

  const findingGroups = useMemo(() => groupFindingsByRule(filteredFindings), [filteredFindings]);

  const severityTotals = useMemo(() => ({
    critical: findings.filter((f) => f.severity === "critical").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
  }), [findings]);

  const selectedFinding = findings.find((f) => f.id === selectedFindingId) || null;

  /* ─── API callbacks ─── */

  const loadQuota = useCallback(async () => {
    setQuotaLoading(true);
    try {
      const response = await apiClient.get("/attack-paths/quota");
      setQuota(normalizeScanAllowance(response.data));
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  const applyJobPayload = useCallback((payload: any) => {
    const nextJob: ScanJob = {
      jobId: String(payload.jobId || ""),
      repoFullName: String(payload.repoFullName || ""),
      status: String(payload.status || "queued"),
      progressPct: Number(payload.progressPct || 0),
      phaseMessage: String(payload.phaseMessage || ""),
      queuePosition: Number(payload.queuePosition || 0),
      queueReason: String(payload.queueReason || ""),
      lastError: String(payload.lastError || ""),
      quotaRemaining: typeof payload.quotaRemaining === "number" ? payload.quotaRemaining : undefined,
      toolStatuses: normalizeToolStatuses(payload.toolStatuses),
      scanMetrics: payload.scanMetrics && typeof payload.scanMetrics === "object" ? payload.scanMetrics : undefined,
      createdAt: payload.createdAt ? String(payload.createdAt) : null,
      startedAt: payload.startedAt ? String(payload.startedAt) : null,
      completedAt: payload.completedAt ? String(payload.completedAt) : null,
      updatedAt: payload.updatedAt ? String(payload.updatedAt) : null,
    };
    const nextQuota = normalizeScanAllowance(payload.quota);
    if (nextQuota) {
      setQuota(nextQuota);
      setQuotaLoading(false);
    } else if (typeof payload.quotaRemaining === "number") {
      setQuota((current) => current ? { ...current, remaining: Math.max(0, payload.quotaRemaining), used: Math.max(0, current.limit - Math.max(0, payload.quotaRemaining)) } : current);
    }
    setJob(nextJob);
    setLifecycle(lifecycleForStatus(nextJob.status));
    if (Array.isArray(payload.findings) || Array.isArray(payload.results)) setFindings(normalizeFindings(payload.findings || payload.results));
    if (Array.isArray(payload.toolStatuses)) setTools(normalizeToolStatuses(payload.toolStatuses));
    if (Object.prototype.hasOwnProperty.call(payload, "graphArtifact")) {
      const graph = payload.graphArtifact as Record<string, unknown> | null;
      setAttackPathCandidates(normalizeAttackPathCandidates(graph?.candidates));
    }
    return nextJob;
  }, []);

  const loadJob = useCallback(async (jobId: string) => {
    const response = await apiClient.get(`/attack-paths/jobs/${jobId}`);
    return applyJobPayload(response.data);
  }, [applyJobPayload]);

  const startStream = useCallback(async (jobId: string) => {
    streamRef.current?.abort();
    const controller = new AbortController();
    streamRef.current = controller;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Sign in again to follow this scan.");
      const response = await fetch(streamUrl(jobId), { headers: { Accept: "text/event-stream", Authorization: `Bearer ${session.access_token}` }, signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`Unable to follow scan progress (${response.status}).`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const rawEvent of events) {
          const lines = rawEvent.split("\n");
          const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "progress";
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(5).trim());
          setJob((current) => current ? {
            ...current,
            status: String(payload.status || current.status),
            progressPct: Number(payload.progressPct ?? current.progressPct),
            phaseMessage: String(payload.statusMessage || current.phaseMessage),
            queuePosition: Number(payload.queuePosition || 0),
            queueReason: String(payload.queueReason || ""),
            lastError: String(payload.lastError || ""),
            createdAt: payload.createdAt ? String(payload.createdAt) : current.createdAt,
            startedAt: payload.startedAt ? String(payload.startedAt) : current.startedAt,
            completedAt: payload.completedAt ? String(payload.completedAt) : current.completedAt,
            updatedAt: payload.updatedAt ? String(payload.updatedAt) : current.updatedAt,
          } : current);
          const nextStatus = String(payload.status || "");
          if (nextStatus) setLifecycle(lifecycleForStatus(nextStatus));
          if (event === "completed" || event === "failed" || event === "cancelled" || isTerminal(nextStatus)) {
            await loadJob(jobId);
            sessionStorage.setItem(LAST_JOB_STORAGE_KEY, jobId);
            sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
            return;
          }
        }
      }
      if (!controller.signal.aborted) {
        const latest = await loadJob(jobId);
        if (!isTerminal(latest.status)) reconnectTimerRef.current = setTimeout(() => void startStream(jobId), 2_500);
      }
    } catch (error: any) {
      if (controller.signal.aborted) return;
      setActionError(error?.message || "Connection to scan progress was interrupted.");
      reconnectTimerRef.current = setTimeout(() => void startStream(jobId), 3_000);
    }
  }, [loadJob]);

  /* ─── Effects ─── */

  useEffect(() => {
    if (!user) return;
    const loadRepos = async () => {
      setRepoLoading(true); setRepoError("");
      try { const response = await apiClient.get("/github/repos"); setRepos(Array.isArray(response.data) ? response.data : []); }
      catch { setRepoError("Repository loading failed. Refresh or reconnect GitHub, then try again."); }
      finally { setRepoLoading(false); }
    };
    void loadRepos();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadQuota().catch(() => setQuota(null));
  }, [loadQuota, user]);

  useEffect(() => {
    if (!user) return;
    const activeJobId = sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    const lastJobId = sessionStorage.getItem(LAST_JOB_STORAGE_KEY);
    const restore = async () => {
      try {
        const restored = activeJobId || lastJobId
          ? await loadJob(activeJobId || lastJobId || "")
          : applyJobPayload((await apiClient.get("/attack-paths/jobs/latest")).data);
        sessionStorage.setItem(LAST_JOB_STORAGE_KEY, restored.jobId);
        if (isTerminal(restored.status)) {
          sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
          return;
        }
        sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, restored.jobId);
        void startStream(restored.jobId);
      } catch (error: any) {
        if (activeJobId) sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
        if (error?.response?.status !== 404) setActionError("Unable to restore the most recent scan result.");
      }
    };
    void restore();
  }, [loadJob, startStream, user]);

  useEffect(() => {
    if (!job?.repoFullName || repos.length === 0 || selectedRepo) return;
    const matching = repos.find((repo) => repo.full_name === job.repoFullName);
    if (matching) setSelectedRepo(matching);
  }, [job?.repoFullName, repos, selectedRepo]);

  useEffect(() => () => { streamRef.current?.abort(); if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current); }, []);

  const loadJobForRepo = useCallback(async (repoFullName: string) => {
    setActionError("");
    setSelectedFindingId(null);
    streamRef.current?.abort();
    try {
      const response = await apiClient.get(`/attack-paths/jobs/latest?repoFullName=${encodeURIComponent(repoFullName)}`);
      const restored = applyJobPayload(response.data);
      sessionStorage.setItem(LAST_JOB_STORAGE_KEY, restored.jobId);
      if (isTerminal(restored.status)) {
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      } else {
        sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, restored.jobId);
        void startStream(restored.jobId);
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setJob(null);
        setFindings([]);
        setTools([]);
        setAttackPathCandidates([]);
        setLifecycle("idle");
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      } else {
        setActionError("Unable to load scan results for this repository.");
      }
    }
  }, [applyJobPayload, startStream]);

  /* ─── Actions ─── */

  const queueScan = useCallback(async () => {
    if (!selectedRepo || ["warming", "queued", "running"].includes(lifecycle)) return;
    setActionError("");
    setFindings([]); setTools([]); setAttackPathCandidates([]); setSelectedFindingId(null); setLifecycle("warming");
    try {
      const response = await apiClient.post("/attack-paths/jobs", {
        repoId: String(selectedRepo.id), repoFullName: selectedRepo.full_name, scanTypes: ["supply_chain"], analysisDepth: 2, deviceId, idempotencyKey: crypto.randomUUID(),
      });
      const payload = { ...response.data, repoFullName: selectedRepo.full_name, phaseMessage: response.data.message || "Starting scan executor...", queueReason: response.data.queuePosition > 1 ? "Waiting for earlier repository scans." : "" };
      const next = applyJobPayload(payload);
      sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, next.jobId);
      sessionStorage.setItem(LAST_JOB_STORAGE_KEY, next.jobId);
      void startStream(next.jobId);
    } catch (error: any) {
      setLifecycle("idle");
      setActionError(error?.response?.data?.message || error?.message || "Unable to queue this scan.");
      void loadQuota().catch(() => setQuota(null));
    }
  }, [applyJobPayload, deviceId, lifecycle, loadQuota, selectedRepo, startStream]);

  const confirmCancel = useCallback(async () => {
    if (!job) return;
    try {
      await apiClient.post(`/attack-paths/jobs/${job.jobId}/cancel`);
      streamRef.current?.abort();
      sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      sessionStorage.setItem(LAST_JOB_STORAGE_KEY, job.jobId);
      setCancelOpen(false);
      await loadJob(job.jobId);
    } catch (error: any) {
      setCancelOpen(false);
      setActionError(error?.response?.data?.message || "Unable to cancel this scan.");
    }
  }, [job, loadJob]);

  const copyFinding = async (finding: Vulnerability) => {
    const text = [
      `### [${finding.severity.toUpperCase()}] ${finding.title}`,
      `- **Repository**: ${job?.repoFullName || selectedRepo?.full_name || "Repository"}`,
      `- **Source**: ${sourceLabel(finding.source)}`,
      finding.file ? `- **Location**: \`${finding.file}\`` : null,
      `- **Evidence**: ${finding.detail}`,
      `- **Suggested Fix**: ${remediationFor(finding)}`,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedFinding(finding.id);
    setTimeout(() => setCopiedFinding(null), 1_500);
  };

  const copyReport = async () => {
    const repoName = selectedRepo?.full_name || job?.repoFullName || "Repository";
    const timestamp = formatTimestamp(job?.completedAt || job?.updatedAt) || "Latest scan";
    const reportLines = [
      `# ServX Security Audit Report`,
      `**Repository**: ${repoName}`,
      `**Scan Date**: ${timestamp}`,
      `**Total Findings**: ${findings.length} (Critical: ${severityTotals.critical}, Medium: ${severityTotals.medium}, Low: ${severityTotals.low})`,
      ``,
      `---`,
      ``,
      ...findings.map((finding, index) => {
        return [
          `## ${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`,
          `- **Source**: ${sourceLabel(finding.source)}`,
          `- **Location**: \`${finding.file || "Repository-wide"}\``,
          `- **Evidence**: ${finding.detail}`,
          `- **Suggested Remediation**: ${remediationFor(finding)}`,
          ``,
        ].join("\n");
      }),
    ];
    await navigator.clipboard.writeText(reportLines.join("\n"));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 1_500);
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F4F8F9] text-[#17262D]">

      {/* ─── Top Bar: Header + repo + quota + scan button ─── */}
      <div className="shrink-0 border-b border-[#D4E0E3] bg-[#F4F8F9] px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">

          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-[-0.03em] text-[#17262D] sm:text-2xl">Attack Paths</h1>
              <LifecycleBadge lifecycle={lifecycle} />
            </div>
            <div className="flex items-center gap-3">
              {/* Quota compact */}
              <div className="hidden items-center gap-2 sm:flex">
                <span className="font-mono text-xs text-[#53656D]">
                  {quotaLoading ? "…" : quota ? `${quota.remaining}/${quota.limit} scans` : "—"}
                </span>
                {quota?.resetAt && (
                  <span className="font-mono text-[10px] text-[#008E9A]">Resets {formatTimeUntil(quota.resetAt)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Command row: repo select + scan button */}
          <div className="mt-3 flex items-center gap-3">
            <div className="w-full max-w-sm">
              <RepoSelect
                repos={repos}
                selectedRepo={selectedRepo}
                disabled={activeScan}
                onSelect={(repo) => {
                  setSelectedRepo(repo);
                  void loadJobForRepo(repo.full_name);
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => void queueScan()}
              disabled={!selectedRepo || activeScan || allowanceExhausted}
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg bg-[#008E9A] px-4 text-sm font-semibold text-white outline-none transition hover:bg-[#007A84] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#839198]"
            >
              <Scan className="h-3.5 w-3.5" />
              {activeScan ? "Scanning" : allowanceExhausted ? "Limit reached" : "Queue scan"}
            </button>
          </div>

          {/* Error & mismatch banners */}
          {repoLoading && <p className="mt-2 text-xs text-[#53656D]">Loading connected repositories.</p>}
          {repoError && <p className="mt-2 text-xs text-[#B12926]">{repoError}</p>}
          {actionError && (
            <div role="alert" className="mt-3 flex items-start gap-3 rounded-lg border border-[#E5B6B4] bg-[#FFF4F3] px-3 py-2 text-xs text-[#B12926]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{actionError}</span>
              <button type="button" onClick={() => setActionError("")} className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {selectedRepo && job?.repoFullName && selectedRepo.full_name !== job.repoFullName && (
            <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#E8CE9C] bg-[#FFF9EA] px-3 py-2 text-xs text-[#A05B00]">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Showing evidence for <strong className="font-mono">{job.repoFullName}</strong>.
              </span>
              <button type="button" onClick={() => void queueScan()} disabled={activeScan || allowanceExhausted} className="font-semibold underline outline-none hover:text-[#17262D]">
                Scan {selectedRepo.name}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Body: either Scan Command Mode or Evidence Workspace ─── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 sm:px-6">

          {/* Active scan: show full stepper */}
          {activeScan && job && (
            <div className="shrink-0 py-4">
              <ScanCommandMode job={job} lifecycle={lifecycle} onCancel={() => setCancelOpen(true)} />
            </div>
          )}

          {/* Completed/failed/cancelled scan ribbon */}
          {!activeScan && job && lifecycle !== "idle" && (
            <div className="shrink-0 pt-4 pb-2">
              <CompletedScanRibbon
                job={job}
                lifecycle={lifecycle}
                expanded={ribbonExpanded}
                onToggle={() => setRibbonExpanded(!ribbonExpanded)}
              />
              {ribbonExpanded && (
                <div className="mt-2 rounded-xl border border-[#D4E0E3] bg-[#FCFEFE] p-4">
                  <ScanCommandMode job={job} lifecycle={lifecycle} onCancel={() => {}} />
                </div>
              )}
            </div>
          )}

          {/* Evidence workspace: master-detail layout */}
          {isEvidenceMode ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-0">

              {/* Summary bar */}
              <div className="shrink-0 pb-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Severity counters */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#53656D]">Critical</span>
                      <span className="text-lg font-bold text-[#B12926]">{severityTotals.critical}</span>
                    </div>
                    <span className="h-4 w-px bg-[#D4E0E3]" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#53656D]">Medium</span>
                      <span className="text-lg font-bold text-[#A05B00]">{severityTotals.medium}</span>
                    </div>
                    <span className="h-4 w-px bg-[#D4E0E3]" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#53656D]">Low</span>
                      <span className="text-lg font-bold text-[#286778]">{severityTotals.low}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyReport()} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-2.5 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#008E9A] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2">
                      {copiedReport ? <ClipboardCopy className="h-3 w-3 text-[#16754B]" /> : <Copy className="h-3 w-3" />}
                      {copiedReport ? "Copied" : "Copy report"}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/automedic?${new URLSearchParams({ source: "attack-path", repo: selectedRepo?.full_name || job?.repoFullName || "", vulns: JSON.stringify(findings.map((f) => ({ severity: f.severity, title: f.title, file: f.file }))) }).toString()}`)}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-2.5 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#008E9A] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2"
                    >
                      <Zap className="h-3 w-3" />Auto-Medic<ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Domain tabs */}
              <div className="shrink-0 border-b border-[#D4E0E3]">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {domainTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setDomainTab(tab.id); setSelectedFindingId(null); }}
                      className={`shrink-0 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                        domainTab === tab.id
                          ? "border-[#008E9A] text-[#008E9A]"
                          : "border-transparent text-[#53656D] hover:text-[#17262D]"
                      }`}
                    >
                      {tab.label} <span className="ml-1 font-mono text-[10px]">({tab.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter row */}
              <div className="shrink-0 flex items-center gap-3 border-b border-[#D4E0E3] py-2">
                <select
                  value={severityFilter}
                  onChange={(e) => { setSeverityFilter(e.target.value as typeof severityFilter); setSelectedFindingId(null); }}
                  className="rounded-md border border-[#D4E0E3] bg-[#FCFEFE] px-2 py-1.5 text-xs text-[#17262D] outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]"
                >
                  <option value="all">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button
                  type="button"
                  onClick={() => setGroupByRule(!groupByRule)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                    groupByRule
                      ? "border-[#008E9A]/30 bg-[#008E9A]/10 text-[#008E9A]"
                      : "border-[#D4E0E3] text-[#53656D] hover:border-[#008E9A]/30"
                  }`}
                >
                  Group by rule
                </button>
                <span className="ml-auto font-mono text-[10px] text-[#53656D]">
                  {filteredFindings.length} finding{filteredFindings.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Master-detail split */}
              <div className="flex min-h-0 flex-1 overflow-hidden">

                {/* Master list */}
                <div className={`min-h-0 overflow-y-auto border-r border-[#D4E0E3] ${selectedFinding ? "w-[45%] shrink-0" : "w-full"}`}>
                  {filteredFindings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <FileWarning className="h-7 w-7 text-[#839198]" />
                      <p className="mt-2 text-sm font-semibold text-[#17262D]">No findings match filters</p>
                      <button
                        type="button"
                        onClick={() => { setSeverityFilter("all"); setDomainTab("all"); }}
                        className="mt-3 inline-flex min-h-8 items-center rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-xs font-semibold text-[#008E9A] outline-none hover:border-[#008E9A]"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : groupByRule ? (
                    /* Grouped view */
                    findingGroups.map((group) => (
                      <div key={`${group.ruleTitle}::${group.severity}::${group.source}`} className="border-b border-[#D4E0E3]">
                        {group.instances.length === 1 ? (
                          /* Single instance — render directly */
                          <button
                            type="button"
                            onClick={() => setSelectedFindingId((c) => c === group.instances[0].id ? null : group.instances[0].id)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition hover:bg-[#EDF4F5] ${
                              selectedFindingId === group.instances[0].id ? "bg-[#EDF4F5] border-l-2 border-l-[#008E9A]" : ""
                            }`}
                          >
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${severityClass(group.severity)}`}>
                              {group.severity}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-[#17262D]">{group.ruleTitle}</span>
                              <span className="mt-0.5 block truncate font-mono text-[10px] text-[#53656D]">
                                {sourceLabel(group.source)}{group.instances[0].file ? ` · ${group.instances[0].file}` : ""}
                              </span>
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#53656D]" />
                          </button>
                        ) : (
                          /* Multiple instances — collapsible group */
                          <GroupedFindingRow
                            group={group}
                            selectedFindingId={selectedFindingId}
                            onSelectInstance={(id) => setSelectedFindingId((c) => c === id ? null : id)}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    /* Flat list */
                    filteredFindings.map((finding) => (
                      <button
                        key={finding.id}
                        type="button"
                        onClick={() => setSelectedFindingId((c) => c === finding.id ? null : finding.id)}
                        className={`flex w-full items-center gap-3 border-b border-[#D4E0E3] px-4 py-3 text-left outline-none transition hover:bg-[#EDF4F5] ${
                          selectedFindingId === finding.id ? "bg-[#EDF4F5] border-l-2 border-l-[#008E9A]" : ""
                        }`}
                      >
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${severityClass(finding.severity)}`}>
                          {finding.severity}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#17262D]">{finding.title}</span>
                          <span className="mt-0.5 block truncate font-mono text-[10px] text-[#53656D]">
                            {sourceLabel(finding.source)}{finding.file ? ` · ${finding.file}` : ""}
                          </span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#53656D]" />
                      </button>
                    ))
                  )}
                </div>

                {/* Detail drawer */}
                {selectedFinding && (
                  <div className="min-h-0 flex-1 overflow-hidden border-l border-[#D4E0E3] bg-[#FCFEFE]">
                    <FindingDetailDrawer
                      finding={selectedFinding}
                      candidates={attackPathCandidates}
                      copiedFinding={copiedFinding}
                      onCopy={copyFinding}
                      onClose={() => setSelectedFindingId(null)}
                    />
                  </div>
                )}
              </div>

              {/* Footer status bar */}
              <CoverageFooter tools={tools} scanMetrics={job?.scanMetrics} lifecycle={lifecycle} />
            </div>
          ) : (
            /* No evidence yet: empty state */
            !activeScan && (
              <div className="flex flex-1 flex-col items-center justify-center py-16">
                <Shield className="h-10 w-10 text-[#839198]" />
                <p className="mt-4 text-base font-semibold text-[#17262D]">
                  {lifecycle === "completed" ? "No findings returned" : lifecycle === "failed" ? "Scan failed" : lifecycle === "cancelled" ? "Scan cancelled" : "No scan evidence yet"}
                </p>
                <p className="mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-[#53656D]">
                  {lifecycle === "completed"
                    ? "The completed scan returned no findings. This does not prove the repository is secure."
                    : lifecycle === "failed"
                    ? `The scan encountered an error. ${job?.lastError || "Check the scan record for details."}`
                    : lifecycle === "cancelled"
                    ? "The scan was cancelled before completion."
                    : "Select an owned repository and queue one deep scan to begin collecting evidence."}
                </p>
                {lifecycle !== "idle" && tools.length > 0 && (
                  <div className="mt-6 w-full max-w-lg">
                    <CoverageFooter tools={tools} scanMetrics={job?.scanMetrics} lifecycle={lifecycle} />
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* ─── Cancel dialog ─── */}
      {cancelOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="cancel-scan-title" className="fixed inset-0 z-50 grid place-items-center bg-[#17262D]/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#D4E0E3] bg-[#FCFEFE] p-5 shadow-[0_12px_32px_rgb(23_38_45_/_0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Cancel scan</p>
                <h2 id="cancel-scan-title" className="mt-1 text-lg font-bold text-[#17262D]">Stop this repository scan?</h2>
              </div>
              <button type="button" onClick={() => setCancelOpen(false)} aria-label="Close cancellation dialog" className="rounded p-1 text-[#53656D] outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#53656D]">ServX will stop the queued or active scan and remove the worker's temporary files. Existing completed findings are not changed.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setCancelOpen(false)} className="min-h-9 rounded-lg border border-[#D4E0E3] px-4 text-sm font-semibold text-[#53656D] outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]">Keep scanning</button>
              <button type="button" onClick={() => void confirmCancel()} className="min-h-9 rounded-lg bg-[#B12926] px-4 text-sm font-semibold text-white outline-none hover:bg-[#92211F] focus-visible:ring-2 focus-visible:ring-[#B12926] focus-visible:ring-offset-2">Cancel scan</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

/* ─── Grouped finding row component ─── */

const GroupedFindingRow = ({
  group,
  selectedFindingId,
  onSelectInstance,
}: {
  group: FindingGroup;
  selectedFindingId: string | null;
  onSelectInstance: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasSelected = group.instances.some((i) => i.id === selectedFindingId);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition hover:bg-[#EDF4F5] ${hasSelected ? "bg-[#EDF4F5]" : ""}`}
      >
        <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${severityClass(group.severity)}`}>
          {group.severity}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#17262D]">{group.ruleTitle}</span>
          <span className="mt-0.5 block font-mono text-[10px] text-[#53656D]">
            {sourceLabel(group.source)} · {group.instances.length} instance{group.instances.length !== 1 ? "s" : ""}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[#EDF4F5] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#53656D]">
          {group.instances.length}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#53656D] transition ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="border-t border-[#D4E0E3] bg-[#F4F8F9]">
          {group.instances.map((instance) => (
            <button
              key={instance.id}
              type="button"
              onClick={() => onSelectInstance(instance.id)}
              className={`flex w-full items-center gap-3 border-b border-[#D4E0E3] px-4 py-2.5 pl-10 text-left outline-none transition hover:bg-[#EDF4F5] last:border-b-0 ${
                selectedFindingId === instance.id ? "bg-[#EDF4F5] border-l-2 border-l-[#008E9A]" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[#17262D]">{instance.file || "Repository-wide"}</span>
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-[#53656D]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttackPath;
