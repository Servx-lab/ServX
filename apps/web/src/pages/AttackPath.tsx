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
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-left outline-none transition hover:border-[#008E9A] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Github className="h-4 w-4 shrink-0 text-[#53656D]" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#17262D]">{selectedRepo?.full_name || "Select a connected repository"}</span>
            <span className="block truncate font-mono text-[10px] text-[#53656D]">{selectedRepo?.language || "GitHub authorization required"}</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#53656D] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id="attack-paths-repositories" role="listbox" className="absolute z-30 mt-2 flex max-h-80 w-full flex-col overflow-hidden rounded-xl border border-[#D4E0E3] bg-[#FCFEFE] shadow-[0_12px_32px_rgb(23_38_45_/_0.12)]">
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
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold ${details.className}`}><Icon className={`h-3.5 w-3.5 ${["warming", "queued", "running"].includes(lifecycle) ? "animate-spin" : ""}`} />{details.label}</span>;
};

const EvidenceRail = ({ job, lifecycle, onCancel }: { job: ScanJob; lifecycle: ScanLifecycle; onCancel: () => void }) => {
  const current = activeStageIndex(job);
  const canCancel = ["warming", "queued", "running"].includes(lifecycle);
  const timestampText = lifecycle === "completed"
    ? formatTimestamp(job.completedAt || job.updatedAt)
    : formatTimestamp(job.startedAt || job.createdAt);
  const relativeText = lifecycle === "completed"
    ? formatRelativeTime(job.completedAt || job.updatedAt)
    : formatRelativeTime(job.startedAt || job.createdAt);

  return (
    <section aria-labelledby="scan-progress-title" className="border-y border-[#D4E0E3] bg-[#FCFEFE] py-6 sm:py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)] lg:gap-12">
        <div>
          <div className="flex items-end justify-between gap-4 border-b border-[#D4E0E3] pb-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">
                Scan ledger {relativeText ? `· ${relativeText}` : ""}
              </p>
              <h2 id="scan-progress-title" className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#17262D]">
                {lifecycle === "completed" ? "Completed scan evidence" : lifecycle === "failed" || lifecycle === "cancelled" ? "Scan evidence ledger" : "Evidence in progress"}
              </h2>
              {timestampText && (
                <p className="mt-0.5 font-mono text-[11px] text-[#53656D]">
                  {lifecycle === "completed" ? `Recorded ${timestampText}` : `Scan started ${timestampText}`}
                </p>
              )}
            </div>
            <span className="font-mono text-xs text-[#53656D]">{Math.max(0, Math.min(100, job.progressPct))}%</span>
          </div>
          <ol className="mt-1">
            {STAGES.map((stage, index) => {
              const completed = lifecycle === "completed" || index < current;
              const active = index === current && !isTerminal(job.status);
              const stopped = ["cancelled", "failed"].includes(lifecycle) && index === current;
              return (
                <li key={stage.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-b border-[#D4E0E3] py-3">
                  <div className="relative flex justify-center pt-0.5">
                    {index < STAGES.length - 1 && <span className={`absolute top-5 h-[calc(100%+8px)] w-px ${completed ? "bg-[#008E9A]" : "bg-[#D4E0E3]"}`} />}
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
            {canCancel && <button type="button" onClick={onCancel} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#D4E0E3] px-3 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#B12926] hover:text-[#B12926] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2"><X className="h-3.5 w-3.5" />Cancel scan</button>}
          </div>
        </aside>
      </div>
    </section>
  );
};

const CoverageList = ({ tools }: { tools: ToolStatus[] }) => {
  if (tools.length === 0) return null;
  return (
    <section aria-labelledby="coverage-title" className="border-y border-[#D4E0E3] py-5">
      <div className="flex items-baseline justify-between gap-4">
        <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Coverage</p><h2 id="coverage-title" className="mt-1 text-base font-bold text-[#17262D]">Scanner evidence</h2></div>
        {tools.some((tool) => tool.status !== "ran") && <span className="text-xs font-semibold text-[#A05B00]">Partial coverage</span>}
      </div>
      <ul className="mt-4 divide-y divide-[#D4E0E3] border-y border-[#D4E0E3]">
        {tools.map((tool) => {
          const status = tool.status === "ran" ? "text-[#16754B]" : tool.status === "failed" ? "text-[#B12926]" : "text-[#A05B00]";
          return <li key={tool.tool} className="grid gap-1 py-3 sm:grid-cols-[150px_100px_1fr_auto] sm:items-center sm:gap-4"><span className="font-mono text-xs font-semibold text-[#17262D]">{tool.tool}</span><span className={`font-mono text-[10px] font-semibold uppercase ${status}`}>{tool.status}</span><span className="text-xs text-[#53656D]">{tool.error || "Completed with recorded evidence."}</span><span className="font-mono text-xs text-[#53656D]">{tool.findingsCount} findings</span></li>;
        })}
      </ul>
    </section>
  );
};

const PotentialAttackPaths = ({ candidates, completed }: { candidates: AttackPathCandidate[]; completed: boolean }) => {
  const [showAll, setShowAll] = useState(false);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const candidateGroups = useMemo(() => {
    const groups = new Map<string, { id: string; findingTitle: string; findingFile: string; severity: Vulnerability["severity"]; note: string; authBoundary: AttackPathCandidate["authBoundary"]; routes: AttackPathCandidate[] }>();
    for (const candidate of candidates) {
      const key = candidate.findingId || `${candidate.findingTitle}:${candidate.findingFile || candidate.routeFile}`;
      const existing = groups.get(key);
      if (existing) {
        existing.routes.push(candidate);
        if (candidate.authBoundary === "not_detected") existing.authBoundary = "not_detected";
        continue;
      }
      groups.set(key, {
        id: key,
        findingTitle: candidate.findingTitle,
        findingFile: candidate.findingFile || candidate.routeFile,
        severity: candidate.severity,
        note: candidate.note,
        authBoundary: candidate.authBoundary,
        routes: [candidate],
      });
    }
    return [...groups.values()].map((group) => ({
      ...group,
      routes: [...new Map(group.routes.map((route) => [`${route.routeFile}:${route.route}`, route])).values()].sort((left, right) => left.route.localeCompare(right.route)),
    }));
  }, [candidates]);
  const initialGroupCount = 6;
  const visibleGroups = showAll ? candidateGroups : candidateGroups.slice(0, initialGroupCount);
  const totalRoutes = candidateGroups.reduce((total, group) => total + group.routes.length, 0);

  if (!completed) return null;
  return (
    <section aria-labelledby="candidate-paths-title" className="border-b border-[#D4E0E3] py-6">
      <div className="flex flex-col gap-3 border-b border-[#D4E0E3] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Path candidates</p>
          <h2 id="candidate-paths-title" className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#17262D]">Potential source paths</h2>
        </div>
        <span className="w-fit rounded-full border border-[#E8CE9C] bg-[#FFF9EA] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#A05B00]">Not exploit-verified</span>
      </div>
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-[#53656D]">Each row connects a detected route to a source-security finding in the same file. It is useful triage evidence, not a claim that an attacker can reach or exploit the sink.</p>
      {candidateGroups.length === 0 ? <div className="mt-4 border-y border-dashed border-[#D4E0E3] py-6 text-sm text-[#53656D]">No source-local route-to-sink candidates were detected in this scan. This does not prove that the repository has no attack paths.</div> : <>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.13em] text-[#53656D]">{candidateGroups.length} source finding{candidateGroups.length === 1 ? "" : "s"} · {totalRoutes} mapped route{totalRoutes === 1 ? "" : "s"}</p>
        <ul className="mt-3 divide-y divide-[#D4E0E3] border-y border-[#D4E0E3]">
          {visibleGroups.map((group) => {
            const isExpanded = expandedFindingId === group.id;
            const routeListId = `attack-path-routes-${group.id}`;
            return <li key={group.id} className="px-1 py-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-5">
                <div className="min-w-0 border-l-2 border-[#008E9A] pl-3">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#53656D]">Source evidence</p>
                  <p className="mt-1 text-sm font-semibold text-[#17262D]">{group.findingTitle}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-[#53656D]">{group.findingFile}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${severityClass(group.severity)}`}>{group.severity}</span>
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${group.authBoundary === "present" ? "border-[#B9DCC7] bg-[#F2FAF5] text-[#16754B]" : "border-[#E8CE9C] bg-[#FFF9EA] text-[#A05B00]"}`}>{group.authBoundary === "present" ? "auth referenced" : "auth not detected"}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-dashed border-[#D4E0E3] pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#53656D]">Mapped entry routes</p>
                  <p className="mt-1 text-xs text-[#53656D]">{group.routes.length} route{group.routes.length === 1 ? "" : "s"} in the same source file.</p>
                </div>
                <button type="button" aria-expanded={isExpanded} aria-controls={routeListId} onClick={() => setExpandedFindingId((current) => current === group.id ? null : group.id)} className="inline-flex min-h-9 shrink-0 items-center gap-2 self-start rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#008E9A] hover:text-[#17262D] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2">{isExpanded ? "Hide routes" : "Show routes"}<ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? "rotate-180" : ""}`} /></button>
              </div>
              {isExpanded && <ul id={routeListId} className="mt-3 grid gap-2 border-l border-[#D4E0E3] pl-3 sm:grid-cols-2">
                {group.routes.map((route) => <li key={`${route.routeFile}:${route.route}`} className="min-w-0"><p className="break-all font-mono text-xs font-semibold text-[#17262D]">{route.route}</p><p className="mt-0.5 break-all font-mono text-[10px] text-[#53656D]">{route.routeFile}</p></li>)}
              </ul>}
              <p className="mt-3 text-xs leading-relaxed text-[#53656D]">{group.note}</p>
            </li>;
          })}
        </ul>
        {candidateGroups.length > initialGroupCount && <button type="button" onClick={() => setShowAll((current) => !current)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#008E9A] hover:text-[#17262D] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2">{showAll ? "Show fewer source findings" : `Show ${candidateGroups.length - initialGroupCount} more source finding${candidateGroups.length - initialGroupCount === 1 ? "" : "s"}`}<ChevronDown className={`h-3.5 w-3.5 transition ${showAll ? "rotate-180" : ""}`} /></button>}
      </>}
    </section>
  );
};

const AttackPath = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [sourceFilter, setSourceFilter] = useState("all");
  const [copiedFinding, setCopiedFinding] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [quota, setQuota] = useState<ScanAllowance | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const streamRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceId = useMemo(() => {
    const existing = localStorage.getItem("servx_device_uuid");
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem("servx_device_uuid", next);
    return next;
  }, []);

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

  const filteredFindings = useMemo(() => findings.filter((finding) => (severityFilter === "all" || finding.severity === severityFilter) && (sourceFilter === "all" || finding.source === sourceFilter)), [findings, severityFilter, sourceFilter]);
  const sourceOptions = useMemo(() => Array.from(new Set(findings.map((finding) => finding.source).filter(Boolean))) as string[], [findings]);
  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId) || null;
  const severityTotals = useMemo(() => ({ critical: findings.filter((finding) => finding.severity === "critical").length, medium: findings.filter((finding) => finding.severity === "medium").length, low: findings.filter((finding) => finding.severity === "low").length }), [findings]);
  const coverageIsPartial = tools.some((tool) => tool.status !== "ran");
  const activeScan = ["warming", "queued", "running"].includes(lifecycle);
  const allowanceExhausted = quota?.remaining === 0;

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

  return (
    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F4F8F9] px-4 py-5 text-[#17262D] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-[#D4E0E3] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Security evidence workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#17262D] sm:text-4xl">Attack Paths</h1><p className="mt-3 text-sm leading-relaxed text-[#53656D]">Queue a deep scan for a connected repository. ServX keeps the job state while the isolated executor collects evidence.</p></div>
          <LifecycleBadge lifecycle={lifecycle} />
        </header>

        <section aria-labelledby="command-title" className="grid gap-4 border-b border-[#D4E0E3] py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
            <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Owned repository</p><h2 id="command-title" className="mt-1 text-base font-bold text-[#17262D]">Choose what ServX may inspect</h2><div className="mt-3"><RepoSelect repos={repos} selectedRepo={selectedRepo} disabled={activeScan} onSelect={setSelectedRepo} /></div>{repoLoading && <p className="mt-2 text-xs text-[#53656D]">Loading connected repositories.</p>}{repoError && <p className="mt-2 text-xs text-[#B12926]">{repoError}</p>}</div>
            <div className="border-l-2 border-[#D4E0E3] pl-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Allowance</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#17262D]">
                {quotaLoading ? "…" : quota?.remaining ?? "—"}
                <span className="ml-1 text-xs font-medium text-[#53656D]">remaining</span>
              </p>
              <p className="mt-1 text-xs text-[#53656D]">
                {quota ? `${quota.used} of ${quota.limit} scans used in last 24h` : "Checking server allowance"}
              </p>
              {quota?.resetAt && (
                <p className="mt-1 font-mono text-[10px] text-[#008E9A]">
                  Resets {formatTimeUntil(quota.resetAt)}
                </p>
              )}
            </div>
          </div>
          <div className="lg:text-right"><button type="button" onClick={() => void queueScan()} disabled={!selectedRepo || activeScan || allowanceExhausted} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#008E9A] px-5 text-sm font-semibold text-white outline-none transition hover:bg-[#007A84] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#839198] sm:w-auto"><Scan className="h-4 w-4" />{activeScan ? "Scan active" : allowanceExhausted ? "Daily limit reached" : "Queue scan"}</button><p className="mt-2 max-w-64 text-left text-[11px] leading-relaxed text-[#53656D] lg:ml-auto">{allowanceExhausted ? `Quota will refresh ${formatTimeUntil(quota?.resetAt)}.` : "Runs asynchronously in background — safe to leave page or close browser."}</p></div>
        </section>

        {actionError && <div role="alert" className="mt-5 flex items-start gap-3 border-l-2 border-[#B12926] bg-[#FFF4F3] px-4 py-3 text-sm text-[#B12926]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{actionError}</span><button type="button" onClick={() => setActionError("")} className="ml-auto rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]"><X className="h-4 w-4" /></button></div>}

        {selectedRepo && job?.repoFullName && selectedRepo.full_name !== job.repoFullName && (
          <div role="status" className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-[#E8CE9C] bg-[#FFF9EA] px-4 py-3 text-xs text-[#A05B00]">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#A05B00]" />
              Showing scan evidence for <strong className="font-mono">{job.repoFullName}</strong>. You have selected <strong className="font-mono">{selectedRepo.full_name}</strong> in the dropdown.
            </span>
            <button type="button" onClick={() => void queueScan()} disabled={activeScan || allowanceExhausted} className="font-semibold underline outline-none hover:text-[#17262D]">
              Queue scan for {selectedRepo.name}
            </button>
          </div>
        )}

        {job && lifecycle !== "idle" && <EvidenceRail job={job} lifecycle={lifecycle} onCancel={() => setCancelOpen(true)} />}

        <section aria-labelledby="results-title" className="py-7 sm:py-9">
          <div className="flex flex-col gap-4 border-b border-[#D4E0E3] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">
                Results desk {job?.completedAt || job?.updatedAt ? `· ${formatRelativeTime(job.completedAt || job.updatedAt)}` : ""}
              </p>
              <h2 id="results-title" className="mt-1 text-2xl font-bold tracking-[-0.025em] text-[#17262D]">{lifecycle === "completed" ? "Review the evidence" : "Findings"}</h2>
              <p className="mt-2 text-sm text-[#53656D]">
                {findings.length ? `${findings.length} findings across completed repository evidence for ${job?.repoFullName || selectedRepo?.full_name || "repository"}.` : lifecycle === "completed" ? "No findings were returned by the completed scan. This does not prove the repository is secure." : "Results appear here after a repository scan completes."}
              </p>
              {(job?.completedAt || job?.updatedAt) && (
                <p className="mt-1 font-mono text-[11px] text-[#53656D]">
                  Evidence timestamp: {formatTimestamp(job.completedAt || job.updatedAt)}
                </p>
              )}
            </div>
            {findings.length > 0 && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyReport()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#008E9A] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2">{copiedReport ? <ClipboardCopy className="h-3.5 w-3.5 text-[#16754B]" /> : <Copy className="h-3.5 w-3.5" />}{copiedReport ? "Copied" : "Copy report"}</button><button type="button" onClick={() => navigate(`/automedic?${new URLSearchParams({ source: "attack-path", repo: selectedRepo?.full_name || job?.repoFullName || "", vulns: JSON.stringify(findings.map((finding) => ({ severity: finding.severity, title: finding.title, file: finding.file }))) }).toString()}`)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-xs font-semibold text-[#53656D] outline-none transition hover:border-[#008E9A] focus-visible:ring-2 focus-visible:ring-[#008E9A] focus-visible:ring-offset-2"><Zap className="h-3.5 w-3.5" />Open Auto-Medic<ArrowRight className="h-3.5 w-3.5" /></button></div>}
          </div>

          {findings.length > 0 && <div className="grid grid-cols-3 divide-x divide-[#D4E0E3] border-b border-[#D4E0E3] py-4"><div className="pr-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#53656D]">Critical</p><p className="mt-1 text-2xl font-bold text-[#B12926]">{severityTotals.critical}</p></div><div className="px-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#53656D]">Medium</p><p className="mt-1 text-2xl font-bold text-[#A05B00]">{severityTotals.medium}</p></div><div className="pl-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#53656D]">Low</p><p className="mt-1 text-2xl font-bold text-[#286778]">{severityTotals.low}</p></div></div>}

          {findings.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#53656D]">Severity<select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-sm text-[#17262D] outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]"><option value="all">All severities</option><option value="critical">Critical</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label className="text-xs font-semibold text-[#53656D]">Evidence source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-sm text-[#17262D] outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]"><option value="all">All sources</option>{sourceOptions.map((source) => <option key={source} value={source}>{sourceLabel(source)}</option>)}</select></label></div>}

          {findings.length > 0 ? (
            filteredFindings.length > 0 ? (
              <div className="mt-5 overflow-hidden border-y border-[#D4E0E3]">
                <div className="hidden grid-cols-[100px_minmax(0,1fr)_160px_180px_28px] gap-4 bg-[#EDF4F5] px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#53656D] md:grid">
                  <span>Severity</span>
                  <span>Finding</span>
                  <span>Source</span>
                  <span>Location</span>
                  <span />
                </div>
                {filteredFindings.map((finding) => (
                  <div key={finding.id} className="border-t border-[#D4E0E3] first:border-t-0">
                    <button
                      type="button"
                      onClick={() => setSelectedFindingId((current) => current === finding.id ? null : finding.id)}
                      className="grid w-full gap-2 px-4 py-4 text-left outline-none transition hover:bg-[#EDF4F5] focus-visible:bg-[#EDF4F5] md:grid-cols-[100px_minmax(0,1fr)_160px_180px_28px] md:gap-4"
                    >
                      <span className={`w-fit rounded-full border px-2 py-1 font-mono text-[10px] font-semibold uppercase ${severityClass(finding.severity)}`}>{finding.severity}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#17262D]">{finding.title}</span>
                        <span className="mt-1 block text-xs text-[#53656D] md:hidden">{sourceLabel(finding.source)}{finding.file ? ` · ${finding.file}` : ""}</span>
                      </span>
                      <span className="hidden truncate font-mono text-[10px] text-[#53656D] md:block">{sourceLabel(finding.source)}</span>
                      <span className="hidden truncate font-mono text-[10px] text-[#53656D] md:block">{finding.file || "Repository"}</span>
                      <ChevronRight className={`h-4 w-4 text-[#53656D] transition ${selectedFindingId === finding.id ? "rotate-90" : ""}`} />
                    </button>
                    {selectedFindingId === finding.id && (
                      <div className="border-t border-[#D4E0E3] bg-[#EDF4F5] px-4 py-4">
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
                          <div>
                            <p className="text-sm leading-relaxed text-[#53656D]">{finding.detail}</p>
                            <p className="mt-4 border-l-2 border-[#008E9A] pl-3 text-sm leading-relaxed text-[#17262D]">
                              <span className="font-semibold">Suggested fix. </span>{remediationFor(finding)}
                            </p>
                          </div>
                          <div className="flex items-start justify-between gap-4 border-t border-[#D4E0E3] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#53656D]">Evidence location</p>
                              <p className="mt-2 break-all font-mono text-xs text-[#17262D]">{finding.file || "Repository-wide evidence"}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void copyFinding(finding)}
                              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-xs font-semibold text-[#53656D] outline-none hover:border-[#008E9A] focus-visible:ring-2 focus-visible:ring-[#008E9A]"
                            >
                              {copiedFinding === finding.id ? <ClipboardCopy className="h-3.5 w-3.5 text-[#16754B]" /> : <Copy className="h-3.5 w-3.5" />}
                              {copiedFinding === finding.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 border-y border-dashed border-[#D4E0E3] py-10 text-center">
                <FileWarning className="mx-auto h-7 w-7 text-[#839198]" />
                <p className="mt-2 text-sm font-semibold text-[#17262D]">No findings match selected filters</p>
                <p className="mt-1 text-xs text-[#53656D]">Adjust your severity or evidence source filter to view results.</p>
                <button
                  type="button"
                  onClick={() => { setSeverityFilter("all"); setSourceFilter("all"); }}
                  className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[#D4E0E3] bg-[#FCFEFE] px-3 text-xs font-semibold text-[#008E9A] outline-none hover:border-[#008E9A]"
                >
                  Reset filters
                </button>
              </div>
            )
          ) : (
            <div className="mt-5 border-y border-dashed border-[#D4E0E3] py-12 text-center">
              <Shield className="mx-auto h-8 w-8 text-[#839198]" />
              <p className="mt-3 text-sm font-semibold text-[#17262D]">{lifecycle === "completed" ? "No findings returned" : "No scan evidence yet"}</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#53656D]">{lifecycle === "completed" ? "Review scanner coverage below before treating this as a clean result." : "Select an owned repository and queue one deep scan to begin collecting evidence."}</p>
            </div>
          )}
        </section>

        <PotentialAttackPaths candidates={attackPathCandidates} completed={lifecycle === "completed"} />

        <CoverageList tools={tools} />

        {job?.scanMetrics && lifecycle === "completed" && (
          <section className="border-b border-[#D4E0E3] py-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Run record</p>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs text-[#53656D]">
              {job.startedAt && <span>Started: {formatTimestamp(job.startedAt)}</span>}
              {job.completedAt && <span>Completed: {formatTimestamp(job.completedAt)}</span>}
              <span>Queue wait: {formatDuration(job.scanMetrics.queueWaitMs) || "not recorded"}</span>
              <span>Scanner time: {formatDuration(job.scanMetrics.durationMs) || "not recorded"}</span>
              <span>Attempts: {String(job.scanMetrics.attemptCount || 1)}</span>
              {coverageIsPartial && <span className="font-semibold text-[#A05B00]">Partial scanner coverage</span>}
            </div>
          </section>
        )}

        <footer className="flex flex-col gap-3 py-6 text-xs text-[#53656D] sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#008E9A]" />The browser never connects to the scanner directly.</span>{selectedRepo && <span className="flex items-center gap-2 font-mono"><ExternalLink className="h-3.5 w-3.5" />{selectedRepo.full_name}</span>}</footer>
      </div>

      {cancelOpen && <div role="dialog" aria-modal="true" aria-labelledby="cancel-scan-title" className="fixed inset-0 z-50 grid place-items-center bg-[#17262D]/35 p-4"><div className="w-full max-w-md rounded-xl border border-[#D4E0E3] bg-[#FCFEFE] p-5 shadow-[0_12px_32px_rgb(23_38_45_/_0.18)]"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#53656D]">Cancel scan</p><h2 id="cancel-scan-title" className="mt-1 text-lg font-bold text-[#17262D]">Stop this repository scan?</h2></div><button type="button" onClick={() => setCancelOpen(false)} aria-label="Close cancellation dialog" className="rounded p-1 text-[#53656D] outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]"><X className="h-5 w-5" /></button></div><p className="mt-4 text-sm leading-relaxed text-[#53656D]">ServX will stop the queued or active scan and remove the worker’s temporary files. Existing completed findings are not changed.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setCancelOpen(false)} className="min-h-11 rounded-lg border border-[#D4E0E3] px-4 text-sm font-semibold text-[#53656D] outline-none focus-visible:ring-2 focus-visible:ring-[#008E9A]">Keep scanning</button><button type="button" onClick={() => void confirmCancel()} className="min-h-11 rounded-lg bg-[#B12926] px-4 text-sm font-semibold text-white outline-none hover:bg-[#92211F] focus-visible:ring-2 focus-visible:ring-[#B12926] focus-visible:ring-offset-2">Cancel scan</button></div></div></div>}
    </main>
  );
};

export default AttackPath;
