# E2E Test Infrastructure Design Recommendation

This analysis outlines the architecture, configuration, and implementation plan for the E2E test suite (Tiers 1-4) for the ServX ASPM dashboard and security posture engine.

---

## 1. Port Resolution & Development Server Integration

### Current Configuration Analysis
* **Vite Dev Server (Frontend)**: Runs on port `5173` (configured in `apps/web/vite.config.ts`).
* **Express API (Backend)**: Runs on port `5000` (configured in `apps/api/server.js`).
* **Vite API Proxy**: Any request to `http://localhost:5173/api/*` is proxied to `http://localhost:5000` (configured in `apps/web/vite.config.ts`).
* **Playwright Mismatch** (`apps/web/playwright.config.ts`):
  * `baseURL` is set to `http://localhost:8080`.
  * `webServer` command is `npm run dev` (which runs concurrently backend + frontend).
  * `webServer.url` is `http://localhost:5173`.

### Correct Setup
To resolve this mismatch and prevent connection errors:
1. **Change `baseURL`** in `apps/web/playwright.config.ts` to `http://localhost:5173`. This matches the actual frontend port.
2. **Use Vite Proxy for API Calls**: Because Vite proxies `/api` to the backend on `5000`, Playwright tests only need to communicate with the frontend URL (`http://localhost:5173`). All API requests will automatically proxy correctly.
3. **WebServer Command**: Keep `npm run dev` or use `npm run dev:full` if testing background worker workflows. Playwright will wait until `5173` is active before executing the suite.

---

## 2. Directory Layout & TypeScript Configuration

To isolate tests from source code while preserving type safety, we define the following directory layout and configurations.

### Directory Structure
We will establish the E2E directory inside `apps/web/e2e`:
```
apps/web/e2e/
├── tests/                   # Test files (*.spec.ts)
│   ├── auth.spec.ts         # User login, onboarding, zero-trust device flow
│   ├── dashboard.spec.ts    # Connected repositories, databases list
│   ├── attack-path.spec.ts  # 3D topology & scanning telemetry
│   └── governance.spec.ts   # Database schemas, row counts, syncs
├── helpers/                 # Test helpers & mock utilities
│   ├── auth.ts              # LocalStorage inject helper for auth bypass
│   ├── mockRoutes.ts        # Playwright network/API routers
│   └── pageObjects.ts       # Page Object Models for pages
└── tsconfig.json            # E2E specific TypeScript configuration
```

### TypeScript Configurations

1. **Create `apps/web/tsconfig.e2e.json`**:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "lib": ["ES2023", "DOM"],
       "module": "NodeNext",
       "moduleResolution": "NodeNext",
       "skipLibCheck": true,
       "strict": true,
       "noEmit": true,
       "paths": {
         "@/*": ["./src/*"],
         "@e2e/*": ["./e2e/*"],
         "@servx/types": ["../../packages/types/index.ts"]
       }
     },
     "include": [
       "e2e/**/*",
       "playwright.config.ts"
     ]
   }
   ```

2. **Register reference in `apps/web/tsconfig.json`**:
   Insert the new reference into the `references` array:
   ```json
   "references": [
     { "path": "./tsconfig.app.json" },
     { "path": "./tsconfig.node.json" },
     { "path": "./tsconfig.e2e.json" }
   ]
   ```

---

## 3. Backend Data & GitHub Scan Mocking/Interception Strategy

To make E2E tests fast, stable, and offline-compatible, we propose two levels of mocking.

### Strategy A: Browser-Level Client-Side Mocking (Recommended)
This approach intercepts all outbound network calls made by the browser. It does not require any database running and runs entirely locally.

1. **Supabase Auth Interception**:
   Mock responses to `https://bxmnuzqujamyuvsomfdj.supabase.co/auth/v1/*` (e.g. `/auth/v1/session`, `/auth/v1/user`) to return a mock user profile and token.
2. **API Mocking**:
   Use Playwright's `page.route` to intercept `/api` endpoints:
   * `/api/repositories`: Return list of mock repos.
   * `/api/security/vulnerabilities/:owner/:repo`: Return mock vulnerabilities.
   * `/api/security/groups`: Return mock project groups.
3. **SSE Stream Simulation**:
   Mock the Server-Sent Events stream `/api/operations/audit/stream` by writing event data chunks directly back to the connection.

### Strategy B: Backend Mocking (Integration Level)
If testing the real backend, we run the real API & Worker with a test database:
1. **DB Isolation**: Provide test Mongo URI (`MONGODB_URI`) and Redis URL (`REDIS_URL`) using an `.env.test` file.
2. **Mocking Third-Parties on Backend**: Use `nock` or a preload mock script in the API process to intercept outgoing API calls to GitHub (`https://api.github.com`) and Supabase (`https://*.supabase.co`). This prevents the backend from writing to production tables.

---

## 4. Configuration and Implementation Outline

Below are the exact file modifications and scripts.

### File 1: Edit `apps/web/playwright.config.ts`
Modify the configuration to target port 5173:
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
    baseURL: 'http://localhost:5173', // Corrected from 8080 to 5173
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### File 2: Create `apps/web/e2e/helpers/auth.ts`
Helper to bypass login by injecting session token into localStorage:
```typescript
import { Page } from '@playwright/test';

export async function loginAsMockUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-bxmnuzqujamyuvsomfdj-auth-token', JSON.stringify({
      currentSession: {
        access_token: 'mock-jwt-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'mock-user-uuid-123',
          email: 'e2e-test-user@servx.io',
          user_metadata: {
            full_name: 'E2E Test User',
            avatar_url: 'https://example.com/avatar.png'
          }
        }
      },
      expiresAt: Date.now() + 3600000
    }));
  });
}
```

### File 3: Create `apps/web/e2e/helpers/mockRoutes.ts`
Set up mock route intercepts:
```typescript
import { Page } from '@playwright/test';

export async function setupMockRoutes(page: Page) {
  // Mock Supabase Auth Calls
  await page.route('**/supabase.co/auth/v1/session**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'mock-jwt-token', user: { id: 'mock-user-uuid-123' } })
    });
  });

  await page.route('**/supabase.co/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'mock-user-uuid-123', email: 'e2e-test-user@servx.io' })
    });
  });

  // Mock API Sync Endpoint
  await page.route('**/api/auth/sync', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Profile synced', isNewUser: false, uid: 'mock-user-uuid-123' })
    });
  });

  // Mock Repositories
  await page.route('**/api/repositories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 101,
          name: 'vulnerable-web-app',
          full_name: 'test-org/vulnerable-web-app',
          description: 'E2E mock app',
          html_url: 'https://github.com/test-org/vulnerable-web-app',
          language: 'TypeScript',
          owner: { login: 'test-org', avatar_url: '' }
        }
      ])
    });
  });

  // Mock Repository Vulnerabilities (GitHub API Scan results mock)
  await page.route('**/api/security/vulnerabilities/test-org/vulnerable-web-app', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        owner: 'test-org',
        repo: 'vulnerable-web-app',
        source: 'live',
        totalOpenAlertsFromGitHub: 1,
        critical: [
          {
            id: 'GHSA-123',
            title: 'SQL Injection in user search',
            detail: 'Unsanitized input allows SQL injection.',
            file: 'src/db.ts',
            severity: 'critical'
          }
        ],
        medium: [],
        low: []
      })
    });
  });
}
```

### File 4: Create a basic E2E Test `apps/web/e2e/tests/dashboard.spec.ts`
```typescript
import { test, expect } from '@playwright/test';
import { loginAsMockUser } from '../helpers/auth';
import { setupMockRoutes } from '../helpers/mockRoutes';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API routes and mock Auth
    await setupMockRoutes(page);
    await loginAsMockUser(page);
  });

  test('should load repositories on the dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check if the mock repository card is rendered
    const repoCard = page.locator('text=vulnerable-web-app');
    await expect(repoCard).toBeVisible();
  });
});
```

### Suggested Verification Commands
To install Playwright dependencies and execute the suite:
```bash
# Install playwright browser binaries
npx playwright install chromium

# Run the playwright tests
npx playwright test --config=apps/web/playwright.config.ts
```
