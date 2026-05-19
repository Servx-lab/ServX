# Repository Control Plane - Phase 4 Details

## Objective
Engineer the production-grade NPM SDK `@servx/react` that acts as the client-side protective shell, directly reacting to the Control Plane toggles mapped in Phase 3.

## Package Architecture (`packages/react/package.json`)
The SDK must be universally installable across modern meta-frameworks like Next.js (App Router/Pages), Remix, and Vite.
- **Transpilation Strategy:** Implemented `tsup.config.ts` generating CJS (`index.js`) and ESM (`index.mjs`) builds. 
- **Type Safety:** The bundle automatically produces `.d.ts` declaration maps.
- **Bundle Optimization:** `react` and `react-dom` are declared as `peerDependencies` and externalized during the `tsup` build. This prevents duplicate React instances crashing context and keeps the NPM package extremely lightweight (~2KB gzipped).

## Provider Architecture (`src/ServXProvider.tsx`)
The `ServXProvider` sits at the top of the user's component tree.
- **Mount & Connection:** When mounted, it extracts the required `projectKey` parameter. If missing, it safely warns and renders the tree normally.
- **Resilient Polling:** A 15-second `setInterval` hits `GET /api/repositories/sdk/:pin/status`. `cache: 'no-store'` strictly breaks Edge CDN caching, ensuring instant 15s reaction times.
- **Takeover UI:** If `isMaintenance` turns true, the component drops the `children` mapping completely and hard-mounts a full-screen, inline-styled UI shield (glassmorphism/dark mode aesthetics). Inline CSS is used deliberately so it works out-of-the-box regardless of what styling framework the user project runs.

## Custom Integrations (`src/useServX.ts`)
Enterprise teams often want customized branding. By passing `<ServXProvider customFallback={true}>`, the Provider suppresses its internal takeover UI, allowing the user to read `isMaintenance` from `useServX()` and build their own routing blocks.
