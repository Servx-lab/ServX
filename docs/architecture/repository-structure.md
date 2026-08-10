# Repository structure

```
ServX/
├── apps/
│   ├── api/          # Express API (TypeScript + JS models)
│   ├── web/          # Vite React SPA
│   └── worker/       # Background worker
├── packages/
│   ├── cli/          # @servx/cli - Secure remote kill-switch CLI
│   ├── react/        # @servx/react - Protective SDK for client apps
│   ├── config/       # Shared configuration bundles
│   ├── crypto/       # Shared crypto helpers
│   ├── errors/       # AppError types + HTTP mapping
│   └── types/        # Shared TS types
├── supabase/         # Supabase Edge Functions and assets
├── scripts/          # Shared utility scripts
├── docs/             # This documentation tree
│   └── architecture/
│       └── microservices/  # Important: New microservices docs
├── package.json      # Workspace root scripts (dev, build, test)
└── package-lock.json
```

## Core Workspace Scripts

The repository leverages standard npm workspace scripts for local orchestration:

- **`npm run dev`**: Concurrently initializes both the API backend and the Web SPA development servers for full-stack local testing.
- **`npm run dev:api` / `npm run dev:web`**: Provisions a single application environment in isolation, minimizing resource overhead during targeted development.
- **`npm run build`**: Compiles the optimized production artifacts for the Vite SPA.

## Environment Configuration

Configuration is rigorously isolated per environment variable scopes:

- **Web Application (`apps/web`):** Relies exclusively on `VITE_` prefixed variables (e.g., `VITE_API_BASE_URL`). When omitted, requests gracefully fallback to the same-origin `/api` path, which is seamlessly proxied by the Vite development server.
- **API Backend (`apps/api/.env`):** Defines critical infrastructure secrets, including MongoDB connection URIs, Supabase credentials, Redis socket configurations, and OAuth provider tokens.
