# Global Operations Showcase Component

## Overview
The `GlobalOpsShowcase` acts as a panoramic visual representation of ServX's distributed edge network and cross-region load balancing. It typically sits near the top of the landing page, illustrating geographic redundancy and low-latency packet routing across a stylized world map.

## Architecture
The component is heavily self-contained in `GlobalOpsShowcase.tsx`:
- **Map Layer**: A complex SVG or canvas layer illustrating geographic nodes (e.g., US-East, EU-West, AP-South).
- **Pulse Layer**: An overlay that handles the animated data packets (lines/dots) transferring between the nodes.
- **Data UI**: Small floating tooltip cards displaying mocked latency metrics (e.g., `12ms`, `Healthy`).

## Animation Sequence (Framer Motion)
- **Path Tracing**: `framer-motion`'s `pathLength` and `strokeDashoffset` properties are used to draw the network lines dynamically between cities.
- **Looping Orchestration**: The sequence loops infinitely. A `useEffect` hook orchestrates a complex `sleep()` sequence to fire node-to-node packets in a specific, timed choreography.

## Performance & Memory Management
Because this component contains an infinite orchestration loop that runs continuously:
1. **AbortController Architecture**: Rather than simple `clearTimeout`, the sequence is wrapped in an `AbortController`. The internal `sleep()` helper strictly checks `signal.aborted` during its interval polls.
2. **IntersectionObserver Pause**: The component utilizes an `IntersectionObserver` via a React `useRef` to completely halt the orchestration loop when the map scrolls out of view. The `sleep` function will pause its internal timer accumulation until the map is visible again, saving CPU cycles on a background tab.
