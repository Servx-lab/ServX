import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/layout/PageLayout';
import apiClient from '@/lib/apiClient';
import {
  ShieldAlert,
  Globe,
  Server,
  Cloud,
  ChevronDown,
  Settings,
  ArrowDownUp,
  ArrowUpRight,
  Lock,
  KeyRound,
  Wallet,
  RefreshCw,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type TimeRange = '1h' | '24h' | '1w' | '1m' | '6m' | '1y';
type SurfaceMode = 'external' | 'internal';
type AssetStatus = 'critical' | 'warning' | 'info';
type ExposureCategory = 'network' | 'cloud_storage' | 'dns' | 'iam' | 'web_headers';
type ExposureSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

interface TrendPoint {
  date: string;
  score: number;
  findings: number;
}

/** Real shape returned by GET /api/exposure/summary */
interface ExposureSummary {
  score: { score: number; grade: string; status: string; breakdown: Record<ExposureCategory, number> };
  assets: { total: number; domains: number; ips: number; buckets: number };
  criticalFindings: number;
}

/** Real shape returned by GET /api/exposure/findings (rows of exposure_findings) */
interface FindingRow {
  id: string;
  asset_value: string;
  category: ExposureCategory;
  severity: ExposureSeverity;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// ─── Illustrative trend data ────────────────────────────────────────────────
// NOTE: There is currently no backend history table for exposure scores over
// time (see migration-supabase-exposure.sql — only exposure_assets/findings
// exist as point-in-time state). This waveform is decorative until a real
// score-history endpoint exists; everything else on this page is live.

const MONITORED_TARGETS = [
  { label: 'servx.io', sub: 'Primary Domain' },
  { label: '34.122.10.4', sub: 'Edge Gateway' },
  { label: 's3://servx-backups-prod', sub: 'Cloud Storage' },
];

const TIME_RANGES: TimeRange[] = ['1h', '24h', '1w', '1m', '6m', '1y'];

const TREND_DATA: Record<TimeRange, TrendPoint[]> = {
  '1h': gen(12, 74, 4, 1),
  '24h': gen(24, 70, 6, 2),
  '1w': gen(7, 66, 5, 3),
  '1m': gen(15, 61, 8, 3),
  '6m': gen(12, 58, 10, 4),
  '1y': gen(12, 55, 14, 5),
};

function gen(points: number, base: number, variance: number, findingsBase: number): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (let i = 0; i < points; i++) {
    const wobble = Math.sin(i / 1.7) * variance + (i === Math.floor(points * 0.55) ? variance * 1.4 : 0);
    out.push({
      date: `D${i + 1}`,
      score: Math.max(20, Math.min(95, Math.round(base + wobble))),
      findings: Math.max(0, Math.round(findingsBase + Math.abs(Math.sin(i)) * findingsBase * 2)),
    });
  }
  return out;
}

// Mirrors the server-side SEVERITY_WEIGHT scale in apps/api/.../exposure/service.ts
// so the "Score Impact" column reflects the same weights actually used to compute the score.
const SEVERITY_WEIGHT: Record<ExposureSeverity, number> = {
  CRITICAL: 30, HIGH: 18, MEDIUM: 8, LOW: 3, INFO: 0,
};

const CATEGORY_ICON: Record<ExposureCategory, React.ElementType> = {
  network: Server,
  cloud_storage: Cloud,
  dns: Globe,
  iam: KeyRound,
  web_headers: Lock,
};

const CATEGORY_LABEL: Record<ExposureCategory, string> = {
  network: 'Network',
  cloud_storage: 'Cloud Storage',
  dns: 'DNS',
  iam: 'IAM',
  web_headers: 'Web Headers',
};

function severityToStatus(severity: ExposureSeverity): AssetStatus {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'critical';
  if (severity === 'MEDIUM' || severity === 'LOW') return 'warning';
  return 'info';
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_STYLES: Record<AssetStatus, { badge: string; dot: string; label: string }> = {
  critical: { badge: 'bg-red-50 text-[#EF4444] border-red-100', dot: 'bg-[#EF4444]', label: 'Critical' },
  warning: { badge: 'bg-amber-50 text-[#B45309] border-amber-100', dot: 'bg-[#F59E0B]', label: 'Warning' },
  info: { badge: 'bg-cyan-50 text-[#00C2CB] border-cyan-100', dot: 'bg-[#00C2CB]', label: 'Info' },
};

// ─── Waveform Trend Chart (custom SVG, matches reference visual) ───────────

const CHART_W = 1000;
const CHART_H = 300;
const BAR_COUNT = 84;

/** Deterministic pseudo-random generator so the waveform doesn't reshuffle on re-render. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Catmull-Rom to cubic-bezier path — produces the smooth flowing curve. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Authored narrative curve (0..1, inverted so smaller = higher) mirroring the reference's rise → peak → dip → plateau shape. */
const CURVE_ANCHORS = [0.58, 0.52, 0.4, 0.22, 0.16, 0.34, 0.58, 0.66, 0.62, 0.6, 0.57];

const GREY = '#CBD5E1';
const GREY_LINE = '#94A3B8';
const RED = '#EF4444';

/** Linear interpolation of a data array at normalized position t (0..1). */
function interpolateAt(arr: number[], t: number): number {
  if (arr.length === 0) return 0;
  if (arr.length === 1) return arr[0];
  const pos = t * (arr.length - 1);
  const i0 = Math.floor(pos);
  const i1 = Math.min(arr.length - 1, i0 + 1);
  const frac = pos - i0;
  return arr[i0] + (arr[i1] - arr[i0]) * frac;
}

interface WaveformChartProps {
  seed: number;
  findings: number[];
  calloutValue: string;
}

const WaveformChart: React.FC<WaveformChartProps> = ({ seed, findings, calloutValue }) => {
  const rng = useMemo(() => mulberry32(seed), [seed]);

  // Critical threshold: bars/segments whose interpolated findings value crosses this are flagged critical.
  const criticalThreshold = useMemo(() => {
    const max = Math.max(0, ...findings);
    return max * 0.6;
  }, [findings]);

  const linePoints = useMemo(
    () =>
      CURVE_ANCHORS.map((v, i) => ({
        x: (i / (CURVE_ANCHORS.length - 1)) * CHART_W,
        y: v * CHART_H,
      })),
    []
  );

  const peakAnchorIndex = useMemo(
    () => CURVE_ANCHORS.indexOf(Math.min(...CURVE_ANCHORS)),
    []
  );
  const peakBarIndex = Math.round((peakAnchorIndex / (CURVE_ANCHORS.length - 1)) * (BAR_COUNT - 1));
  const peakIsCritical = interpolateAt(findings, peakAnchorIndex / (CURVE_ANCHORS.length - 1)) >= criticalThreshold;

  const bars = useMemo(() => {
    const out: { x: number; height: number; opacity: number; critical: boolean }[] = [];
    const barWidth = CHART_W / BAR_COUNT;
    for (let i = 0; i < BAR_COUNT; i++) {
      // Waveform-like height: layered sine noise, independent of fade envelope.
      const noise =
        0.4 +
        0.3 * Math.abs(Math.sin(i * 0.35 + seed)) +
        0.3 * Math.abs(Math.sin(i * 0.9 + seed * 1.7)) +
        (rng() - 0.5) * 0.15;
      const height = Math.max(0.08, Math.min(1, noise)) * (CHART_H * 0.82);

      // Fade envelope: fast rise before peak, slow decay after, plus edge fades.
      const dist = i - peakBarIndex;
      const sigma = dist < 0 ? 14 : 30;
      const gaussian = Math.exp(-(dist * dist) / (2 * sigma * sigma));
      const leftEdgeFade = Math.min(1, i / (BAR_COUNT * 0.05));
      const rightEdgeFade = Math.min(1, (BAR_COUNT - 1 - i) / (BAR_COUNT * 0.12));
      const opacity = Math.max(0.04, Math.min(1, gaussian)) * leftEdgeFade * rightEdgeFade;

      const findingsAtBar = interpolateAt(findings, i / (BAR_COUNT - 1));
      const critical = findingsAtBar >= criticalThreshold;

      out.push({ x: i * barWidth + barWidth / 2, height, opacity, critical });
    }
    return out;
  }, [rng, seed, peakBarIndex, findings, criticalThreshold]);

  // Build one bezier path per segment so each can be colored individually (grey vs red).
  const segments = useMemo(() => {
    const out: { d: string; critical: boolean }[] = [];
    for (let i = 0; i < linePoints.length - 1; i++) {
      const p0 = linePoints[i - 1] || linePoints[i];
      const p1 = linePoints[i];
      const p2 = linePoints[i + 1];
      const p3 = linePoints[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      const d = `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
      const t0 = i / (linePoints.length - 1);
      const t1 = (i + 1) / (linePoints.length - 1);
      const critical =
        interpolateAt(findings, t0) >= criticalThreshold || interpolateAt(findings, t1) >= criticalThreshold;
      out.push({ d, critical });
    }
    return out;
  }, [linePoints, findings, criticalThreshold]);

  const markerX = linePoints[peakAnchorIndex].x;
  const markerY = linePoints[peakAnchorIndex].y;
  const markerLeftPct = (markerX / CHART_W) * 100;
  const markerTopPct = (markerY / CHART_H) * 100;
  const markerColor = peakIsCritical ? RED : GREY_LINE;

  return (
    <div className="relative h-[280px] w-full">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        {/* Waveform bars */}
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x - 2}
            y={CHART_H - bar.height}
            width={3.5}
            height={bar.height}
            rx={1.5}
            fill={bar.critical ? RED : GREY}
            fillOpacity={bar.opacity}
          />
        ))}

        {/* Smooth flowing line, drawn as individually-colored segments */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.critical ? RED : GREY_LINE}
            strokeWidth={seg.critical ? 3.5 : 2.5}
            strokeLinecap="round"
          />
        ))}

        {/* Glow halo behind marker */}
        <circle cx={markerX} cy={markerY} r={20} fill={markerColor} opacity={0.18} />
        <circle cx={markerX} cy={markerY} r={10} fill={markerColor} opacity={0.25} />
        {/* Marker */}
        <circle cx={markerX} cy={markerY} r={6} fill="white" stroke={markerColor} strokeWidth={3} />
      </svg>

      {/* Floating callout pill */}
      <div
        className="absolute -translate-x-1/2 -translate-y-[calc(100%+14px)]"
        style={{ left: `${markerLeftPct}%`, top: `${markerTopPct}%` }}
      >
        <div className="whitespace-nowrap rounded-full bg-slate-900/90 backdrop-blur-sm px-4 py-2 shadow-lg">
          <span className={`text-sm font-black ${peakIsCritical ? 'text-red-400' : 'text-slate-200'}`}>
            {calloutValue}
          </span>
        </div>
        <div className="mx-auto mt-[-2px] h-2 w-2 rotate-45 bg-slate-900/90" />
      </div>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 45000;

const ExposureAnalysis = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('external');
  const [targetOpen, setTargetOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(MONITORED_TARGETS[0]);

  const [summary, setSummary] = useState<ExposureSummary | null>(null);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLiveData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [summaryRes, findingsRes] = await Promise.all([
        apiClient.get<ExposureSummary>('/exposure/summary'),
        apiClient.get<{ findings: FindingRow[] }>('/exposure/findings'),
      ]);
      setSummary(summaryRes.data);
      setFindings(findingsRes.data.findings || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[ExposureAnalysis] Failed to fetch live data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(() => fetchLiveData(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  const handleRunScan = async () => {
    const domainCandidate = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})+$/.test(selectedTarget.label)
      ? selectedTarget.label
      : 'servx.io';
    setScanning(true);
    try {
      await apiClient.post('/exposure/scan', { domain: domainCandidate });
      await fetchLiveData(true);
    } catch (err) {
      console.error('[ExposureAnalysis] Scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const trendData = useMemo(() => TREND_DATA[timeRange], [timeRange]);

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length;
  const warningCount = findings.filter((f) => f.severity === 'MEDIUM' || f.severity === 'LOW').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO').length;

  const topFindings = useMemo(
    () =>
      [...findings]
        .sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity])
        .slice(0, 8),
    [findings]
  );

  return (
    <PageLayout
      title="Exposure Analysis"
      subtitle="Continuous discovery and risk scoring across your external footprint — domains, infrastructure, and cloud storage."
      fullWidth
      headerContent={
        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00C2CB] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {lastUpdated ? `Live · Updated ${timeAgo(lastUpdated.toISOString())}` : 'Connecting…'}
          </span>
        </div>
      }
    >
      <div className="space-y-8">
        {/* ─── Hero Section: Chart + Action Panel ───────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Left: Score + Chart */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              {/* Target selector */}
              <div className="relative">
                <button
                  onClick={() => setTargetOpen(!targetOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-[#00C2CB]/50 transition-all"
                >
                  <Globe className="h-3.5 w-3.5 text-[#00C2CB]" />
                  <span className="text-xs font-bold text-slate-700">{selectedTarget.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${targetOpen ? 'rotate-180' : ''}`} />
                </button>
                {targetOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-30">
                    {MONITORED_TARGETS.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => {
                          setSelectedTarget(t);
                          setTargetOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-xs font-bold text-slate-800">{t.label}</p>
                        <p className="text-[10px] text-slate-400">{t.sub}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time range tabs */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all ${
                      timeRange === range
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Score + change (live) */}
            <div className="flex items-end gap-3 mb-2">
              <span className="text-5xl font-black text-slate-900 leading-none tabular-nums">
                {loading ? '—' : summary?.score.score ?? 0}
              </span>
              {summary && (
                <span
                  className={`text-sm font-bold mb-1.5 px-2 py-0.5 rounded-lg ${
                    summary.score.score >= 70 ? 'text-emerald-600 bg-emerald-50' : 'text-[#EF4444] bg-red-50'
                  }`}
                >
                  {summary.score.grade} · {summary.score.status}
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-6">
              Global Exposure Score · {selectedTarget.label}
            </p>

            {/* Chart — illustrative trend (no historical score data exists in the backend yet) */}
            <WaveformChart
              seed={TIME_RANGES.indexOf(timeRange) + 1}
              findings={trendData.map((d) => d.findings)}
              calloutValue="Illustrative"
            />
            <p className="text-center text-[10px] font-semibold text-slate-300 uppercase tracking-wide -mt-2">
              Illustrative trend — historical scoring coming soon
            </p>
          </div>

          {/* Right: Action Panel */}
          <div className="flex flex-col gap-4">
            {/* Surface toggle + settings */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => setSurfaceMode('external')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    surfaceMode === 'external' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  External
                </button>
                <button
                  onClick={() => setSurfaceMode('internal')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    surfaceMode === 'internal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Internal
                </button>
              </div>
              <button className="h-[38px] w-[38px] shrink-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:border-[#00C2CB]/50 transition-all">
                <Settings className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* Assets Monitored card (live) */}
            <div className="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-cyan-50 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-[#00C2CB]" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Assets</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">You Monitor</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-slate-900 tabular-nums">
                  {loading ? '—' : summary?.assets.total ?? 0}
                </span>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Breakdown</p>
                  <p className="text-[10px] font-medium text-slate-500">
                    {summary ? `${summary.assets.domains} Domains · ${summary.assets.ips} IPs · ${summary.assets.buckets} Buckets` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Swap divider */}
            <div className="flex justify-center -my-6 z-10">
              <div className="h-8 w-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <ArrowDownUp className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Open Findings card (live) */}
            <div className="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                    <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Findings</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">You Remediate</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-slate-900 tabular-nums">{loading ? '—' : findings.length}</span>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Breakdown</p>
                  <p className="text-[10px] font-medium text-slate-500">
                    {`${criticalCount} Critical · ${warningCount} Warning · ${infoCount} Info`}
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className="w-full py-3.5 rounded-xl bg-[#00C2CB] text-white text-sm font-black uppercase tracking-wide shadow-md hover:shadow-lg hover:brightness-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {scanning && <RefreshCw className="h-4 w-4 animate-spin" />}
              {scanning ? 'Scanning…' : 'Run Full Scan'}
            </button>
            <button className="w-full py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold uppercase tracking-wide hover:border-[#00C2CB]/50 transition-all duration-300 flex items-center justify-center gap-2">
              <Wallet className="h-4 w-4 text-slate-400" />
              Connect Integration
            </button>

            {/* Category health panel (live, from real score breakdown) */}
            <div className="rounded-2xl bg-gradient-to-br from-[#00C2CB]/10 via-[#6C63FF]/10 to-white border border-slate-100 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                Attack Surface Health
              </p>
              <p className="text-2xl font-black text-slate-900 mb-4">
                {loading ? '—' : `${summary?.score.score ?? 0}%`} <span className="text-xs font-bold text-slate-400">overall</span>
              </p>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/70">
                {(['network', 'cloud_storage', 'web_headers'] as ExposureCategory[]).map((cat) => {
                  const val = summary?.score.breakdown[cat] ?? 0;
                  const color = val >= 80 ? '#10B981' : val >= 50 ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={cat}>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{CATEGORY_LABEL[cat]}</p>
                      <p className="text-sm font-black" style={{ color }}>
                        {loading ? '—' : `${val}%`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Section: Top Exposed Assets Table ─────────────────── */}
        <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-md">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">
              Top Exposed Assets
            </h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Impact</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detected</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && topFindings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm font-medium text-slate-300">
                    No open findings — run a scan to discover exposed assets.
                  </td>
                </tr>
              )}
              {topFindings.map((finding) => {
                const status = severityToStatus(finding.severity);
                const style = STATUS_STYLES[status];
                const Icon = CATEGORY_ICON[finding.category];
                return (
                  <motion.tr
                    key={finding.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 font-mono">{finding.asset_value}</p>
                          <p className="text-[10px] text-slate-400">{finding.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{CATEGORY_LABEL[finding.category]}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${style.badge}`}>
                        <span className={`h-1 w-1 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="text-sm font-black tabular-nums"
                        style={{ color: SEVERITY_WEIGHT[finding.severity] >= 18 ? '#EF4444' : SEVERITY_WEIGHT[finding.severity] >= 8 ? '#F59E0B' : '#10B981' }}
                      >
                        -{SEVERITY_WEIGHT[finding.severity]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{timeAgo(finding.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      {status === 'critical' ? (
                        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#EF4444] text-white text-[10px] font-black uppercase tracking-wide shadow-sm hover:shadow-md transition-all">
                          <ShieldAlert className="h-3 w-3" />
                          Mitigate
                        </button>
                      ) : (
                        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wide hover:border-[#00C2CB]/50 transition-all">
                          View
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
};

export default ExposureAnalysis;
