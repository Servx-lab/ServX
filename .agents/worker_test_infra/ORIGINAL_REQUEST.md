## 2026-07-03T13:26:18Z
Your working directory is `/home/premsaik/Desktop/Projects/ServX/.agents/worker_test_infra`.
Your identity is E2E Test Infrastructure Implementation Worker.
Read /home/premsaik/Desktop/Projects/ServX/PROJECT.md, /home/premsaik/Desktop/Projects/ServX/.agents/sub_orch_e2e_testing/ORIGINAL_REQUEST.md, and the recommendations in `/home/premsaik/Desktop/Projects/ServX/.agents/explorer_test_infra_1/analysis.md` and `/home/premsaik/Desktop/Projects/ServX/.agents/explorer_test_infra_3/analysis.md`.

Your task is to implement the E2E test infrastructure (Milestone 1) for the project:
1. Modify `apps/web/playwright.config.ts` to change `baseURL` to `http://localhost:5173` (instead of `http://localhost:8080`) and set `testDir: './e2e/tests'` (or ensure it resolves correctly to your test directory).
2. Create `apps/web/tsconfig.e2e.json` with the following content:
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
3. Modify `apps/web/tsconfig.json` to append the path `./tsconfig.e2e.json` inside the `"references"` array.
4. Add the following scripts to the root `package.json` under `"scripts"`:
   - `"test:e2e": "playwright test --config apps/web/playwright.config.ts"`
5. Create a basic helper file `apps/web/e2e/helpers/auth.ts` to mock Supabase authentication client-side (similar to what was suggested in the Explorer reports, using localStorage injection for auth token `sb-bxmnuzqujamyuvsomfdj-auth-token`).
6. Create a simple smoke test `apps/web/e2e/tests/smoke.spec.ts` that uses the auth helper to log in as a mock user, navigates to `/dashboard` or `/`, and asserts that the page loads (or checks for a main component). Use Playwright intercepts (`page.route()`) to mock any API requests (e.g. `/api/auth/sync`, `/api/repositories`, `/api/security/groups`) so the test is completely self-contained and passes.
7. Run the test command `npm run test:e2e` to verify that the Playwright test infrastructure compiles and runs successfully. Confirm it passes.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your implementation report to `/home/premsaik/Desktop/Projects/ServX/.agents/worker_test_infra/handoff.md` outlining the changes made, compilation checks, and the command output from running the E2E test. Once done, send a message to your parent (conv ID: 5e043b0f-7ebb-4a0b-a084-98fc5454f8b0).
