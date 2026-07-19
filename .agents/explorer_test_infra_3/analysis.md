# E2E Test Infrastructure Recommendation Report

This report outlines the recommended architecture and design for the End-to-End (E2E) test infrastructure for the ServX application, addressing configuration mismatches, type safety, mock interception strategies, and exact commands.

---

## 1. Port Configuration & Setup

### Current Status & Conflict
*   **Vite Dev Server (Frontend)**: Runs on `http://localhost:5173` (as configured in `apps/web/vite.config.ts`).
*   **API Server (Backend)**: Runs on `http://localhost:5000`.
*   **Vite Proxy**: Proxies requests from `/api/*` to `http://localhost:5000` (meaning frontend requests go to `/api/...` and remain on the same origin `5173` in the browser, avoiding CORS preflight checks).
*   **Playwright Config Mismatch**: `apps/web/playwright.config.ts` currently sets `baseURL` to `http://localhost:8080`, but the `webServer.url` is `http://localhost:5173` and the command runs `npm run dev` (which launches the dev servers on `5173` and `5000`). This causes Playwright page navigations (e.g., `page.goto('/')`) to target port `8080` (which is dead), resulting in test connection failures.

### Recommended Resolution
1.  **Update `playwright.config.ts`**: Set `baseURL` to `http://localhost:5173`.
2.  **Update Environment Variables**: Set `FRONTEND_URL=http://localhost:5173` in the test environment (or the `.env` file) to ensure backend redirections (such as OAuth/auth callbacks) redirect back to port `5173` instead of `8080`.
3.  **CORS Compatibility**: The API server's CORS policy (`apps/api/src/app.ts`) already permits `http://localhost:5173` explicitly, so no changes are required to the CORS policy configuration.

---

## 2. Directory Layout & TypeScript Type Safety

### Proposed E2E Folder Structure
We recommend placing all E2E tests and configurations under a dedicated directory structure inside the web application workspace:

```
apps/web/
├── e2e/
│   ├── tsconfig.json          # E2E-specific TypeScript configuration
│   ├── specs/                 # E2E test spec files
│   │   ├── auth.spec.ts
│   │   └── attackPath.spec.ts
│   ├── helpers/               # Common test utility functions
│   │   └── auth.helper.ts
│   └── fixtures/              # Custom Playwright test fixtures
│       └── test.fixture.ts
├── playwright.config.ts       # Updated Playwright config pointing to ./e2e
```

### TypeScript Configuration Design
Since E2E tests run in a Node.js runtime and use Playwright APIs, compiling them under the frontend `tsconfig.app.json` (which compiles with browser-only DOM types and `noEmit` targets) can lead to type conflicts and compiler errors.

We recommend a two-fold TypeScript setup:
1.  **Create `apps/web/e2e/tsconfig.json`**: Explicitly target Node and Playwright environments.
2.  **Reference in `apps/web/tsconfig.json`**: Update the root-level web workspace configurations so the editor's TypeScript language server correctly parses the E2E directory.

---

## 3. Mock Interception & Isolation Strategy

### A. Authentication & Supabase Mocking
Since the frontend client uses Supabase JS, and the backend Express server verifies the authentication tokens by calling the real Supabase Auth endpoint:
1.  **Frontend State Injection**: Inject a mock session token into the browser's `localStorage` under the Supabase client's auth key: `sb-bxmnuzqujamyuvsomfdj-auth-token`.
2.  **Backend Verification Bypass (MSW)**: Set up a Mock Service Worker (MSW) server on the backend in test mode (`NODE_ENV=test`). MSW will intercept outbound HTTP requests to the Supabase endpoint (`https://bxmnuzqujamyuvsomfdj.supabase.co/auth/v1/user`) and verify mock tokens (e.g. `mock-usr-<id>`) without connecting to the actual cloud service.
3.  **Backend DB Queries**: Intercept POST/GET queries targeting `https://bxmnuzqujamyuvsomfdj.supabase.co/rest/v1/...` (like `user_profiles` or `github_vault` queries) and return simulated user details, permissions, or access keys.

### B. GitHub Integration & Scan Results Mocking
When a user triggers a security scan or views repository details, the backend calls the GitHub GraphQL API (`https://api.github.com/graphql`) using an installation token.
*   **Interception**: Intercept outbound POST requests to `https://api.github.com/graphql` using the backend MSW instance and return mock GraphQL responses representing vulnerabilities (e.g. prototype pollution in `lodash`, CVE alerts, and topology node paths).
*   **Benefits**: Ensures that tests are 100% reproducible, runs entirely offline, and avoids hitting GitHub rate-limits or requiring active tokens.

### C. Database & Cache Isolation
1.  **Redis Cache**: The class `redisCache.ts` has a built-in fallback: if `REDIS_URL` is empty, it bypasses Redis connections and falls back to an in-memory L1 RAM Cache (Map). We recommend setting `REDIS_URL=""` in the test environment to automatically run without Redis.
2.  **MongoDB**: Specify a dedicated local test database `mongodb://127.0.0.1:27017/servx_test` via `MONGODB_URI` in `.env.test`. Alternatively, run `mongodb-memory-server` to automatically spin up a temporary in-memory MongoDB database during test startup.

---

## 4. Configuration Changes & Files to Create/Edit

### 1. `apps/web/playwright.config.ts` (Modify)
Change the `baseURL` to target `http://localhost:5173` and update the test target directory:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173', // FIXED port setup
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'cross-env NODE_ENV=test npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 2. `apps/web/tsconfig.json` (Modify)
Add reference to the new E2E tsconfig:
```json
{
  "compilerOptions": {
    "allowJs": true,
    "noImplicitAny": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "paths": {
      "@/*": ["./src/*"]
    },
    "skipLibCheck": true,
    "strictNullChecks": false
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./e2e/tsconfig.json" } // Added reference
  ]
}
```

### 3. `apps/web/e2e/tsconfig.json` (Create)
Configure TypeScript options for the Playwright runner:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "types": ["node"],
    "paths": {
      "@e2e/*": ["./*"],
      "@/*": ["../src/*"]
    }
  },
  "include": ["**/*.ts"]
}
```

### 4. `apps/web/e2e/helpers/auth.helper.ts` (Create)
Helper to authenticate tests by bypassing Supabase UI steps:
```typescript
import { Page } from '@playwright/test';

export async function loginAsMockUser(
  page: Page, 
  userId: string = 'mock-user-123', 
  email: string = 'test@example.com'
) {
  await page.addInitScript(({ uid, emailAddress }) => {
    const session = {
      currentSession: {
        access_token: `mock-usr-${uid}`,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: `mock-refresh-${uid}`,
        user: {
          id: uid,
          email: emailAddress,
          user_metadata: {
            full_name: 'Test User',
            avatar_url: 'https://github.com/identicons/test.png'
          },
          identities: [{ provider: 'github' }]
        }
      },
      expiresAt: Math.floor(Date.now() / 1000) + 3600
    };
    
    // Write directly into local storage to authenticate the Supabase client
    window.localStorage.setItem(
      'sb-bxmnuzqujamyuvsomfdj-auth-token', 
      JSON.stringify(session)
    );
  }, { uid: userId, emailAddress: email });
}
```

### 5. `apps/api/src/test/setupMockServer.ts` (Create)
Intercept and mock outgoing Supabase and GitHub integrations:
```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const mockServer = setupServer(
  // Intercept Supabase authentication checks
  http.get('https://bxmnuzqujamyuvsomfdj.supabase.co/auth/v1/user', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.includes('Bearer mock-usr-')) {
      const userId = authHeader.split('Bearer mock-usr-')[1];
      return HttpResponse.json({
        id: userId,
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
        identities: [{ provider: 'github' }]
      });
    }
    return new HttpResponse(null, { status: 401 });
  }),

  // Intercept Supabase database queries for user profile lookup
  http.get('https://bxmnuzqujamyuvsomfdj.supabase.co/rest/v1/user_profiles', () => {
    return HttpResponse.json([
      { id: 'mock-user-123', display_name: 'Test User', role: 'admin' }
    ]);
  }),

  // Intercept GitHub vulnerability alerts queries
  http.post('https://api.github.com/graphql', () => {
    return HttpResponse.json({
      data: {
        repository: {
          vulnerabilityAlerts: {
            totalCount: 1,
            nodes: [
              {
                securityVulnerability: {
                  package: { name: 'lodash' },
                  severity: 'HIGH',
                  vulnerableVersionRange: '<4.17.21',
                  firstPatchedVersion: { identifier: '4.17.21' },
                  advisory: { summary: 'Prototype pollution in lodash', cvss: { score: 7.5 } }
                },
                createdAt: '2026-07-03T12:00:00Z'
              }
            ]
          }
        }
      }
    });
  })
);

if (process.env.NODE_ENV === 'test') {
  mockServer.listen({ onUnhandledRequest: 'bypass' });
  console.log('🛡️  Backend mock interceptors initialized.');
}
```

### 6. `apps/api/server.js` (Modify)
Import the mock setup code at the very top when in test mode:
```javascript
const path = require('path');

// Initialize test mock server if running tests
if (process.env.NODE_ENV === 'test') {
  require('./src/test/setupMockServer');
}

require('dotenv').config({ path: path.join(__dirname, '.env') });
// ... rest of server.js remains identical
```

---

## 5. Execution Commands & Scripts

We recommend adding the following script to the root `package.json` to streamline E2E testing:

### Root `package.json` Updates
*   Add `"test:e2e"` script:
    `"test:e2e": "cross-env NODE_ENV=test playwright test --config apps/web/playwright.config.ts"`

### Setup & Run Commands
1.  **Install Required Dev Dependencies**:
    ```bash
    npm install --save-dev msw cross-env @types/node
    ```
2.  **Start Playwright Tests**:
    ```bash
    npm run test:e2e
    ```
    *(This runs the `playwright.config.ts`, booting up the test-configured dev servers automatically, and running the specs).*
3.  **Run with Playwright UI**:
    ```bash
    npx playwright test --config apps/web/playwright.config.ts --ui
    ```
