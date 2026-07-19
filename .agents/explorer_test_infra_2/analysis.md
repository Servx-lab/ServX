# E2E Test Infrastructure Recommendation Report

This report outlines the recommended design, configuration, and implementation plan for the ServX ASPM E2E test suite (covering Tiers 1-4). Since the project operates in a network-restricted `CODE_ONLY` environment and utilizes remote endpoints for database (MongoDB Atlas, Redis, Supabase) and third-party APIs (GitHub GraphQL), the recommended design focuses on **offline-first reliability, mock capability, and proper type safety**.

---

## 1. Port Setup Resolution in `playwright.config.ts`

### Direct Mismatch
The current `apps/web/playwright.config.ts` has a configuration mismatch:
- `baseURL` is set to `http://localhost:8080`.
- The `webServer` option spins up `npm run dev` and waits on `http://localhost:5173`.
- In `package.json`, `npm run dev` spawns the API server on port `5000` and the Vite dev server on port `5173`.
- Under this mismatch, tests navigating via `page.goto('/')` attempt to hit port `8080`, resulting in connection timeouts or failure.

### Recommended Correct Setup
1. **Unify Ports**: The `baseURL` in `playwright.config.ts` must point to the frontend web server (`http://localhost:5173`).
2. **Proxy API Traffic**: Vite is already configured to proxy `/api` traffic from port `5173` to the backend Express server on port `5000` (`apps/web/vite.config.ts`).
3. **Environment Separation**: Instead of starting the standard dev environment (which connects to live databases), Playwright should start a dedicated test server with `cross-env NODE_ENV=test` and `REDIS_URL=""` to run in in-memory mock mode.

#### Proposed `apps/web/playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000, // Slightly increased for cold start of mock servers
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## 2. Directory Structure and Type Safety (tsconfig & playwright helpers)

### Directory Structure
Tests should be located within `apps/web/e2e` (as specified by `testDir: './e2e'`).
```
apps/web/
├── e2e/
│   ├── helpers/
│   │   ├── auth.ts            // Auth mock helpers
│   │   └── apiMock.ts         // API / Telemetry mock helpers
│   ├── tier1-happy.spec.ts
│   ├── tier2-edge.spec.ts
│   ├── tier3-integration.spec.ts
│   └── tier4-scenario.spec.ts
├── playwright.config.ts
├── playwright-fixture.ts
```

### Type Safety Configuration
Because E2E tests run in a Node environment (containing Node types and Playwright-specific matchers) while the React app runs in a browser environment (containing DOM and Vitest globals), they must have isolated TypeScript programs to avoid compile-time type contamination.

1. **Create `apps/web/tsconfig.e2e.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"],
    "paths": {
      "@/*": ["./src/*"],
      "@servx/types": ["../../packages/types/index.ts"]
    }
  },
  "include": [
    "e2e/**/*",
    "playwright.config.ts",
    "playwright-fixture.ts"
  ]
}
```

2. **Add to `apps/web/tsconfig.json` references**:
Modify the references array in the root of `apps/web/tsconfig.json` so typecheckers like `tsc` will build the E2E tsconfig program:
```json
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.e2e.json" }
  ]
```

### Custom Playwright Fixture (`apps/web/playwright-fixture.ts`)
To encapsulate common mock logic, we recommend creating a custom test fixture extending `@playwright/test`:
```typescript
import { test as base, expect } from "@playwright/test";

export const test = base.extend<{
  mockSession: (userId: string, email: string) => Promise<void>;
}>({
  mockSession: async ({ page }, use) => {
    const handler = async (userId: string, email: string) => {
      // Mock Supabase Auth Client calls at browser network layer
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: userId,
            email: email,
            role: 'authenticated',
            aud: 'authenticated',
            user_metadata: { full_name: 'E2E Test User' }
          })
        });
      });
      
      // Inject dummy tokens to localStorage to bypass client-side checks
      await page.addInitScript(({ uid, mail }) => {
        const mockSession = {
          access_token: 'valid-test-jwt-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: { id: uid, email: mail }
        };
        window.localStorage.setItem('sb-bxmnuzqujamyuvsomfdj-auth-token', JSON.stringify(mockSession));
      }, { uid: userId, mail: email });
    };
    await use(handler);
  }
});

export { expect };
```

---

## 3. Backend Data Mocking and Third-Party Interception

Since we are running in an offline network environment, external network calls from the backend (to Atlas MongoDB, Redis, and Supabase) and frontend (to Supabase Auth/REST) will time out. We recommend a **hybrid mocking model**:

### A. Frontend Network Layer Interception
For client-side calls to Supabase, we intercept them using Playwright's `page.route()` within our fixture or test hooks:
- **Supabase Auth (`**/auth/v1/**`)**: Fulfill with mock JWT and sessions.
- **Supabase Realtime / WebSockets**: Intercept or mock listeners as needed.

### B. Backend-Level Mocks (`NODE_ENV === 'test'`)
Since backend Node.js calls are outside Playwright's intercept scope, we configure mock adapters in the Express server:

1. **Redis**: Bypassed automatically. By launching the server with `REDIS_URL=""` or unset, `redisCache.ts` prints a warning and falls back to its in-memory L1 cache (`ramCache`), which is fully functional and requires zero network access.
2. **MongoDB (Mongoose)**:
   We mock `mongoose` via `require.cache` injection at the entry point of `apps/api/server.js` before models are compiled:
   - Create `apps/api/test/mockMongoose.js` containing an in-memory dictionary acting as the collection databases.
   - Inject it into `require.cache['mongoose']` during initialization. This diverts model operations (e.g. `User.findOne()`, `UserConnection.findOneAndUpdate()`, `.save()`) to a purely JavaScript-based memory store.
3. **Supabase Admin (`supabaseAdmin.ts`)**:
   - Detect `process.env.NODE_ENV === 'test'`.
   - Export a stubbed mock client supporting `.from(table)` queries.
   - Mock `.auth.getUser(token)` to decode/validate our test token and return the mock user.
4. **GitHub Scan Mocks**:
   - The method `fetchRepoSecurityData` in `apps/api/src/services/githubGraphScanner.ts` uses GraphQL to scan GitHub.
   - In `test` mode, intercept this call and return a local static payload matching the shape expected by `vulnerabilityTransform.ts`.

### C. Test State Seeding Router (`/api/test/*`)
To allow the Playwright test process to dictate database contents or mock scenarios dynamically:
- Create `apps/api/src/domains/test/router.ts`.
- Expose endpoints like `POST /api/test/seed-device` (to bypass the 403 zero-trust check), `POST /api/test/reset`, and `POST /api/test/mock-scan`.
- Only register this router in `apps/api/src/app.ts` if `process.env.NODE_ENV === 'test'`.

---

## 4. Action Plan: Exact Commands and File Modifications

### A. Packages & Commands
1. Install `cross-env` at root (already in dependencies).
2. Add the following scripts to the root `package.json`:
   - `"dev:test": "cross-env NODE_ENV=test REDIS_URL=\"\" MONGODB_URI=\"mock\" concurrently -n \"api,web\" -c \"cyan,magenta\" \"npm run dev:api\" \"npm run dev:web\""`
   - `"test:e2e": "playwright test --config apps/web/playwright.config.ts"`
   - `"test:e2e:ui": "playwright test --config apps/web/playwright.config.ts --ui"`
3. Install Playwright browsers (if needed):
   - `npx playwright install chromium`

### B. Files to Create
1. **`apps/web/tsconfig.e2e.json`**: Creates compile environment for E2E tests.
2. **`apps/api/test/mockMongoose.js`**: Lightweight Mongoose replacement for in-memory model queries.
3. **`apps/api/src/domains/test/router.ts`**: Express router exposing database seeding controls to test scripts.
4. **`apps/web/e2e/tier1-happy.spec.ts`**: Tier 1 happy path test file.
5. **`apps/web/e2e/tier2-edge.spec.ts`**: Tier 2 boundary cases test file.
6. **`apps/web/e2e/tier3-integration.spec.ts`**: Tier 3 cross-feature integration test file.
7. **`apps/web/e2e/tier4-scenario.spec.ts`**: Tier 4 real-world scenario test file.

### C. Files to Edit
1. **`apps/web/tsconfig.json`**: Append `"./tsconfig.e2e.json"` to references.
2. **`apps/web/playwright.config.ts`**: Point `baseURL` to `http://localhost:5173` and set `webServer.command` to `npm run dev:test`.
3. **`apps/web/playwright-fixture.ts`**: Add custom `mockSession` browser page intercept helper.
4. **`apps/api/src/utils/supabaseAdmin.ts`**: Conditional logic to check `process.env.NODE_ENV === 'test'` and export the mock Supabase client.
5. **`apps/api/server.js`**:
   - Hijack `mongoose` imports at the top of the file when `NODE_ENV === 'test'` via `require.cache`.
   - Skip `connectDB` connection phase in test mode.
6. **`apps/api/src/app.ts`**: Conditionally register `/api/test` endpoints when running in the `test` environment.
