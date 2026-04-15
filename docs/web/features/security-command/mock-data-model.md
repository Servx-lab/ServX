# Mock data model

**File:** `mockData.ts`

## Top-level exports

- `RepoId` — union: `\"zync\" | \"quizwhiz\"`
- `REPO_OPTIONS` — selector options and labels
- `AccessLevel` — `\"admin\" | \"write\" | \"read\"`
- `RepoSecurityData` — full schema used by page
- `MOCK_BY_REPO` — data map keyed by `RepoId`

## `RepoSecurityData` fields

- KPI counters:
  - `outdatedPackages`
  - `connectedDevices`
  - `gmailLastMonth`
  - `lastMonthChanges`
  - `activeDevelopers`
  - `cicdSuccess`
- Vulnerability stats:
  - `vulnerabilities` (absolute counts)
  - `vulnPct` (bar percentages)
- Critical access users list
- Network graph users list
- Insights list (3 cards)

## Update strategy

To add a new repository:

1. extend `RepoId`
2. append to `REPO_OPTIONS`
3. add entry in `MOCK_BY_REPO` with full `RepoSecurityData` shape
