# Exposure Analysis — Run Full Scan Functionality

**File:** `apps/web/src/pages/ExposureAnalysis.tsx`

## Change Summary

Implemented the "Run Full Scan" button to trigger a real backend scan via `POST /api/exposure/scan`, with loading state and automatic data refresh upon completion.

## Rationale

The "Run Full Scan" CTA was initially a non-functional button. Wiring it to the backend scan endpoint allows users to initiate on-demand asset discovery and security scanning from the UI, then immediately see updated results.

## Implementation Details

### Scanning State

```typescript
const [scanning, setScanning] = useState(false);
```

### Handler Function

```typescript
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
```

Key behaviors:
- **Domain validation:** The selected target's label is tested against a domain regex. If it doesn't match (e.g., it's an IP or S3 bucket), it falls back to `'servx.io'` as the scan domain.
- **API call:** Sends a `POST` request to `/exposure/scan` with the validated domain.
- **Post-scan refresh:** After the scan completes, `fetchLiveData(true)` is called to refresh the summary and findings data without triggering the loading spinner.
- **Error handling:** Errors are logged to the console but don't crash the UI.
- **State cleanup:** `setScanning(false)` in the `finally` block ensures the button returns to normal state regardless of success or failure.

### Button JSX

```tsx
<button
  onClick={handleRunScan}
  disabled={scanning}
  className="w-full py-3.5 rounded-xl bg-[#00C2CB] text-white text-sm font-black uppercase tracking-wide shadow-md hover:shadow-lg hover:brightness-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
>
  {scanning && <RefreshCw className="h-4 w-4 animate-spin" />}
  {scanning ? 'Scanning…' : 'Run Full Scan'}
</button>
```

UI feedback during scanning:
- Button is disabled (`disabled={scanning}`).
- A spinning `RefreshCw` icon appears.
- Button text changes from "Run Full Scan" to "Scanning…".
- Opacity is reduced and cursor shows `not-allowed`.

### Backend Endpoint

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/exposure/scan` | POST | Triggers `runScan()` which performs DNS enumeration, cloud asset discovery, port scanning (Shodan), security header checks, and persists findings to Supabase |

## Impact

Users can now trigger real security scans from the Exposure Analysis page. The scan discovers assets, checks for vulnerabilities, persists findings, and the UI automatically refreshes to show the updated exposure score and findings list. This transforms the page from a passive dashboard into an active security tool.
