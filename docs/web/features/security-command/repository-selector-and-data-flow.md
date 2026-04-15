# Repository selector and data flow

**Primary file:** `PlatformSecurityCommandCenter.tsx`

## State model

- `repoId` (type `RepoId`) is local React state.
- Current page data is resolved with: `const data = MOCK_BY_REPO[repoId]`.
- Display label is derived from `REPO_OPTIONS`.

## Selector behavior

- Uses Radix/shadcn `Select`:
  - `SelectTrigger`
  - `SelectContent`
  - `SelectItem`
- Options are preloaded from `REPO_OPTIONS`:
  - `zync` → `Zync Repo`
  - `quizwhiz` → `QuizWhiz Repo`

## Propagation path

When `repoId` changes, all below update in same render pass:

1. **Top cards** values (`TopStatCard`, `CICDRing`)
2. **Graph** (`RepoAccessNetwork`) users/access edges
3. **Right summary panel** (`SecurityProfilePanel`)
4. **Bottom findings** (`InsightsSection`)

No server fetch is required for this mock implementation; everything is deterministic from `mockData.ts`.
