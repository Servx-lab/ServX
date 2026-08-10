# Exposure Analysis — Live Data Integration

**File:** `apps/web/src/pages/ExposureAnalysis.tsx`

## Change Summary

Replaced all mock data with real backend data fetched from the exposure API endpoints. The score, assets count, findings count, findings breakdown, category health panel, and the Top Exposed Assets table now reflect actual backend state.

## Rationale

The page was initially populated with static mock data. The user observed the chart was "not moving" and asked why it was "fixed in one place." After a thorough analysis of the tradeoffs between simulated data, real polling, and a hybrid approach, the user chose **Path C — check backend first**: wire existing live data to the frontend and acknowledge the trend chart remains illustrative until a historical score endpoint exists.

## Implementation Details

### API Client Import

```typescript
import apiClient from '@/lib/apiClient';
```

### TypeScript Interfaces for API Responses

```typescript
interface ExposureSummary {
  score: { score: number; grade: string; status: string; breakdown: Record<ExposureCategory, number> };
  assets: { total: number; domains: number; ips: number; buckets: number };
  criticalFindings: number;
}

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
```

### State for Live Data

```typescript
const [summary, setSummary] = useState<ExposureSummary | null>(null);
const [findings, setFindings] = useState<FindingRow[]>([]);
const [loading, setLoading] = useState(true);
```

### Data Fetching Function

```typescript
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
```

Both requests are fired in parallel via `Promise.all`. The `isBackground` parameter controls whether the loading spinner state is shown (suppressed during background polling refreshes).

### Derived Data

Findings are categorized and sorted for display:

```typescript
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
```

The `SEVERITY_WEIGHT` constant mirrors the server-side scoring weights so the "Score Impact" column in the table reflects the actual penalty applied by `computeExposureScore()`.

### JSX Updates

All previously hardcoded mock values were replaced with live data references:

- **Score display:** `summary?.score.score ?? 0` with grade and status badge.
- **Assets card:** `summary?.assets.total ?? 0` with breakdown (`domains`, `ips`, `buckets`).
- **Findings card:** `findings.length` with `criticalCount`, `warningCount`, `infoCount` breakdown.
- **Category health panel:** `summary?.score.breakdown[cat]` for network, cloud_storage, and web_headers.
- **Top Exposed Assets table:** Maps over `topFindings` with live `asset_value`, `title`, `category`, `severity`, `created_at`.

### Loading States

All numeric displays show `'—'` while `loading` is true. The table shows an empty state message when no findings exist:

```tsx
{!loading && topFindings.length === 0 && (
  <tr>
    <td colSpan={6} className="px-6 py-10 text-center text-sm font-medium text-slate-300">
      No open findings — run a scan to discover exposed assets.
    </td>
  </tr>
)}
```

### Trend Chart — Explicitly Illustrative

The waveform chart remains driven by the `TREND_DATA` mock and is explicitly labeled as illustrative:

```tsx
<WaveformChart
  seed={TIME_RANGES.indexOf(timeRange) + 1}
  findings={trendData.map((d) => d.findings)}
  calloutValue="Illustrative"
/>
<p className="text-center text-[10px] font-semibold text-slate-300 uppercase tracking-wide -mt-2">
  Illustrative trend — historical scoring coming soon
</p>
```

A code comment explains the gap:

```typescript
// NOTE: There is currently no backend history table for exposure scores over
// time (see migration-supabase-exposure.sql — only exposure_assets/findings
// exist as point-in-time state). This waveform is decorative until a real
// score-history endpoint exists; everything else on this page is live.
```

### Removed Mock Data

The following mock data declarations were removed entirely:
- `ASSETS_MONITORED`, `OPEN_FINDINGS`, `COVERAGE_STATS`, `TOP_EXPOSED_ASSETS`
- `currentScore`, `scoreChange`

## Backend Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/exposure/summary` | GET | Returns score, assets counts, and critical findings count |
| `/api/exposure/findings` | GET | Returns array of finding rows from `exposure_findings` table |

## Impact

All summary metrics, the findings breakdown, the category health panel, and the assets table now reflect real backend state. The page is no longer a static mockup — it displays actual security posture data from Supabase via the Express API. The only remaining illustrative element is the trend chart, which is clearly labeled as such pending future backend work (Phase 2: historical score table + endpoint).
