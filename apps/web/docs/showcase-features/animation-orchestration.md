# Animation Orchestration

## Overview
The showcase relies on an intricate, highly-controlled sequence of animations to simulate user behavior. This requires complex state management and precisely timed asynchronous events.

## Tech Stack
- **framer-motion**: Used for physical DOM animations, cursor interpolation, and view-state transitions.
- **React Hooks**: useRef, useEffect, useState for state machine management.
- **IntersectionObserver**: For viewport visibility tracking.

## Key Features

### 1. The State Machine
The entire UI operates based on a single lowState variable. The view logic (iewState) derives directly from this string. This allows <AnimatePresence> to mount and unmount different 'pages' of the mock dashboard seamlessly while preserving exit animations.

### 2. Pause/Resume Async Loop
Instead of relying on standard setTimeout (which cannot be paused natively), the animation sequence is driven by a custom sleep function powered by equestAnimationFrame.

When the IntersectionObserver detects the component has scrolled out of view, it toggles an isPausedRef boolean. The custom sleep function detects this and freezes its internal timer, completely halting the mock cursor and sequence until the section is scrolled back into view. This ensures the animation doesn't invisibly run in the background or reset abruptly.

### 3. Cursor Coordinate Interpolation
The mock cursor utilizes useAnimationControls from Framer Motion. By grabbing the raw bounding rects of target buttons via getBoundingClientRect(), it can accurately interpolate its position across the screen and simulate a physical click with a quick scale-down animation.
