# Security Command feature docs

Feature path: `apps/web/src/features/security-command/`

This folder documents each logic block used by the `/exposure` page.

## Files and responsibilities

- `PlatformSecurityCommandCenter.tsx` — page composition + grid layout
- `mockData.ts` — repository keyed data and types
- `TopStatCard.tsx` — top-row stat card primitive
- `CICDRing.tsx` — ring chart for CI/CD success
- `networkGraph.tsx` — React Flow repo/user network graph
- `SecurityProfilePanel.tsx` — right side vulnerability + critical users panel
- `InsightsSection.tsx` — bottom detailed findings cards

## Logic breakdown docs

- [Repository selector and data flow](./repository-selector-and-data-flow.md)
- [Top row info cards](./top-row-info-cards.md)
- [Repository access network graph](./repo-access-network-graph.md)
- [Repo security profile panel](./repo-security-profile-panel.md)
- [Bottom insights section](./bottom-insights-section.md)
- [Mock data model](./mock-data-model.md)
