# DEFCON Scene Component

## Overview
The `DefconScene` is a standalone, high-impact visual component on the landing page used to illustrate ServX's real-time threat detection and master kill-switch capabilities. It simulates a global threat map that rapidly escalates into a lockdown scenario.

## Architecture
Unlike the split-pane showcases, the DEFCON feature is primarily contained within a single intensive graphical file (`DefconScene.tsx`). It relies on SVG path manipulation and overlaid HTML elements to draw a mock command-and-control interface.

## Animation Sequence (Framer Motion)
- **Threat Escalation Simulation**: The component utilizes an internal state (e.g., `defconLevel` from 5 down to 1). 
- **Variants**: `framer-motion` variants are bound to the `defconLevel` state. As the state changes (driven by automated `setTimeout` loops), the color palette shifts dramatically (e.g., from calm blues at DEFCON 5 to aggressive flashing reds at DEFCON 1).
- **Alarm Micro-Interactions**: Features CSS-driven radial pulses and `motion.div` scaling to simulate alarm sirens and lockdown overlay UI panels.

## Performance & Memory Management
Because this component utilizes heavy SVG manipulation and rapid state updates:
1. **Loop Safety**: It uses `useEffect` to trigger the countdown. The timeout loops are safely bound to an `AbortController` or robust array-cleanup function to prevent the countdown from continuing if the user scrolls away.
2. **GPU Acceleration**: All scaling, opacity, and transform animations are offloaded to the GPU using `framer-motion`, preventing main-thread layout thrashing during the intense flashing sequences.
