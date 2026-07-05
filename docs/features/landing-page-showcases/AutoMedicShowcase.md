# AutoMedic Showcase Component

## Overview
The `AutoMedicShowcase` is a primary feature block on the ServX Landing Page. It visually demonstrates the automated self-healing capabilities of the ServX infrastructure through an engaging split-pane layout:
- **Left Pane (`AutoMedicScene`)**: A visually rich 3D / graphical representation of a system monitor actively scanning and resolving alerts.
- **Right Pane (`AutoMedicPipelineUI`)**: A step-by-step sequence of UI cards that light up to show the lifecycle of an automated incident response (Scan -> Detect -> Isolate -> Resolve).

## Architecture
The component is architected into three distinct files to separate concerns:
1. **`AutoMedicShowcase.tsx`**: The parent wrapper. Handles the main layout, typography, and responsive container structure.
2. **`AutoMedicScene.tsx`**: Contains the visual effects, 3D WebGL (if applicable), and floating ambient animations.
3. **`AutoMedicPipelineUI.tsx`**: Contains the state machine for the step-by-step execution pipeline.

## Animation Sequence (Framer Motion)
The UI relies heavily on `framer-motion` to orchestrate staggered appearances:
- The pipeline steps use an internal state machine (e.g., `activeStep` integer).
- As `activeStep` increments, `AnimatePresence` and `motion.div` transition the cards from a dimmed, inactive state into a brightly glowing active state, simulating a live data pipeline.
- The transitions use `ease: "easeInOut"` with tailored durations to match the reading speed of a user scrolling down the page.

## Performance & Memory Management
To guarantee a high frame rate and prevent React memory leaks, the following architectural rules are applied:
1. **Strict `useEffect` Cleanup**: The pipeline steps advance using `setTimeout` inside a `useEffect` hook. These timeouts are strictly assigned to variables (e.g., `let t1`, `let t2`) and cleared using `clearTimeout()` within the hook's return function. This prevents unmounted components from attempting to update React state if the user scrolls past the showcase quickly.
2. **Lazy Loading**: Any heavy assets or embedded 3D canvases inside the scene are wrapped with `framer-motion`'s `useInView` hook, ensuring they remain unmounted and consume zero GPU resources until they enter the user's viewport.
