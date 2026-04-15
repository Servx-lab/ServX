# Web application (`apps/web`)

The dashboard is a **React 18** SPA built with **Vite**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui** (Radix primitives).

## Entry points

| File | Role |
|------|------|
| `src/main.tsx` | React root, StrictMode |
| `src/App.tsx` | `QueryClientProvider`, `BrowserRouter`, route table |
| `index.html` | HTML shell, loads `/src/main.tsx` |

## Major dependencies

- **react-router-dom** — routing
- **@tanstack/react-query** — server state / caching
- **firebase** — `getAuth()` for ID tokens sent to API
- **axios** — via `lib/apiClient.ts`

## Feature organization

- **`src/pages/`** — top-level route components that are thin or standalone (e.g. `Index`, `ProfileSettings`).
- **`src/features/<name>/`** — domain features (`admin`, `auth`, `databases`, `github`, `hosting`, `operations`, `emails`, `security-command`).
- **`src/components/`** — shared layout and UI (`DashboardLayout`, `Sidebar`, `ui/*`).

See [routing.md](./routing.md) for the full route map.

## Security command docs

- Page: [pages/exposure-analysis.md](./pages/exposure-analysis.md)
- Logic breakdown: [features/security-command/README.md](./features/security-command/README.md)
