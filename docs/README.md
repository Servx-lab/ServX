# ServX documentation

This folder contains structured documentation for the ServX monorepo: the **web** dashboard (`apps/web`), the **API** (`apps/api`), **shared packages** (`packages/*`), and the optional **worker** (`apps/worker`).

## Quick map

| Area | Path | Description |
|------|------|-------------|
| Architecture | [architecture/overview.md](./architecture/overview.md), [repository-structure.md](./architecture/repository-structure.md) | System shape and repo layout |
| Web app | [web/README.md](./web/README.md) | React SPA, routes, features |
| REST API | [api/README.md](./api/README.md) | Express routes by domain |
| Packages | [packages/types.md](./packages/types.md) | Shared types, errors, crypto |
| Worker | [worker/overview.md](./worker/overview.md) | Background jobs |
| Concepts | [concepts/team-access-and-granular-permissions.md](./concepts/team-access-and-granular-permissions.md) | Team & access model |

## Web documentation index

- [Routing](./web/routing.md) — all routes and layouts
- [Layout shell](./web/layout-shell.md) — `DashboardLayout`, sidebar
- [Shared UI](./web/shared-components.md) — `apiClient`, `ProfilePhoto`, etc.
- [SecurityInfo](./web/components/security-info.md) — sidebar device/security widget
- [Firebase client](./web/lib/firebase-client.md) — web SDK init
- **Auth:** [overview](./web/auth/README.md), [AuthContext](./web/auth/auth-context.md), [RequireAuth](./web/auth/require-auth.md), [Landing](./web/auth/landing.md), [Auth page](./web/auth/auth-page.md), [Bridge](./web/auth/bridge.md), [Onboarding](./web/auth/onboarding.md)
- **Pages:** [Dashboard](./web/pages/dashboard.md), [Databases](./web/pages/databases.md), [GitHub](./web/pages/github.md), [Hosting](./web/pages/hosting.md), [Auto Medic](./web/pages/auto-medic.md), [Operations](./web/pages/operations.md), [Administration](./web/pages/administration-team-access.md), [Attack paths](./web/pages/attack-paths.md), [Exposure analysis](./web/pages/exposure-analysis.md), [Coming soon](./web/pages/coming-soon.md), [Emails](./web/pages/emails.md), [Profile settings](./web/pages/profile-settings.md), [Infrastructure settings](./web/pages/infrastructure-settings.md), [Privacy](./web/pages/legal-privacy.md), [Terms](./web/pages/legal-terms.md), [Not found](./web/pages/not-found.md)
- **Exposure logic docs:** [index](./web/features/security-command/README.md), [data flow](./web/features/security-command/repository-selector-and-data-flow.md), [top cards](./web/features/security-command/top-row-info-cards.md), [network graph](./web/features/security-command/repo-access-network-graph.md), [summary panel](./web/features/security-command/repo-security-profile-panel.md), [insights](./web/features/security-command/bottom-insights-section.md)

## API documentation index

- [Middleware and errors](./api/middleware-and-errors.md)
- [Auth & sync](./api/domain-auth.md)
- [GitHub](./api/domain-github.md)
- [Databases / DB explorer](./api/domain-databases.md)
- [Connections & hosting integrations](./api/domain-connections.md)
- [Hosting OAuth (Vercel, DO, Railway)](./api/domain-hosting-oauth.md)
- [Gmail](./api/domain-gmail.md)
- [Operations & tasks](./api/domain-operations.md)
- [Admin](./api/domain-admin.md)
- [Users search](./api/domain-users.md)
- [Profile](./api/domain-profile.md)

## Existing docs

- [servx-migration-copilot-playbook.md](./servx-migration-copilot-playbook.md) — migration playbook (legacy location; kept as-is)
