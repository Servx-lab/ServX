# Routing

Source of truth: `apps/web/src/App.tsx`.

## Public routes

| Path | Component | Notes |
|------|-------------|------|
| `/` | `Landing` | Marketing / entry |
| `/auth` | `AuthPage` | Sign-in / sign-up |
| `/privacy` | `Privacy` | Legal |
| `/terms` | `Terms` | Legal |

## Protected — with `DashboardLayout` + sidebar

Wrapped in `<RequireAuth><DashboardLayout /></RequireAuth>`; child routes render in the layout outlet.

| Path | Component | Doc |
|------|-------------|-----|
| `/dashboard` | `Index` (pages/Index) | [pages/dashboard.md](./pages/dashboard.md) |
| `/databases` | `Databases` | [pages/databases.md](./pages/databases.md) |
| `/github` | `GitHub` | [pages/github.md](./pages/github.md) |
| `/hosting/:providerId` | `HostingRender` | [pages/hosting.md](./pages/hosting.md) |
| `/auto-medic` | `AutoMedic` | [pages/auto-medic.md](./pages/auto-medic.md) |
| `/operations` | `Operations` | [pages/operations.md](./pages/operations.md) |
| `/admin` | `Administrator` | [pages/administration-team-access.md](./pages/administration-team-access.md) |
| `/attack-paths` | `AttackPath` | [pages/attack-paths.md](./pages/attack-paths.md) |
| `/scenarios` | `ComingSoon` | [pages/coming-soon.md](./pages/coming-soon.md) |
| `/emails` | `Emails` | [pages/emails.md](./pages/emails.md) |
| `/reports` | `ComingSoon` | [pages/coming-soon.md](./pages/coming-soon.md) |
| `/settings/profile` | `ProfileSettings` | [pages/profile-settings.md](./pages/profile-settings.md) |

## Protected — no sidebar layout

| Path | Component | Notes |
|------|-------------|------|
| `/onboarding` | `Onboarding` | [auth/onboarding.md](./auth/onboarding.md) |
| `/settings/connections` | `InfraSettings` | [pages/infrastructure-settings.md](./pages/infrastructure-settings.md) |
| `/exposure` | `ExposureAnalysis` | Full-viewport security dashboard, no sidebar — [pages/exposure-analysis.md](./pages/exposure-analysis.md) |
| `/bridge` | `Bridge` | `RequireAuth requireGitHub={false}` — [auth/bridge.md](./auth/bridge.md) |

## Catch-all

| Path | Component |
|------|-------------|
| `*` | `NotFound` |
