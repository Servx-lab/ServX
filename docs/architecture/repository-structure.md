# Repository structure

```
ServX/
├── apps/
│   ├── api/          # Express API (TypeScript + JS models)
│   ├── web/          # Vite React SPA
│   └── worker/       # Background worker
├── packages/
│   ├── crypto/       # Shared crypto helpers
│   ├── errors/       # AppError types + HTTP mapping
│   └── types/        # Shared TS types
├── docs/             # This documentation tree
├── package.json      # Workspace root scripts (dev, build, test)
└── package-lock.json
```

## Root scripts (typical)

- `npm run dev` — runs API and web together (`concurrently`).
- `npm run dev:api` / `npm run dev:web` — single app.
- `npm run build` — production build of the web app.

## Environment

- **Web:** `apps/web` uses `VITE_*` variables (e.g. `VITE_API_BASE_URL` or empty for same-origin `/api` behind Vite proxy).
- **API:** `apps/api/.env` — Mongo URI, Firebase admin credentials, Redis URL, OAuth secrets, etc.
