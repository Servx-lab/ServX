# Log: Restoring Dashboard Animations
**Date:** 2026-05-02

## Objective
Bring back the "graph animations" and premium feel of the dashboard transition while maintaining the speed benefits of the local cache.

## Actions Taken
1.  **Dashboard Entry Animations**:
    *   Added `animate-in fade-in slide-in-from-bottom-2 duration-500` to the `ConnectedDashboard` container.
2.  **Chart Re-animation Keys**:
    *   Added unique `key` props to `AreaChart`, `BarChart`, and `Pie` components in `HostingCharts`.
    *   These keys are derived from data length and content, forcing Recharts to perform entry animations whenever the provider or data changes.
3.  **Skeleton Transition**:
    *   Implemented a `MIN_LOADING_MS` (500ms) transition period.
    *   If cached data is available, a **Skeleton Dashboard** is displayed briefly instead of a full-screen spinner.
    *   This provides a smooth visual bridge that triggers the dashboard's reveal animations.

## Results
*   Transitions feel "premium" and intentional again.
*   Graphs and stats now animate smoothly into view when switching between Vercel and Render.
*   The "blink" of the previous instant-load has been replaced by a polished transition.
