# Handoff Report - E2E Test Infrastructure

This handoff contains findings, design logic, and recommendations regarding the establishment of the E2E Test Infrastructure for the ServX ASPM engine.

---

## 1. Observation

Direct observations made on files, configurations, and scripts:

- **Playwright Mismatched Ports**:
  - File `apps/web/playwright.config.ts` (lines 12, 21-25):
    ```ts
    baseURL: 'http://localhost:8080',
    ...
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    ```
    This indicates `baseURL` is pointing to port `8080`, whereas the dev webServer starts on `5173`.
  - File `package.json` (lines 11-15):
    ```json
    "dev": "npx concurrently -n \"api,web\" -c \"cyan,magenta\" \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "npm run dev --workspace servx-api",
    "dev:web": "vite apps/web --config apps/web/vite.config.ts",
    ```
    This shows the dev frontend is served on port `5173`, and the Express API server runs on port `5000`.
  - File `apps/web/vite.config.ts` (lines 13-18):
    ```ts
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
    ```
    Traffic to `/api` is proxied from port `5173` to `5000`.

- **TypeScript Configuration**:
  - File `apps/web/tsconfig.json` has references to `tsconfig.app.json` and `tsconfig.node.json`, but no reference includes the `./e2e` directory or `playwright.config.ts` or `playwright-fixture.ts`.
  - Typecheck execution via `tsc` on `apps/web` will ignore test files, while opening test files in editors will result in either module resolution errors or mixing of browser and node/test typings.

- **Offline / Code-Only Constraints & Databases**:
  - File `.env` (lines 3, 20, 21):
    - `MONGODB_URI` points to a remote MongoDB Atlas database.
    - `REDIS_URL` points to a remote Redis database.
    - `SUPABASE_URL` points to a remote Supabase project.
  - File `apps/api/server.js` (lines 24-41):
    The Express app requires MongoDB connections (`await connectDB()`) to boot successfully, throwing a critical exception and exiting if it fails.
  - File `apps/api/src/core/services/redisCache.ts` (lines 22-30, 94-99):
    Redis connection failures fall back to an in-memory L1 RAM Cache `ramCache`. If `REDIS_URL` is empty, it returns `null` and bypasses the connection, using memory seamlessly.
  - File `apps/api/src/utils/supabaseAdmin.ts`:
    The admin client uses the remote URL and service role key; in offline test modes, queries will fail.

---

## 2. Logic Chain

1. **Port Setup Resolution**:
   - Since `npm run dev` starts the Vite dev server on port `5173` and the API server on port `5000` (backed by the proxy in `vite.config.ts`), the browser runs against `http://localhost:5173`.
   - Therefore, Playwright's `baseURL` must be updated to `http://localhost:5173` to match the frontend port, allowing tests to navigate using relative paths like `page.goto('/')`.
   - Since testing requires an offline environment, we need to run a test command like `npm run dev:test` which runs in test mode (`NODE_ENV=test`, `REDIS_URL=""`, `MONGODB_URI="mock"`).

2. **Directory & TypeScript Isolation**:
   - To avoid type contamination between DOM/browser-facing files and Playwright Node-facing tests, we must isolate them.
   - Creating a separate `tsconfig.e2e.json` specifically including `e2e/**/*`, `playwright.config.ts`, and `playwright-fixture.ts`, and adding it as a reference in `apps/web/tsconfig.json` ensures that Playwright types and Node types compile cleanly without polluting browser compilation.

3. **Mocking Databases and Services**:
   - For Redis, since `redisCache.ts` has a built-in L1 cache fallback when `REDIS_URL` is falsy, running tests with `REDIS_URL=""` automatically provides an offline-safe in-memory Redis cache.
   - For MongoDB, we can mock Mongoose's queries using a custom mock Mongoose script injected into `require.cache['mongoose']` during backend startup when `NODE_ENV === 'test'`.
   - For Supabase, we can stub `supabaseAdmin` in `apps/api/src/utils/supabaseAdmin.ts` to return mock sessions, user attributes, and query-builder mocks. On the client side (browser), we can intercept auth calls using Playwright's `page.route` to return fake tokens.
   - For GitHub scan data, we can intercept `fetchRepoSecurityData` in `githubGraphScanner.ts` in `test` mode, returning structured mock payloads.
   - Finally, exposing a test-only Express router `/api/test/*` in `test` mode allows the Playwright test suite to seed and manage database state (like approving devices to bypass zero-trust checks).

---

## 3. Caveats

- Playwright tests run as an external Node process. Any backend state changed directly inside the test process does not automatically propagate to the API server unless communicated via a test seeding API endpoint (`/api/test/*`) or shared mock variables.
- We assume that Vite's HMR is disabled during tests to prevent race conditions during UI rendering under load.

---

## 4. Conclusion

The E2E test infrastructure should be configured with:
1. Unified `baseURL: 'http://localhost:5173'` and a dedicated `npm run dev:test` command.
2. A separate `tsconfig.e2e.json` file added as a reference in `apps/web/tsconfig.json`.
3. Offline-safe Javascript-based backend mocks (bypassing MongoDB/Redis/Supabase networking) and a test controller router `/api/test/*` for dynamic test seeding.
4. Client-side Supabase interception using Playwright `page.route()`.

All details, code configurations, and action steps are detailed in `analysis.md`.

---

## 5. Verification Method

To verify the test infrastructure configuration once implemented:
1. Run `npx tsc --noEmit --project apps/web/tsconfig.e2e.json` to verify test files are successfully type-checked.
2. Boot the test backend using `cross-env NODE_ENV=test REDIS_URL="" MONGODB_URI="mock" tsx apps/api/server.js` and verify it runs without attempting remote database connections.
3. Access `http://localhost:5000/api/test/seed-device` (or other seeded route) to verify that mock endpoints are registered and accessible.
4. Execute `npx playwright test --config apps/web/playwright.config.ts` to verify tests compile, launch the server, and execute successfully.
