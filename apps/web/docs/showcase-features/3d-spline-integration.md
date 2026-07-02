# 3D Spline Integration

## Overview
The Hosting Integration Showcase utilizes a 3D animated canvas built with Spline and integrated using the @splinetool/react-spline library.

## Tech Stack
- **Spline**: 3D design and physics engine
- **@splinetool/react-spline**: React wrapper for the Spline runtime
- **three.js**: Underlying WebGL renderer utilized by the Spline runtime

## Key Features

### 1. The .splinecode Format
The showcase loads an optimized, binary .splinecode export (not a project file). This is essential because the Spline React runtime strictly requires the compiled format to function without crashing.

### 2. Synthetic Physics Events
To orchestrate 3D animations directly from React code without needing the user to interact with the canvas, we simulate manual input. The Spline scene is configured to 'shatter' and 'reassemble' on the 'a' keypress.

We trigger this by dispatching synthetic DOM events to the underlying canvas element:
\\\	ypescript
const canvas = document.querySelector('canvas');
const eventParams = { key: 'a', code: 'KeyA', keyCode: 65, which: 65, bubbles: true };
canvas.dispatchEvent(new KeyboardEvent('keydown', eventParams));
canvas.dispatchEvent(new KeyboardEvent('keyup', eventParams));
\\\`n
### 3. State Syncing & Re-Shattering
The Spline component listens to the lowState state machine in the parent component. When the mock connection is successful (isConnected), it triggers the reassemble event. When the UI animation loop resets back to idle, it detects the reset and fires the synthetic keypress again to re-shatter the cube seamlessly.
