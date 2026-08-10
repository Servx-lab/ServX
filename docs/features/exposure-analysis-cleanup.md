# Exposure Analysis — Import Cleanup & Type Safety

**File:** `apps/web/src/pages/ExposureAnalysis.tsx`

## Change Summary

Cleaned up unused imports, added proper TypeScript interfaces for API responses, and introduced utility functions and constants to support the transition from mock data to live backend data.

## Rationale

As the page evolved from mock data to live data integration, several imports, variables, and types became stale or unused. Cleaning these up ensures the codebase remains lint-clean and type-safe.

## Implementation Details

### Removed Imports

- **`Wifi`** from `lucide-react` — was used for the mock assets table icon, no longer needed after switching to live data with category-based icons.
- **All `recharts` imports** (`ComposedChart`, `ResponsiveContainer`, `XAxis`, `YAxis`, `Tooltip`, `Bar`, `Area`) — removed when the custom `WaveformChart` replaced the recharts chart.

### Added Imports

```typescript
import apiClient from '@/lib/apiClient';
import { RefreshCw } from 'lucide-react';
```

- **`apiClient`** — for making HTTP requests to the exposure API endpoints.
- **`RefreshCw`** — for the spinning icon during scan execution.

### Added React Hooks

```typescript
import React, { useEffect, useMemo, useState, useCallback } from 'react';
```

- **`useEffect`** — for the polling interval lifecycle.
- **`useCallback`** — to memoize `fetchLiveData` for stable effect dependencies.

### New Type Definitions

```typescript
type ExposureCategory = 'network' | 'cloud_storage' | 'dns' | 'iam' | 'web_headers';
type ExposureSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
```

These types mirror the backend enums defined in the Supabase migration and the Express service layer, ensuring type-safe handling of API responses.

### Utility Functions

```typescript
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
```

- **`severityToStatus`** — Maps API severity values to UI status badges (critical/warning/info).
- **`timeAgo`** — Formats ISO timestamps as relative time strings for the table and live badge.

### Constants

```typescript
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
```

- **`SEVERITY_WEIGHT`** — Mirrors the server-side scoring weights from `apps/api/src/domains/exposure/service.ts` so the "Score Impact" column reflects the actual penalty used by `computeExposureScore()`.
- **`CATEGORY_ICON`** — Maps each exposure category to a Lucide icon for the table.
- **`CATEGORY_LABEL`** — Human-readable labels for each category.

### Removed Mock Data

The following mock data declarations were removed as they were replaced by live data:
- `ASSETS_MONITORED`
- `OPEN_FINDINGS`
- `COVERAGE_STATS`
- `TOP_EXPOSED_ASSETS`
- `currentScore`
- `scoreChange`

## Impact

The file is now lint-clean with no unused imports or variables. Type safety is enforced through proper interfaces matching the API response shapes. The utility functions and constants provide a single source of truth for severity weights, category metadata, and time formatting, ensuring consistency between the frontend display and backend scoring logic.
