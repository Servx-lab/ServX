# Top row info cards

**Files:** `PlatformSecurityCommandCenter.tsx`, `TopStatCard.tsx`, `CICDRing.tsx`

## Layout

- Grid: `grid-cols-2`, `md:grid-cols-3`, `lg:grid-cols-6`
- Exactly six cards in the first row.

## Cards

1. Outdated Packages
2. Connected Devices
3. Gmail (Last Month)
4. Last Month changes (commits/PRs)
5. Active Developers (30d)
6. CI/CD Success Rate (ring chart)

## `TopStatCard` logic

- Accepts icon, label, value, subtext, optional trend badge.
- Supports `children` override for custom value layout (used by CI/CD ring card).
- Glass card style: rounded, border, backdrop blur, subtle hover border accent.

## `CICDRing` logic

- SVG circle background + animated teal arc (`motion.circle`).
- Computes circumference and offset from `percentage`.
- Displays percentage text centered in ring.
