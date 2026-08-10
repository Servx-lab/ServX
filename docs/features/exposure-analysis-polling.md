# Exposure Analysis — Polling & Last Updated Indicator

**File:** `apps/web/src/pages/ExposureAnalysis.tsx`

## Change Summary

Added a 45-second polling mechanism to keep the page's live data fresh, along with a "Live · Updated Xm ago" badge in the page header to communicate data freshness to the user.

## Rationale

Without polling, the page would only fetch data once on mount. Security exposure data can change as new scans run or findings are resolved, so periodic refresh ensures the displayed metrics stay current without requiring a manual page reload.

## Implementation Details

### Polling Interval

```typescript
const POLL_INTERVAL_MS = 45000; // 45 seconds
```

### Last Updated State

```typescript
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
```

Updated to `new Date()` on every successful fetch inside `fetchLiveData`.

### Polling Effect

```typescript
useEffect(() => {
  fetchLiveData();
  const interval = setInterval(() => fetchLiveData(true), POLL_INTERVAL_MS);
  return () => clearInterval(interval);
}, [fetchLiveData]);
```

Key behaviors:
- **Initial fetch:** `fetchLiveData()` is called immediately on mount (with `isBackground = false`, so the loading state is shown).
- **Background refreshes:** `fetchLiveData(true)` is called every 45 seconds (with `isBackground = true`, so the loading spinner is suppressed and the UI doesn't flicker).
- **Cleanup:** The interval is cleared on unmount to prevent memory leaks.

### Live Status Badge

Added to `PageLayout`'s `headerContent` prop:

```tsx
<div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm w-fit">
  <span className="h-1.5 w-1.5 rounded-full bg-[#00C2CB] animate-pulse" />
  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
    {lastUpdated ? `Live · Updated ${timeAgo(lastUpdated.toISOString())}` : 'Connecting…'}
  </span>
</div>
```

The badge shows:
- A pulsing teal dot indicating active connection.
- `'Connecting…'` before the first successful fetch.
- `'Live · Updated Xm ago'` after data is received, using the `timeAgo()` helper to format the elapsed time.

### timeAgo Helper

```typescript
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
```

## Impact

The page now stays current with backend state through automatic background polling. The live status badge gives users confidence that the data is real and actively refreshed, rather than a static snapshot. The 45-second interval balances freshness with API load.
