# Authentication (web)

The web app uses **Firebase Authentication** for sign-in. The API trusts **Firebase ID tokens** verified server-side.

## Documents in this folder

| Doc | Topic |
|-----|--------|
| [auth-context.md](./auth-context.md) | `AuthProvider`, user state, GitHub linking hints |
| [require-auth.md](./require-auth.md) | Route guard component |
| [landing.md](./landing.md) | Public landing page |
| [auth-page.md](./auth-page.md) | `/auth` sign-in UI |
| [bridge.md](./bridge.md) | `/bridge` GitHub linking flow |
| [onboarding.md](./onboarding.md) | `/onboarding` first-run experience |

## Typical flow

1. User opens `/auth` or lands from marketing.
2. Firebase session is established; `AuthContext` syncs profile to backend via `/api/auth/sync` where applicable.
3. **`RequireAuth`** protects dashboard routes; optional GitHub requirement can force `/bridge`.
