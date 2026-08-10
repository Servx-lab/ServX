# Exposure Analysis — Findings-Based Conditional Chart Coloring

**File:** `apps/web/src/pages/ExposureAnalysis.tsx`

## Change Summary

Modified the `WaveformChart` component to color bars, line segments, the marker, and the callout pill light grey by default and red when the interpolated findings count at that position exceeds a critical threshold.

## Rationale

The user requested that chart elements be "light grey and red if it is critical." After clarification, "critical" was defined as **findings-based** — meaning bars and line segments turn red at positions where the findings count is high relative to the maximum across the dataset.

## Implementation Details

### Color Constants

```typescript
const GREY = '#CBD5E1';       // bar fill (default)
const GREY_LINE = '#94A3B8';  // line stroke (default)
const RED = '#EF4444';        // critical color
```

### Critical Threshold Calculation

The threshold is computed as 60% of the maximum findings value in the dataset:

```typescript
const criticalThreshold = useMemo(() => {
  const max = Math.max(0, ...findings);
  return max * 0.6;
}, [findings]);
```

### Linear Interpolation

Since the `findings` array has fewer data points than the 84 bars, a `interpolateAt` function maps bar positions to findings values:

```typescript
function interpolateAt(arr: number[], t: number): number {
  if (arr.length === 0) return 0;
  if (arr.length === 1) return arr[0];
  const pos = t * (arr.length - 1);
  const i0 = Math.floor(pos);
  const i1 = Math.min(arr.length - 1, i0 + 1);
  const frac = pos - i0;
  return arr[i0] + (arr[i1] - arr[i0]) * frac;
}
```

### Bar Coloring

Each bar's `critical` flag is determined by interpolating the findings array at the bar's normalized position:

```typescript
const findingsAtBar = interpolateAt(findings, i / (BAR_COUNT - 1));
const critical = findingsAtBar >= criticalThreshold;
```

Bars use `fill={bar.critical ? RED : GREY}` in the SVG `<rect>`.

### Line Segment Coloring

The smooth line is drawn as individual cubic-bezier segments (one per anchor pair), allowing each segment to be colored independently:

```typescript
const critical =
  interpolateAt(findings, t0) >= criticalThreshold ||
  interpolateAt(findings, t1) >= criticalThreshold;
```

Segments use `stroke={seg.critical ? RED : GREY_LINE}` and a thicker stroke width (3.5 vs 2.5) when critical.

### Marker & Callout

The peak marker color is determined by whether the peak anchor's interpolated findings value exceeds the threshold:

```typescript
const peakIsCritical = interpolateAt(findings, peakAnchorIndex / (CURVE_ANCHORS.length - 1)) >= criticalThreshold;
const markerColor = peakIsCritical ? RED : GREY_LINE;
```

The callout pill text color also changes: `text-red-400` when critical, `text-slate-200` otherwise.

### Prop Change

The `WaveformChartProps` interface was updated — `calloutPositive` was removed and `findings: number[]` was added:

```typescript
// Before:
interface WaveformChartProps {
  seed: number;
  calloutPositive: boolean;
  calloutValue: string;
}

// After:
interface WaveformChartProps {
  seed: number;
  findings: number[];
  calloutValue: string;
}
```

The call site was updated to pass `findings={trendData.map((d) => d.findings)}` instead of `calloutPositive={scoreChange.positive}`.

## Impact

The chart now visually communicates risk concentration — areas with high findings counts are immediately identifiable by their red coloring, while low-risk areas remain unobtrusive in grey. This provides an at-a-glance understanding of when critical findings were detected across the timeline.
