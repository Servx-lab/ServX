# Local Testing & E2E Verification Guide: @servx/cli

Use this checklist to run the locally developed `@servx/cli` script inside your monorepo, trigger real-time state machine changes, and verify active dashboard UI responsiveness.

---

## 1. ⚡ Local Execution Commands

Because the CLI is under active local development, you do not need to publish to NPM or use global links. 

### Method A: Execute Compiled JavaScript (Recommended)
First, compile the TypeScript source:
```bash
# From the monorepo root
npm run build --workspace @servx/cli
```
Then, execute the CLI using Node directly:
```bash
# Execute using compiled JS
node packages/cli/dist/index.js init --key=<YOUR_SERVX_PIN>
```

### Method B: Execute TypeScript Directly (Using tsx)
If you prefer running the source TypeScript files without building first, execute with `npx tsx`:
```bash
npx tsx packages/cli/src/index.ts init --key=<YOUR_SERVX_PIN>
```

---

## 2. 🟢 Expected Terminal Output (The Happy Path)

When executing a successful E2E sequence, the spinners will advance sequentially and output a detailed step-by-step resolution:

```bash
$ node packages/cli/dist/index.js init --key=svx_b9a2df9c1043

Initializing ServX Remote Kill Switch integration...

✔ Test 1 Passed: Securely authenticated PIN.
✔ Test 2 Passed: Framework environment synchronized.
✔ Test 3 Passed: Live Persistent Signal Handshake VERIFIED.

✔ Successfully injected PIN into .env

Next Steps:
1. Install the React SDK:
   npm install @servx/react
   
2. Wrap your application tree (e.g., in layout.tsx or main.tsx):

   import { ServXProvider } from '@servx/react';

   export default function RootLayout({ children }) {
     return (
       <ServXProvider projectKey={process.env.NEXT_PUBLIC_SERVX_PIN || import.meta.env.VITE_SERVX_PIN}>
         {children}
       </ServXProvider>
     );
   }

Your codebase is now completely VERIFIED and securely connected to the ServX Control Plane!
```

---

## 3. 🖥️ Live Dashboard Behavior (localhost:5173/operations)

Keep the dashboard open side-by-side with your terminal. Here is the exact sequence to expect on the **Repository Control & Maintenance** card:

1. **Initial State (Unverified)**:
   - Target Repository is selected. 
   - Status bar shows **SYSTEM OPERATIONAL** (or **MAINTENANCE MODE** if preset), but the **Master Toggle (Kill Switch) is completely disabled**.
   - Stepper displays 3 hollow gray circles. Hovering over the Master Switch shows the tooltip: *"Pending E2E Verification Handshake"*.
2. **Terminal Executes Step 1**:
   - The first step *"CLI Authenticated"* changes from a gray hollow circle to a blue loading spinner, then instantly ticks to a **green checkmark**.
3. **Terminal Executes Step 2**:
   - The second step *"Environment Scanned"* changes to a loading spinner, then ticks to a **green checkmark**.
4. **Terminal Executes Step 3 (Firewall check)**:
   - The third step *"Persistent Link Active"* goes loading, and holds for exactly 3 seconds.
   - Once completed, the third box ticks to a **green checkmark**.
   - The Master Toggle (Kill Switch) instantly **unlocks (is no longer disabled)** and the tooltip disappears, giving you full command plane authority!

---

## 4. 🛠️ Troubleshooting & Diagnostics

### Issue 1: Terminal throws `ECONNREFUSED` on Step 1
* **Why**: The CLI script cannot connect to the backend server (default is `http://localhost:5000`).
* **Fix**: Ensure your backend Express API is running (`npm run dev` in the api workspace). If your local API is running on a different port, set the `SERVX_API_URL` environment variable before executing:
  ```bash
  $env:SERVX_API_URL="http://localhost:8000"; node packages/cli/dist/index.js init --key=svx_xxx
  ```

### Issue 2: Step 2 throws "package.json not found" or extracts "unknown-project"
* **Why**: The CLI reads `package.json` from the current working directory (`process.cwd()`). If executed from a directory without a `package.json`, it falls back gracefully but might look out of place.
* **Fix**: Navigate to a directory containing a project (like `apps/web`) and run the script relative to it:
  ```bash
  cd apps/web
  node ../../packages/cli/dist/index.js init --key=svx_xxx
  ```

### Issue 3: Step 3 hangs indefinitely or times out
* **Why**: Step 3 establishes a Server-Sent Events stream that must stay open for 3 seconds. If you have an aggressive local proxy, VPN, or firewall that buffers HTTP streams, the connection will drop or stall.
* **Fix**: 
  - Bypass any local proxies or dev-tunnel buffers.
  - Check the backend console outputs to see if the stream was terminated prematurely.
