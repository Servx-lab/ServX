# ServX Design System & UI Guidelines
> Last updated: July 2026 · Based on full codebase audit + 2026 enterprise SaaS UI research

---

## The Problem In One Sentence

ServX has a stunning outer shell — the dark rounded frame in `DashboardLayout` is genuinely premium — but every page inside it was built independently, producing a fragmented experience that feels like 6 different products stitched together.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Component Patterns](#5-component-patterns)
6. [Navigation & Shell](#6-navigation--shell)
7. [Page-by-Page Redesign Brief](#7-page-by-page-redesign-brief)
8. [What to Kill](#8-what-to-kill)
9. [What to Keep](#9-what-to-keep)
10. [Implementation Priority](#10-implementation-priority)

---

## 1. Design Philosophy

### Core Identity
ServX is a **developer-first security intelligence platform**. The UI should feel like a tool built by engineers who respect other engineers — not a marketing site pretending to be a dashboard.

### Three Design Principles

**1. Calm Density**
Information should be rich but not overwhelming. The goal is maximum signal at minimum visual noise. Reserve visual emphasis (color, weight, size) for things that genuinely need attention. Use whitespace intentionally, not decoratively.

**2. One Dark World**
The outer shell is already dark. The content inside should be dark too. The current pattern of a black frame around a white page is jarring and arbitrary. Pick a side: full dark. This also aligns with how every premium developer tool in 2026 works (Linear, Vercel, Wiz, Datadog).

**3. Progressive Disclosure**
Show the summary. Reveal the detail on demand. No page should require scrolling past the viewport to reach critical information. Drawers, panels, and tabs exist for this reason.

### What ServX Should Feel Like
- **Linear** — for its quiet confidence, monochrome discipline, and keyboard-first shortcuts
- **Wiz** — for its attack path graph intelligence and security-first hierarchy
- **Vercel** — for its Geist typography, metric card precision, and deployment telemetry patterns
- **Not** — a colorful BI dashboard, a marketing landing page, or a Bootstrap admin template

---

## 2. Color System

### The Problem (Current State)

The codebase has three competing primary accent colors and two broken Tailwind token mappings:

| Token | Config Value | Actual Usage | Verdict |
|---|---|---|---|
| `orizons.teal` | `#3B82F6` (BLUE!) | Pages use `#00C2CB` as teal | Broken |
| `orizons.purple` | `#EF4444` (RED!) | Pages use `#6C63FF` as purple | Broken |
| Primary accent | Three values: `#008E9A`, `#00C2CB`, `#00A5AD` | Shifts per page | Fragmented |

### The Fix: 3-Tier Token Architecture

#### Primitive Tier (Raw Values — never used directly in components)

```css
/* Dark Surfaces */
--primitive-void:      #040406;   /* outermost shell / page bg */
--primitive-base:      #08090a;   /* primary surface */
--primitive-elevated:  #121316;   /* cards, panels */
--primitive-overlay:   #1c1d21;   /* popovers, modals */
--primitive-hover:     #26282f;   /* hover states */

/* Text */
--primitive-white:     #f7f8f8;
--primitive-slate-400: #8b8f9a;

/* Brand Accent — Teal (one accent only) */
--primitive-teal-600:  #007a84;   /* pressed state */
--primitive-teal-500:  #008e9a;   /* primary actions */
--primitive-teal-400:  #00a5b0;   /* hover state */

/* Status Colors */
--primitive-red-500:   #e5383b;   /* critical */
--primitive-amber-500: #f59e0b;   /* warning / medium severity */
--primitive-green-500: #10b981;   /* success / healthy */
--primitive-blue-500:  #3b82f6;   /* informational */
--primitive-purple-500:#6c63ff;   /* AI / AutoMedic features */
```

#### Semantic Tier (Used in Tailwind config and CSS variables)

```css
--bg-page:         #040406;
--bg-surface:      #08090a;
--bg-card:         #121316;
--bg-popover:      #1c1d21;
--bg-hover:        #26282f;

--text-primary:    #f7f8f8;
--text-secondary:  rgba(247,248,248,0.65);
--text-muted:      rgba(247,248,248,0.35);
--text-disabled:   rgba(247,248,248,0.20);

--border-hairline: rgba(255,255,255,0.07);
--border-default:  rgba(255,255,255,0.12);
--border-strong:   rgba(255,255,255,0.20);

--accent:          #008e9a;
--accent-hover:    #00a5b0;
--accent-muted:    rgba(0,142,154,0.12);

--status-critical: #e5383b;
--status-warning:  #f59e0b;
--status-success:  #10b981;
--status-info:     #3b82f6;
```

#### Usage Quick Reference

| Use case | Token | Hex |
|---|---|---|
| Page background | `--bg-page` | `#040406` |
| Card / panel background | `--bg-card` | `#121316` |
| Modal / popover background | `--bg-popover` | `#1c1d21` |
| Row hover | `--bg-hover` | `#26282f` |
| Primary text | `--text-primary` | `#f7f8f8` |
| Labels, secondary text | `--text-secondary` | `rgba(247,248,248,0.65)` |
| Timestamps, meta | `--text-muted` | `rgba(247,248,248,0.35)` |
| Card border | `--border-hairline` | `rgba(255,255,255,0.07)` |
| Primary action / focus ring | `--accent` | `#008e9a` |
| Critical severity | `--status-critical` | `#e5383b` |
| Warning / medium | `--status-warning` | `#f59e0b` |
| Healthy / success | `--status-success` | `#10b981` |
| AI / AutoMedic | purple | `#6c63ff` |

### Severity Badge System

| Severity | Background | Text | Border |
|---|---|---|---|
| Critical | `rgba(229,56,59,0.12)` | `#f87171` | `rgba(229,56,59,0.25)` |
| High | `rgba(245,158,11,0.12)` | `#fbbf24` | `rgba(245,158,11,0.25)` |
| Medium | `rgba(245,158,11,0.08)` | `#f59e0b` | `rgba(245,158,11,0.15)` |
| Low | `rgba(16,185,129,0.10)` | `#34d399` | `rgba(16,185,129,0.20)` |
| Info | `rgba(0,142,154,0.10)` | `#00a5b0` | `rgba(0,142,154,0.20)` |

---

## 3. Typography

### Font Stack

```
UI Font:   Inter — all navigation, labels, body, headings
Data Font: Geist Mono — IDs, hashes, IP addresses, file paths, metrics, timestamps
```

### Type Scale

| Role | Font | Size | Weight | Line-Height | Tracking | Usage |
|---|---|---|---|---|---|---|
| `display` | Inter | 32px | 600 | 36px | -0.04em | KPI numbers, hero metrics |
| `title-lg` | Inter | 20px | 600 | 28px | -0.025em | Page titles, modal headers |
| `title` | Inter | 15px | 600 | 22px | -0.015em | Card titles, section headers |
| `title-sm` | Inter | 13px | 500 | 18px | -0.01em | Panel group labels |
| `body` | Inter | 13px | 400 | 18px | 0 | Primary content, table rows |
| `body-sm` | Inter | 12px | 400 | 16px | 0 | Descriptions, secondary text |
| `caption` | Inter | 11px | 500 | 14px | +0.04em | Overline labels, ALL CAPS sections |
| `code` | Geist Mono | 12px | 400 | 16px | 0 | File paths, hashes, versions |
| `code-sm` | Geist Mono | 11px | 400 | 14px | 0 | Inline code, terminal output |

### Rules

- Never use `font-black` (900) for UI labels — reserve for decorative KPI numbers only
- Section overline labels: `11px / 500 / +0.04em` ALL CAPS, color `--text-muted`
- File paths, IDs, IP addresses: always Geist Mono, never Inter
- Page titles: `title-lg`, never bigger than 20px inside dashboard views
- Use `tabular-nums` on all metric displays

---

## 4. Spacing & Layout

### Spacing Scale (8px base grid, multiples of 4px)

```
4px   — micro (icon-label gaps, badge padding)
8px   — tight (compact list items)
12px  — small (inner card padding top/bottom)
16px  — base (standard card padding, section gaps)
24px  — large (between card groups)
32px  — section (major sections on a page)
48px  — xlarge (page-level outer padding)
```

### Border Radius — 3 Values Only

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Badges, tags, pill buttons, code spans |
| `--radius-md` | 10px | Buttons, input fields, small cards |
| `--radius-lg` | 14px | Standard cards, panels, drawers |
| `--radius-xl` | 20px | Major content panels |

> 32px (`rounded-[2rem]`) is ONLY for the outer DashboardLayout shell frame. Never use 40px inside page content.

### Page Layout Architecture

```
┌──────────────────────────────────────────────┐
│  Page Header (48px)                           │
│  Title + Subtitle breadcrumb    Action buttons│
├──────────────────────────────────────────────┤
│  Context / Filter Bar (40px — optional)       │
│  Tabs · Dropdowns · Search · Status badges    │
├───────────────────────────┬──────────────────┤
│  Primary Content          │  Side Panel       │
│  (flex-1, scrolls inside) │  (fixed width,   │
│                           │   optional)       │
└───────────────────────────┴──────────────────┘
```

- Full-width pages: `px-6 py-4` inner padding
- Master-detail split: 45% / 55% — avoid fixed pixel widths
- Side panel: max `w-80` (320px)
- Never use `min-h-[500px]` or `h-[400px]` for content with variable data

---

## 5. Component Patterns

### Cards
```
Background:  --bg-card (#121316)
Border:      1px solid --border-hairline (rgba(255,255,255,0.07))
Radius:      --radius-lg (14px)
Padding:     16px body / 12px compact
Shadow:      none — use background elevation for depth
```

### Buttons
```
Primary:     bg-accent text-white rounded-[10px] px-4 py-2 text-sm font-medium
             hover: bg-accent-hover | focus: ring-2 ring-accent/50

Secondary:   bg-bg-hover text-primary border border-hairline rounded-[10px]
Ghost:       transparent text-secondary hover:bg-bg-hover
Destructive: bg-status-critical/10 text-red-400 border border-red-500/20
```

### Badges / Status Pills
```
Severity pills: font-mono, 10px, 500 weight, tracking +0.06em
ID tags:        font-mono, 11px, bg-bg-hover border border-hairline
Status dots:    6px circle, color = status token
Live indicator: 6px pulsing dot (animate-pulse) + "Live" label
```

### Tables / Lists
```
Row height:    40px compact / 48px standard
Row hover:     bg-bg-hover
Selected row:  bg-accent-muted + left border 2px solid accent
Header:        11px ALL CAPS text-muted, border-b border-hairline
Dividers:      border-b border-hairline (NOT between every row)
```

### Drawers
```
Width:     400px fixed
Bg:        --bg-card
Border-L:  1px solid --border-hairline
Header:    16px padding, title + close button
Tabs:      3 max inside drawer header
Body:      overflow-y-auto 16px padding
Footer:    sticky action buttons
```

---

## 6. Navigation & Shell

### Keep the Shell — Fix the Inside

The `DashboardLayout` outer shell (black → zinc-950 → rounded inner panel) is ServX's signature design element. Do not remove it. The fix is making the inner pages match it.

### Sidebar
```
Width:           56px icon-only → 208px on hover/pin
Background:      #040406
Border-right:    1px solid rgba(255,255,255,0.07)

Nav item inactive: height 36px, px-3, icon 16px text-muted, label 13px text-secondary
                   hover: bg-bg-hover
Nav item active:   icon text-accent, label 500 weight text-primary
                   bg: bg-accent-muted, left border: 2px solid accent
Section labels:    10px ALL CAPS text-muted, px-3, mt-4
```

Remove the current `pill-active` pattern (`bg-white/5 border border-white/20`) — replace with accent-muted + left border.

### Page Header (Every page)
```
Height:    48px
Layout:    flex items-center justify-between px-6
Title:     15px / 600 / text-primary
Subtitle:  12px / text-muted (e.g. "Dashboard › Exposure Analysis")
Actions:   right side, max 2 buttons + 1 dropdown
Divider:   border-b border-hairline
```

---

## 7. Page-by-Page Redesign Brief

### 7.1 Dashboard (Exposure Command Center)
**Issues:** Fixed 600px SVG canvas, light gray background, hard-coded 300px metric column.  
**Target:**
- Dark background `--bg-page`
- Top row: 3-4 metric KPI cards with mini sparklines
- Main panel: Full-width dark-themed flow visualization
- Bottom: Live asset exposure table

### 7.2 Exposure Analysis
**Issues:** `bg-[#F1F1F1]`, `rounded-[40px]` on threat matrix, `#00C2CB` accent conflicts.  
**Target:**
- Dark background, standard `--radius-lg` on all cards
- Unify all teal/cyan to `#008e9a`
- Threat matrix: dark card with hairline grid lines
- Anomaly sidebar: proper dark drawer

### 7.3 Data Governance & Incident Center
**Issues:** White + dark panels mixed chaotically, inconsistent radius, disconnected sections.  
**Target:**
- Full dark — match the terminal section aesthetic everywhere
- Blast radius graph: dark canvas, colored nodes
- Device table: dark rows, status dots
- Standardize to `--radius-lg` (14px) on all cards

### 7.4 Attack Paths (Priority 1)
**Issues:** Fully isolated design system (`#F4F8F9`, `#17262D`), finding cards too verbose, prose-heavy drawer, jarring contrast vs rest of app.

**Target layout:**

```
Top Bar (48px):
  Title + scan lifecycle badge | Repo selector | Quota | Scan button

Left Panel (42%):
  Filter bar: severity tabs + search input + group toggle
  Findings list (40px rows):
    ● severity dot  Rule title (truncated 1 line)
                    file/path.ts:24 (Geist Mono 11px muted)
                    [SAST] [HIGH]

Right Panel (58%):
  Empty: "Select a finding to inspect"
  Selected:
    Header: rule title + severity badge + copy
    Tabs: Evidence | Attack Routes | Remediation
    Evidence: file location + code block
    Routes: node chain visualization
    Remediation: fix text + code block + docs link

Footer (32px):
  gitleaks · semgrep · trivy · syft | 5m 15s | 1 attempt
```

Color change: Remove `#F4F8F9`, `#17262D`, `#53656D`. Use dark token system throughout.

### 7.5 AutoMedic Pipeline
**Issues:** Page too long, vertical steps.  
**Target:** Dark bg, horizontal timeline, purple as AutoMedic-specific accent (AI = purple is correct).

---

## 8. What to Kill

| Pattern | Location | Replace With |
|---|---|---|
| `rounded-[40px]` | ExposureAnalysis | `rounded-xl` (14px) |
| `bg-[#F1F1F1]`, `bg-[#F4F8F9]`, `bg-white` cards | All pages | `--bg-page` / `--bg-card` |
| `text-3xl font-black` page titles | PageLayout | 20px / 600 title |
| `.cyber-glow-blue`, `.cyber-glow-red` | CSS globals | Focus ring `ring-2 ring-accent/50` |
| `bg-white/5 border border-white/20` active nav | Sidebar | accent-muted + left border |
| `#00C2CB` as primary accent | ExposureAnalysis, AutoMedic | `#008e9a` |
| `min-h-[500px]`, `h-[400px]` fixed heights | Multiple pages | `flex-1 min-h-0` |
| `shadow-xl`, `shadow-2xl` on content cards | Multiple pages | None (use bg elevation) |
| `tracking-[0.2em]` on section labels | ExposureAnalysis | `tracking-[0.06em]` |
| `text-black` on dashboard pages | PageLayout | `--text-primary` |
| `orizons.teal: #3B82F6` in Tailwind config | tailwind.config.ts | `#008e9a` |
| `orizons.purple: #EF4444` in Tailwind config | tailwind.config.ts | `#6c63ff` |

---

## 9. What to Keep

| Pattern | Location | Why It Works |
|---|---|---|
| Dark rounded shell frame | `DashboardLayout.tsx` | ServX's signature element |
| 7-stage scan stepper | `AttackPath.tsx` | Clear real-time scan feedback |
| Terminal log feed aesthetic | `DataGovernance.tsx` | Authentic SOC tool feel |
| ReactFlow blast radius canvas | `DataGovernance.tsx` | Compelling visualization |
| Geist Mono on file paths & IDs | `AttackPath.tsx` | Correct developer tool pattern |
| Compact severity pills | `AttackPath.tsx` | Work well, just need dark theme |
| Collapsible scan ribbon | `AttackPath.tsx` | Good progressive disclosure |
| Master-detail split layout | `AttackPath.tsx` | Right architecture, needs polish |
| Searchable repo selector | `AttackPath.tsx` | Developer-friendly |

---

## 10. Implementation Priority

### Phase 1 — Design System Foundation
1. Fix `tailwind.config.ts` — correct broken token mappings
2. Update `index.css` — add 3-tier token system, set dark as default for dashboard
3. Update `DashboardLayout.tsx` — inner `bg-background` → `bg-[--bg-page]`

### Phase 2 — Attack Paths (Most Visible Problem)
4. Rewrite `AttackPath.tsx` to use dark tokens
5. Compact finding rows (1-line title, 1-line path)
6. Detail drawer: structured data blocks, not prose
7. Attack routes: visual node chain, not text list

### Phase 3 — Remaining Pages
8. `ExposureAnalysis.tsx` — dark theme, unify accent
9. `DataGovernance.tsx` — dark card unification, fix radius
10. `Index.tsx` (Dashboard) — dark SVG canvas
11. `Sidebar.tsx` — new active state pattern

### Phase 4 — Polish
12. Add `Cmd+K` command palette
13. Shared page header component
14. Keyboard navigation in data tables
15. Audit and remove all fixed height values

---

## Appendix: Quick Reference

```
Backgrounds:
  Page:    #040406   Card:    #121316
  Overlay: #1c1d21   Hover:   #26282f

Text:
  Primary:   #f7f8f8
  Secondary: rgba(247,248,248,0.65)
  Muted:     rgba(247,248,248,0.35)

Borders:
  Hairline:  rgba(255,255,255,0.07)
  Default:   rgba(255,255,255,0.12)

Accent (one accent only):
  Primary:   #008e9a   Hover:  #00a5b0
  Muted bg:  rgba(0,142,154,0.10)

Status:
  Critical: #e5383b   Warning: #f59e0b
  Success:  #10b981   AI:      #6c63ff

Fonts:
  UI:   Inter   Data: Geist Mono

Radius (3 values only):
  6px (badge)   10px (button/input)   14px (card)   32px (shell only)

Spacing grid: 4 / 8 / 12 / 16 / 24 / 32 / 48px
```
