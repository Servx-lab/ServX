# Exposure Analysis — Waveform Chart Visualization

**File:** `apps/web/src/pages/ExposureAnalysis.tsx`

## Change Summary

Replaced the `recharts` `ComposedChart` with a custom SVG-based `WaveformChart` component that renders a waveform-style trend visualization matching a provided reference image.

## Rationale

The standard `recharts` bar/area chart did not match the desired visual language. The reference design featured thin gradient bars with a smooth flowing line, a glowing marker at the peak, and a floating callout pill — none of which `recharts` could produce without heavy customization. A purpose-built SVG component provided full control over the aesthetic.

## Implementation Details

### Removal of recharts

All `recharts` imports were removed:

```typescript
// Removed:
import { ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, Area } from 'recharts';
```

The `CustomTooltip` component and the entire `<ResponsiveContainer>...</ResponsiveContainer>` JSX block were also removed.

### WaveformChart Component

A new `WaveformChart` React functional component was created, rendering entirely via SVG.

#### Key Constants

```typescript
const CHART_W = 1000;
const CHART_H = 300;
const BAR_COUNT = 84;
```

#### Deterministic Noise

A `mulberry32` seeded PRNG ensures the waveform doesn't reshuffle between re-renders:

```typescript
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

#### Smooth Flowing Line

A Catmull-Rom-to-cubic-bezier conversion (`smoothPath` function) produces the smooth curve. The line is driven by authored anchor points (`CURVE_ANCHORS`) that define a rise → peak → dip → plateau narrative shape.

#### Waveform Bars

84 bars are rendered as `<rect>` elements with:
- **Height:** Layered sine noise (`Math.sin(i * 0.35 + seed)` + `Math.sin(i * 0.9 + seed * 1.7)`) plus PRNG jitter.
- **Opacity:** A Gaussian fade envelope centered on the peak bar, with edge fades on both sides.

#### Glowing Marker

At the peak anchor point, three concentric `<circle>` elements create a glow halo effect:
- Outer halo (r=20, opacity=0.18)
- Inner halo (r=10, opacity=0.25)
- Marker dot (r=6, white fill, colored stroke)

#### Floating Callout Pill

An HTML `<div>` positioned absolutely over the SVG, using percentage-based `left` and `top` calculated from the marker's SVG coordinates. The pill contains the `calloutValue` text and a small rotated square as a pointer arrow.

#### Props Interface

```typescript
interface WaveformChartProps {
  seed: number;
  findings: number[];
  calloutValue: string;
}
```

### Call Site

The `WaveformChart` is rendered inside the hero card:

```tsx
<WaveformChart
  seed={TIME_RANGES.indexOf(timeRange) + 1}
  findings={trendData.map((d) => d.findings)}
  calloutValue="Illustrative"
/>
```

## Impact

The page now features a distinctive waveform visualization that aligns with the product's visual identity. The chart is fully self-contained (no external charting dependency for this component) and deterministic per time-range selection.
