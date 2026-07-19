# Handoff Report - E2E Test Infrastructure Design Recommendation

## 1. Observation
We observed the following configurations in the codebase:
- `apps/web/playwright.config.ts` sets `baseURL: 'http://localhost:8080'` (line 12) but checks the server at `url: 'http://localhost:5173'` (line 23).
- `apps/web/vite.config.ts` sets `port: 5173` (line 9) and proxies `/api` requests to `http://localhost:5000` (lines 13-18).
- `apps/api/.env` and the root `.env` define `FRONTEND_URL=http://localhost:8080` (line 4).
- `apps/api/src/app.ts` configures CORS to permit origin `http://localhost:5173` (line 43) along with `8080` and `8083`.
- `apps/api/src/core/middleware/requireAuth.ts` reads the Authorization bearer token and verifies it against the remote Supabase API via `supabaseAdmin.auth.getUser(token)` (line 36).
- `apps/api/src/core/services/redisCache.ts` returns `null` if `process.env.REDIS_URL` is empty and falls back to an in-memory L1 cache Map `ramCache` (lines 23-24).
- `apps/web/tsconfig.json` lists project references `tsconfig.app.json` and `tsconfig.node.json` but doesn't include any test or E2E config folder.

## 2. Logic Chain
1. Since the dev server boots the frontend on port `5173` and the API on `5000`, setting Playwright's `baseURL` to `http://localhost:8080` causes page navigations to target the wrong port. The `baseURL` must be updated to `http://localhost:5173`.
2. The `FRONTEND_URL` environment variable must be set to `http://localhost:5173` during tests to prevent backend auth callbacks from redirecting users to the dead `8080` port.
3. Playwright E2E tests run in Node.js, while frontend source files compile for the browser. A separate `e2e/tsconfig.json` registered in the workspace project references is necessary to isolate and enforce type safety.
4. Because the Express API server makes outbound HTTP calls to verify tokens and query metadata on Supabase and GitHub, Playwright's browser-bound `page.route` cannot intercept them. A backend network-level mock tool like MSW is required to mock these calls when `NODE_ENV === 'test'`.
5. Bypassing Redis by setting `REDIS_URL=""` enables the backend L1 in-memory cache layer, meaning Redis does not need to be run or mocked for local test runs.

## 3. Caveats
- This investigation is read-only. No source files were updated, and no new packages were installed.
- Outbound mock design assumes the implementation of MSW 2.x handlers or a lightweight alternative in `apps/api/src/test/setupMockServer.ts`.
- Alternative local DB isolation approaches like `mongodb-memory-server` were outlined, but the team can also choose to use a local test database instance (e.g. `mongodb://127.0.0.1:27017/servx_test`).

## 4. Conclusion
We recommend:
- Updating `baseURL` in Playwright config to `5173` and executing the E2E script with `cross-env NODE_ENV=test npm run dev`.
- Creating `apps/web/e2e/tsconfig.json` and linking it in `apps/web/tsconfig.json` for IDE type-safety.
- Intercepting auth on the frontend by writing mock sessions to `localStorage`, and on the backend by using MSW node-level mocks for outbound Supabase & GitHub GraphQL queries.

## 5. Verification Method
1. Verify the files:
   - Check `/home/premsaik/Desktop/Projects/ServX/.agents/explorer_test_infra_3/analysis.md` for the exact code contents and commands.
2. Execute verification:
   - Ensure the new E2E TypeScript compilation works without errors using:
     ```bash
     npx tsc --project apps/web/e2e/tsconfig.json --noEmit
     ```
   - Run the E2E tests command:
     ```bash
     npm run test:e2e
     ```
