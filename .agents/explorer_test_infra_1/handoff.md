# Handoff Report: E2E Test Infrastructure Design Recommendation

## 1. Observation
* **Vite Configuration**: `/home/premsaik/Desktop/Projects/ServX/apps/web/vite.config.ts` lines 7-19 configure the server to run on port `5173` and proxy requests starting with `/api` to the backend running at `5000`:
  ```typescript
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  }
  ```
* **API Entrypoint**: `/home/premsaik/Desktop/Projects/ServX/apps/api/server.js` line 8:
  ```javascript
  const PORT = process.env.PORT || 5000;
  ```
* **Playwright Mismatch**: `/home/premsaik/Desktop/Projects/ServX/apps/web/playwright.config.ts` lines 11-25:
  ```typescript
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  ...
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  ```
* **TypeScript Configurations**: Found `/home/premsaik/Desktop/Projects/ServX/apps/web/tsconfig.json` which contains:
  ```json
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.node.json"
    }
  ]
  ```
* **Supabase Client Usage**: No direct `.from('...')` queries were found in `apps/web/src` via search. Instead, it relies on API endpoints (`apiClient`) and `supabase.auth` session management (`apps/web/src/features/auth/AuthContext.tsx`).

---

## 2. Logic Chain
1. Since the dev server starts on `http://localhost:5173` (as per `vite.config.ts`) and is monitored by Playwright's `webServer.url`, setting `baseURL` to `http://localhost:8080` in `playwright.config.ts` directs Playwright tests to a non-existent port or wrong server, causing tests to immediately fail. Correcting `baseURL` to `http://localhost:5173` fixes this mismatch.
2. Because the frontend relies on `apiClient` which automatically maps relative API routes (e.g. `/api/auth/sync`) to `/api` and leverages the Vite server proxy, pointing Playwright to `http://localhost:5173` ensures that both frontend page navigation and background backend calls route seamlessly.
3. Placing E2E tests in a dedicated folder (`apps/web/e2e/`) keeps them decoupled from source code, and referencing a dedicated compilation configuration (`apps/web/tsconfig.e2e.json`) from `tsconfig.json` ensures that Playwright specific types (like `@playwright/test`) and browser global definitions do not pollute standard production/app compilations.
4. Using Playwright's `page.route()` to intercept and mock calls to the Supabase endpoint (`https://*.supabase.co/*`) and the backend API (`/api/*`) allows the tests to run offline, fast, and without database seeding or complex cleanups.

---

## 3. Caveats
* The dynamic test sandbox generator in the worker (`apps/worker`) was not tested or run. If Milestone 2 and later milestones require full end-to-end coverage where the backend actually processes and runs sandboxed tests, client-side mocking will bypass those layers. An integration environment setting pointing to local test DBs and using Node-level mocking (e.g., `nock` or a test-specific mock server) would be required.

---

## 4. Conclusion
* Resolve the Playwright configuration by setting the `baseURL` to `http://localhost:5173`.
* Place the E2E tests under `apps/web/e2e` and create `apps/web/tsconfig.e2e.json` (as detailed in `analysis.md`) to manage compilation scopes cleanly.
* Utilize Playwright's network interception (`page.route()`) for client-side mocking of Supabase and GitHub APIs. This ensures high test speed, total isolation, and offline compatibility.

---

## 5. Verification Method
To independently verify the configuration:
1. Make the recommended changes to `playwright.config.ts`.
2. Run `npm run dev` to start Vite (5173) and Express (5000) servers.
3. Confirm that visiting `http://localhost:5173` loads the application.
4. Run `npx playwright test --config=apps/web/playwright.config.ts` to verify the execution.
