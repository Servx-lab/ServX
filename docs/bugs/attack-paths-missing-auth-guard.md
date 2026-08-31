# Bug: Attack Paths — Missing Auth Guard Detection (False Positive Risk)

## Summary

The Attack Paths CPG (Code Property Graph) analyzer flags routes as
"no auth guard detected" when an authorization check is present but written
in a pattern the regex does not recognize. This produces misleading
`Unprotected_Mutation` / `IDOR` exploit candidates in the scan report,
undermining trust in the findings.

## Affected Component

- **File:** `apps/worker/src/jobs/attackPaths/cpgAnalyzer.ts`
- **Function:** `analyzeCPG()` — auth-guard detection block (lines ~101-115)

## Root Cause

The auth-guard detector uses a single, narrow regex to decide whether a
route is protected:

```ts
if (/(requireAuth|verifyToken|jwt\.verify|getSession|req\.user|checkPermission)/i.test(lineText)) {
  // mark as guarded
}
```

This only matches a handful of well-known identifier names. It does **not**
recognize any of the following common, valid authorization patterns:

| Pattern | Example | Currently detected? |
|---------|---------|---------------------|
| Inline `if (!req.user)` checks | `if (!req.user) return res.status(401).end()` | No |
| Middleware composed via `app.use()` on a parent router | `router.use(requireAuth)` declared once at the top of the file | No (only per-line match) |
| Decorator-based auth (NestJS) | `@UseGuards(JwtAuthGuard)` | No |
| Supabase session helpers | `const { data: { session } } = await supabase.auth.getSession()` (different naming) | Partial |
| Role/permission checks via a wrapper | `withAuth(handler)` | No |
| Auth enforced at the Express `app` level in `app.ts` | `app.use('/api', requireAuth)` | No (file not linked to route) |
| Next.js middleware (`middleware.ts`) | `export function middleware(req) { ... }` | No |
| Custom-named guards | `const guard = createGuard(...)` | No |

Because the detector is **per-line and intra-file only**, it cannot see
guards that are:
1. Declared on a parent router in a different file.
2. Applied globally in `app.ts` / `server.js`.
3. Written as higher-order functions or decorators.

## Impact

- **False positives:** Routes that are actually protected get flagged as
  `Unprotected_Mutation` or `IDOR` exploit candidates.
- **User trust:** When a security tool cries wolf, users start ignoring
  real findings.
- **OWASP summary distortion:** The `A01 — Broken Access Control` category
  may show `fail` when it should show `pass`, skewing the overall verdict.

## Reproduction

1. Connect a repo where auth is enforced via `app.use('/api', requireAuth)`
   in `app.ts` (the standard ServX pattern).
2. Run an Attack Paths scan on it.
3. Open the findings — routes under `/api/*` will be flagged as
   "no auth guard detected" even though every request to them is
   authenticated.

## Suggested Fix

### Option A — Expand the regex (quick, partial)
Add more known patterns to the guard detector:

```ts
const GUARD_PATTERNS = [
  /requireAuth|verifyToken|jwt\.verify|getSession|req\.user|checkPermission/i,
  /@UseGuards|@Guard|@Authenticated|@Authorized/i,          // decorators
  /withAuth|requireRole|requirePermission|ensureAuth/i,      // wrappers
  /if\s*\(\s*!?\s*req\.user\b/i,                             // inline checks
  /supabase\.auth\.getSession|auth\.getSession/i,            // supabase
  /middleware\.ts|export\s+function\s+middleware/i,          // next.js middleware
];
```

### Option B — Inter-file / global guard awareness (correct, larger)
1. Before scanning routes, scan `app.ts` / `server.js` / `middleware.ts`
   for global `app.use(path, guard)` declarations.
2. Mark any route whose path prefix matches a globally-guarded mount point
   as `guarded_by` a synthetic `global_guard` node.
3. Treat the global guard as an edge target in the CPG so the
   `exploitCandidates` logic respects it.

### Option C — Confidence labeling (honest, minimal)
Until inter-file analysis lands, label guard-absence findings as
`confidence: "partial"` (the frontend already supports this field) and
update the note to:

> "No auth guard was detected in the same file as this route. Auth may be
> enforced globally or in a parent router — manual confirmation recommended."

This stops the tool from over-claiming while keeping the signal useful.

## Severity

**Medium** — does not crash or leak data, but degrades the reliability of
the security report and can mask real access-control issues behind noise.

## Related Files

- `apps/worker/src/jobs/attackPaths/cpgAnalyzer.ts` — guard detection logic
- `apps/worker/src/jobs/attackPaths/attackPathsJobRunner.ts` — where CPG
  results feed into `exploitCandidates`
- `apps/web/src/pages/AttackPath.tsx` — frontend renders
  `authBoundary: "not_detected"` from these candidates
- `docs/architecture/microservices/servx-attackpaths/integration-design.md`
  — executor isolation design

## Status

Open — awaiting triage. Recommend Option C as an immediate stopgap and
Option B as the proper fix in the M1 milestone.
