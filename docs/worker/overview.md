# Worker (`apps/worker`)

Optional **Node** worker for background work (separate from the API process).

## Entry

**`src/index.ts`** — schedules or runs jobs.

## Jobs (`src/jobs/`)

| Job | Purpose |
|-----|---------|
| `seedCache.ts` | Seed/cache warming |
| `generateExpertCache.ts` | Generate expert/cache artifacts (product-specific) |

Run via root script `npm run dev:worker` / workspace `servx-worker` package.json.
