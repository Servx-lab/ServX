# GitHub Analytics Showcase Component

## Overview
The `GitHubAnalyticsShowcase` demonstrates the GitHub integration capabilities of ServX. It features an interactive UI simulation of binding a GitHub repository to the ServX Control Plane, accompanied by a dynamic WebGL 3D bulb element.

## Architecture
Contained entirely within `GitHubAnalyticsShowcase.tsx`, the component includes:
- **WebGL Interactive Bulb**: A 3D model managed by Spline, representing ideas or active connections.
- **Automated UI Flow**: A mock dashboard that physically animates a digital cursor moving, clicking buttons, and scrolling through a simulated GitHub repository connection flow.

## Animation Sequence (Framer Motion)
- **Cursor Automation**: A custom `moveAndClick` function leverages `framer-motion`'s `useAnimationControls` to precisely guide an SVG cursor across the screen to target `React.RefObject` elements.
- **Scroll Simulation**: The component utilizes animated `y` offsets on inner `motion.div` containers to simulate a user scrolling down a mock dashboard.
- **Infinite Loop**: The entire click-and-scroll sequence is bound to an async `while(mounted)` loop that continuously repeats the demonstration.

## Performance & Memory Management
Due to the continuous nature of the async animation loop and the heavy WebGL canvas, the following protections are in place:
1. **Sleep Promise Tracking**: All `setTimeout` delays within the async `runSequence` are abstracted into a `sleep(ms)` function. These promises push their internal timeout IDs into a `timeouts` array.
2. **Hard Component Unmount**: If the user navigates away, the `useEffect` cleanup function instantly sets `mounted = false` (breaking the `while` loop) and iterates over the `timeouts` array with `clearTimeout`, preventing the cursor or scroll controls from attempting to update an unmounted DOM.
3. **Spline Lazy Loading**: The 3D bulb canvas is wrapped with a `splineContainerRef` and `useInView` hook, enforcing strict lazy-loading to preserve GPU memory when off-screen.
