# Database Explorer

**Route:** `/databases`  
**Feature:** `apps/web/src/features/databases/`

Provides a powerful, unified explorer for all connected tenant databases. Features include connection management, the **DatabaseViewer**, **DataGrid** layout, **QuickViewDrawer**, and an optional **SupabaseUserManager** for exploring Supabase-backed user schemas.

## API Surface (Standard Explorer)

- `GET/POST /api/db/*` — Explores database connections, tables, and rows, and validates connection strings. See [api/domain-databases.md](../../api/domain-databases.md).
- `GET /api/auth/users/search` — Dedicated search endpoint utilized within the `SupabaseUserManager` for identity resolution.

## Core Architecture Files

- `index.tsx` — The primary feature shell and route entry point.
- `api.ts`, `hooks.ts`, `types.ts` — The data fetching and type definition layers.
