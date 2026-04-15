# Bottom insights section

**File:** `InsightsSection.tsx`

## Purpose

Render detailed security findings in a bottom row of cards, matching the reference dashboard pattern.

## Structure

- Header with total insight count.
- Responsive grid of insight cards (`md:grid-cols-3`).
- Each card includes:
  - severity icon ring
  - title
  - two detailed lines
  - right chevron affordance

## Tone mapping

- `critical` → `Skull`, red styling
- `high` → `ShieldAlert`, orange styling
- `deploy` → `Wrench`, teal styling

## Animation

Each card animates in with a slight stagger using Framer Motion (`delay: i * 0.06`).
