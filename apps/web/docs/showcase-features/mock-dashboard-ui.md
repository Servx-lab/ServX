# Mock Dashboard UI

## Overview
The showcase features a highly realistic, pixel-perfect mock dashboard designed to mirror a modern cloud hosting environment like Render or Vercel. 

## Tech Stack
- **Tailwind CSS**: For all styling, layout, typography, and theme definitions.
- **recharts**: Used for rendering lightweight mock SVGs of AreaCharts and BarCharts in the connected state.
- **lucide-react**: Extensive icon library utilized to add visual polish to the mock interfaces.

## Key Features

### 1. Complex Layout Construction
The UI is built within a strict parent grid column structure, dividing the mock UI from the 3D Spline canvas. Absolute positioning and nested overflow containers allow for smooth inner scrolling animations without breaking the parent bounds.

### 2. Realistic Data Mocks
To ensure the dashboard looks authentic, custom arrays of mock objects were designed. Instead of mapping a single dummy element, the UI renders 8 entirely unique microservices complete with varying Git commit messages, specific timestamps, and contextual icons (e.g., spinning sync rings vs. green checkmarks).

### 3. Dark / Light Theming Contrast
The showcase dynamically utilizes Tailwind's robust color palette to create stark contrasts between the inner modal windows (dark mode #0e0e11 backgrounds) and the connected dashboard panel (clean, white dashboard logic). This heavily elevates the premium feel of the integration animation.
