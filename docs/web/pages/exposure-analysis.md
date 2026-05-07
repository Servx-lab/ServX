# Exposure analysis

**Route:** `/exposure`  
**Page file:** `apps/web/src/pages/ExposureAnalysis.tsx`  
**Feature root:** `apps/web/src/features/security-command/`

This page is the full-screen **Platform Security Command Center** and intentionally renders **outside** `DashboardLayout` (no app sidebar/navbar shell).

## Core characteristics

- Dark glassmorphic command-center look with palette:
  - background `#0B0E14`
  - cards `#181C25`
  - text `#FFFFFF`
  - accent teal `#00C2CB`
- Single repository selector that drives all widgets on page.
- Three main horizontal bands:
  1. 6 top KPI cards
  2. Main graph + right summary panel
  3. Bottom insights list cards

## Detailed logic docs

- [Feature index](../features/security-command/README.md)
- [Repository selector and data flow](../features/security-command/repository-selector-and-data-flow.md)
- [Top row cards](../features/security-command/top-row-info-cards.md)
- [Repository access network graph](../features/security-command/repo-access-network-graph.md)
- [Security profile panel](../features/security-command/repo-security-profile-panel.md)
- [Bottom insights section](../features/security-command/bottom-insights-section.md)
- [Mock data model](../features/security-command/mock-data-model.md)
