# Database Showcase Component

## Overview
The `DatabaseShowcase` acts as a highly visual feature block on the landing page demonstrating ServX's robust database clustering, replication, and failover mechanics. Like the AutoMedic block, it uses a split-pane layout to convey both abstract architecture and a concrete sequence of events.

## Architecture
The functionality is distributed across three files:
1. **`DatabaseShowcase.tsx`**: The main container that mounts the scene and the pipeline, managing responsive grid layouts (stacking on mobile, side-by-side on desktop).
2. **`DatabaseScene.tsx`**: Renders a floating, isometric 3D-like cluster of databases. It highlights active nodes, sync pathways, and simulated failover nodes.
3. **`DatabasePipelineUI.tsx`**: A sequential list of event cards (e.g., Syncing, Replicating, Failover Triggered) that step through an automated database recovery scenario.

## Animation Sequence (Framer Motion)
- **Staggered Progression**: The `DatabasePipelineUI` relies heavily on an array of `setTimeout` loops to step a state variable from `0` to `N`, progressing the UI through the failover narrative.
- **Node Highlighting**: The `DatabaseScene` uses `framer-motion` variants to pulse the opacity and colors of the database SVGs/Nodes, creating a visual "data flow" effect across the cluster lines.

## Performance & Memory Management
Given the high number of animated nodes and sequential timers, memory management is highly prioritized here:
1. **Array Timeout Tracking**: In the pipeline component, all `setTimeout` integers are pushed into a dedicated tracking array during the `useEffect` hook.
2. **Bulk Cleanup**: When the component unmounts (e.g., navigating to another page), the `return () => { ... }` block iterates over the entire timeout array and runs `clearTimeout()`, guaranteeing no orphaned state updates trigger React warnings.
3. **Viewport Deferred Rendering**: The intense floating animations of the `DatabaseScene` are strictly bound to a `useInView` ref. The animations pause or completely defer rendering when scrolled out of the active window frame, preserving battery and CPU cycles.
