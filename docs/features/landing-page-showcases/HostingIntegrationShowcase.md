# Hosting Integration Showcase Component

## Overview
The `HostingIntegrationShowcase` visually demonstrates ServX's seamless, one-click compatibility with major hosting providers like Vercel and Netlify. The showpiece of this component is a highly detailed, 3D WebGL cube that shatters and reassembles to represent code compilation and deployment.

## Architecture
The component (`HostingIntegrationShowcase.tsx`) is a split-pane layout:
- **UI Card (Left Pane)**: A mock interface showing a deployment pipeline connecting GitHub to Vercel/Netlify.
- **WebGL Canvas (Right Pane)**: Integrates an external `.splinecode` asset via `@splinetool/react-spline`. 

## Animation Sequence (Framer Motion & Spline)
- **UI Deployment Timeline**: The UI side uses `framer-motion` variants to trigger a 3-step deployment checklist (Building -> Optimizing -> Deployed).
- **Spline Event Triggering**: A `useEffect` hook listens to the UI's state machine. When the deployment reaches the "Optimizing" phase, the React component uses the Spline SDK (`splineRef.current.emitEvent()`) to trigger the cube's shatter animation directly inside the WebGL canvas.

## Performance & Memory Management
Because this component mounts a full WebGL context, performance is heavily constrained:
1. **WebGL Lazy Loading**: The `<Spline>` component is wrapped in a `framer-motion` `useInView` hook (`isSplineInView`). The heavy `.splinecode` file is only fetched and mounted into the canvas when the user scrolls within 200px of the component.
2. **Timeout Cleansing**: The deployment checklist relies on sequential `setTimeout` functions to progress. These are safely assigned to variables (e.g., `timer1`, `timer2`) and cleared on component unmount to prevent React state leaks.
