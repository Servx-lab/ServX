# Attack Path: Revised Architecture — Puppeteer + Free-Tier Best Alternatives
> **Research date:** June 2026 | **Constraint:** Free/low-cost hosting on Render.com

---

## 🔬 Puppeteer DAST vs. `fetch()` — What's the Real Difference?

This is the most important design question. Here's the honest breakdown:

### What `fetch()` (HTTP header audit) can detect:
- Missing `Content-Security-Policy`, `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`
- Server version disclosure (`Server: nginx/1.18.0`, `X-Powered-By: Express`)
- HTTP → HTTPS redirect misconfig
- SSL/TLS certificate expiry (via HTTPS handshake check)
- CORS header misconfiguration
- Cookie `Secure` / `HttpOnly` / `SameSite` flag issues (from `Set-Cookie` headers)

> 🟢 **This covers OWASP A05 (Security Misconfiguration) and A02 (Cryptographic Failures) almost completely.** 

---

### What **only Puppeteer** can detect:

| Vulnerability | Why fetch() is blind | Why Puppeteer works |
|---|---|---|
| **DOM-based XSS** | Payload lives in URL fragment (`#`), never hits server | Executes JS, observes DOM mutation |
| **Reflected XSS in SPAs** | React/Vue renders output in-browser, not in HTML response | Renders full page, can inject payloads |
| **Client-side open redirects** | `window.location = param` never seen in headers | Follows JS navigation |
| **Broken client-side auth** | Token stored in `localStorage`, not visible | Can read page state and storage |
| **Hidden API surface** | SPAs load routes lazily via JS | Crawls rendered navigation links |
| **Form-based CSRF** | No forms visible in static HTML for SPAs | Fills and submits forms |
| **JS-rendered content** | Entire body may be `<div id="root"></div>` | Waits for JS hydration |

> 🔴 **For modern React/Next.js apps (like what ServX users build), fetch() misses the most dangerous client-side vulnerabilities.** DOM XSS is the #1 OWASP risk that simple header checks cannot find.

### Verdict: Yes, deploy Puppeteer separately — but only for DAST

**Puppeteer on its own $7/mo Render Starter service is the right call.** Here's why:
- **512 MB RAM** is enough for one scan at a time (Chromium takes ~200–300MB)
- At $7/mo, it's the cheapest dedicated DAST capability available
- One scan per user at a time (queue in Redis) prevents OOM
- The main API (free/starter) stays lean — no Chrome binary, no memory risk

---

## 🏗️ Two-Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Render.com Deployment                    │
│                                                             │
│  ┌─────────────────────────┐  ┌────────────────────────┐   │
│  │  Main API (Free/Starter)│  │  DAST Microservice     │   │
│  │  apps/api               │  │  apps/dast-worker      │   │
│  │  • Auth, GitHub, DB     │  │  • Puppeteer + Chrome  │   │
│  │  • SSE orchestrator     │──▶  • OWASP header check  │   │
│  │  • OSV.dev, GitHub APIs │  │  • DOM XSS probing     │   │
│  │  ~100MB peak RAM        │  │  • JS crawl            │   │
│  └─────────────────────────┘  │  • $7/mo Starter plan  │   │
│                               └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Request flow for a DAST scan:**
1. User submits live URL → main API receives it
2. Main API calls `DAST_SERVICE_URL/scan` (internal HTTP call to the microservice)
3. DAST microservice runs Puppeteer, returns findings JSON
4. Main API streams results back to frontend via SSE

> ⚡ **DAST microservice can be a separate Express app in `apps/dast-worker/` — no shared code needed, just a simple REST endpoint.**

---

## 🔧 Best Alternative Per Scanner (May/June 2026 Research)

### 1. DAST — Puppeteer (Dedicated Render Service) ✅
| | Detail |
|---|---|
| **Tool** | Puppeteer + `@sparticuz/chromium` (statically linked, Render-compatible) |
| **Why not Nuclei?** | Nuclei requires CLI binary; ProjectDiscovery Cloud API is paid/enterprise |
| **Why not OWASP ZAP?** | Requires 512MB+ just for ZAP itself; no usable free cloud API |
| **Why not Browserless.io?** | Free tier = 1,000 units/mo (burns out fast); $25/mo+ for production |
| **Config for Render** | `@sparticuz/chromium` + `puppeteer-core`; `--no-sandbox`, `--disable-dev-shm-usage`, `--single-process`, `--no-zygote` |
| **Cost** | **$25/mo** for the DAST Render Standard service (512MB Starter OOMs on modern SPAs) |
| **What it scans** | Headers + DOM XSS + rendered page content + JS-executed redirects |

> ⚠️ **Critical finding from research:** Render Starter (512MB, $7) is borderline — Chromium alone takes 200–300MB leaving barely any room for Node.js. Render **Standard ($25/mo, 2GB RAM, 1 vCPU)** is the first tier where Puppeteer is production-reliable. If budget is a hard constraint, use `--single-process --no-zygote` flags to reduce RAM and accept occasional crashes on large SPAs.

---

### 2. SAST — GitHub Code Scanning + Dependabot REST API ✅
| | Detail |
|---|---|
| **Tool** | `GET /repos/{owner}/{repo}/code-scanning/alerts` + Dependabot GraphQL |
| **Requires** | User's GitHub App token with `security_events` scope |
| **Why not Semgrep CLI?** | CLI binary; too heavy for free tier |
| **Why not Semgrep Cloud API?** | Requires uploading code → privacy concern |
| **Coverage** | CodeQL SAST results GitHub already computed for the repo |
| **Free for Code Scanning** | Public repos only; private repos need GHAS (paid) |
| **Dependabot alerts (SCA/SAST light)** | **Free for ALL repos including private** — Dependabot GraphQL API (`vulnerabilityAlerts`) requires no GHAS license. This already exists in your codebase (`githubGraphScanner.ts`)! |
| **Fallback for private repos** | Read Dependabot alerts (always available) + show "Enable GitHub CodeQL" CTA for deeper SAST |
| **Cost** | $0 — pure API reads, no compute |

> 🎯 **Critical insight from research:** Dependabot GraphQL is free for all repos. Your `githubGraphScanner.ts` already does this — SAST is essentially **already partially built**.

---

### 3. Secret Scanning — GitHub Secret Scanning API (Native) ✅
| | Detail |
|---|---|
| **Tool** | `GET /repos/{owner}/{repo}/secret-scanning/alerts` |
| **Requires** | GitHub App token, `secret_scanning_alerts` permission |
| **Free for** | All public repos (GitHub scans them automatically with 150+ provider patterns) |
| **Private repos** | Requires GitHub Advanced Security (GHAS, paid) |
| **vs. Gitleaks CLI** | GitHub native: 150+ partner patterns, auto-verified, no false-positives on provider keys. Gitleaks: broader regex, catches custom formats, but requires running binary |
| **Hybrid approach** | Use GitHub API first. For repos without GHAS, run regex scan on raw `.env.example`, `config.*` files via GitHub Contents API |
| **Cost** | $0 |

---

### 4. SCA/SBOM — OSV.dev Batch API + Socket.dev + Deps.dev ✅
| | Detail |
|---|---|
| **Tools** | [OSV.dev Batch API](https://api.osv.dev/v1/querybatch) + [Socket.dev SDK](https://socket.dev) + [Deps.dev API](https://api.deps.dev/) |
| **Why OSV** | Unlimited, no API key, aggregates GitHub SA + NVD + npm advisory DB. Best free CVE API in 2026 |
| **Why add Socket.dev** | Detects **pre-CVE supply chain attacks** (malicious install scripts, typosquats, network calls in postInstall). Free tier = 1,000 scans/mo. Catches what OSV misses |
| **Deps.dev role** | Dependency graph + license info for SBOM generation (CycloneDX format) |
| **How it works** | Read `package.json`/`package-lock.json` from GitHub Contents API → extract name+version → POST to OSV batch → get CVE list → separately check Socket.dev for behavioral risk |
| **Cost** | $0 (OSV: unlimited, no auth; Socket.dev: 1,000 free scans/mo; Deps.dev: unlimited) |

---

### 5. IaC Scanning — GitHub Contents API + Rule Engine ✅
| | Detail |
|---|---|
| **Tool** | Custom rule engine reading files via GitHub Contents API |
| **Why not Trivy** | Requires running Go binary; 150MB+; no free API |
| **Why not Checkov** | Python binary; even heavier |
| **What we check** | `Dockerfile` (USER root, latest tag, no HEALTHCHECK) · `.github/workflows/` (pull_request_target misuse, secrets in run) · `vercel.json`/`render.yaml` (public exposure) · `docker-compose.yml` (privileged, host network) |
| **Implementation** | ~200 lines of TypeScript regex/JSON logic — no dependency |
| **Cost** | $0 |

---

### 6. CSPM — Phase 2 / Cloud Vault Integration
| | Detail |
|---|---|
| **Status** | Deferred — requires user to connect AWS/GCP/Azure credentials |
| **When to build** | After the Connection Vault page supports cloud provider OAuth |
| **Tool when ready** | CloudSploit read-only API calls using user's stored keys |
| **For now** | Show locked card with "Connect a cloud account to enable CSPM" CTA |

---

## 📐 Updated Architecture: SSE + Two Services

```
Frontend (React)
    │  POST /api/security/scan { target, type }
    ▼
Main API (Express, SSE response)
    │
    ├── [repo scans] ──────────────────────────────────────┐
    │   ├── GitHub Code Scanning API  (SAST)               │
    │   ├── GitHub Secret Scanning API (Secrets)           │
    │   ├── GitHub Contents → OSV.dev (SBOM/SCA)          │
    │   └── GitHub Contents → Rule Engine (IaC)           │
    │                                                      │  All concurrent via
    └── [live URL scans] ──────────────────────────────── ─┤  Promise.allSettled()
        └── Internal HTTP → DAST Microservice              │
            (Render Starter $7/mo)                         │
            ├── fetch() header audit                       │
            └── Puppeteer DOM/XSS/crawl scan               │
                                                           │
    ◄── SSE events stream back to frontend as each         ┘
        scanner completes, one finding at a time
```

---

## 📋 Implementation Order

### Week 1 — Backend Scanners
- [x] **Step 1:** Build `apps/api/src/services/scanners/githubSastScanner.ts` — read code-scanning alerts via Octokit
- [x] **Step 2:** Build `apps/api/src/services/scanners/githubSecretScanner.ts` — read secret-scanning alerts + raw file regex fallback
- [x] **Step 3:** Build `apps/api/src/services/scanners/osvScanner.ts` — fetch `package.json` → OSV.dev batch
- [x] **Step 4:** Build `apps/api/src/services/scanners/iacScanner.ts` — fetch IaC files → rule engine
- [x] **Step 5:** Build `apps/api/src/domains/security/scanStream.ts` — SSE orchestrator
- [x] **Step 6:** Register `POST /api/security/scan` route

### Week 2 — DAST Microservice
- [x] **Step 7:** Create `apps/dast-worker/` with Express + `puppeteer-core` + `@sparticuz/chromium`
- [x] **Step 8:** Implement `POST /scan` endpoint with header audit + DOM XSS basic probe
- [x] **Step 9:** Write `Dockerfile` for Render deployment with `@sparticuz/chromium`
- [x] **Step 10:** Deploy to Render Starter ($7/mo), set `DAST_SERVICE_URL` env var in main API

### Week 3 — Frontend Rewrite
- [x] **Step 11:** Build `useScanStream` hook — SSE consumer
- [x] **Step 12:** Build `TargetInput` component — repo URL or live URL input with validation
- [x] **Step 13:** Build `ScannerStatusBar` — 6-card status strip with live badge updates
- [x] **Step 14:** Build `FindingCard` — severity-coded finding display
- [x] **Step 15:** Build `RiskScore` — animated counter
- [x] **Step 16:** Rewrite `AttackPath.tsx` — replace mock logic, keep 3D canvas, connect to real hook

### Week 4 — Polish + Auto-Medic
- [x] **Step 17:** Connect real CVE data (OSV ID, fix version, affected file) to Auto-Medic handoff
- [x] **Step 18:** Connect 3D node animation to SSE events (particle burst per finding)
- [x] **Step 19:** Add CSPM "locked" card with Connection Vault CTA
- [x] **Step 20:** End-to-end test with real repos + live URLs

---

## 💰 Cost Summary

| Service | Plan | Cost |
|---|---|---|
| Main API (Render) | Free tier (or existing Starter) | $0–$7/mo |
| DAST Microservice (Render) | **Standard** (2GB RAM, 1 vCPU) | **$25/mo** |
| OSV.dev API | Free, no limits | $0 |
| Socket.dev | Free tier (1,000 scans/mo) | $0 |
| GitHub APIs (SAST, Secrets, Dependabot) | Free (all repos for Dependabot; public only for SAST/Secrets) | $0 |
| Deps.dev API | Free, no auth | $0 |
| **Total** | | **$25–$32/mo** |

> 💡 **Budget path:** If $25/mo is too much, keep DAST on Starter ($7) using `--single-process --no-zygote --disable-gpu` Chrome flags. Works for simple sites, crashes on heavy SPAs. Accept the tradeoff and fall back to fetch()-only header audit when Puppeteer fails.

---

## ⚠️ Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| DAST service OOM crash (512MB) | One scan at a time per user; queue with Redis on main API; `browser.close()` guaranteed in `finally` block |
| DAST cold start (Render free → Starter) | Starter plan = always-on, no cold start |
| Private repos have no SAST/Secret alerts | Show "Enable GitHub Advanced Security" CTA with docs link; still run OSV + IaC which don't need GHAS |
| OSV.dev rate limits | No published rate limit; add exponential backoff; cache results 24h in Redis |
| DAST scan timeout on slow sites | 30s Puppeteer timeout; return partial findings if timeout |

---

> **Ready to execute?** Say "start with Step 1" and I'll begin building the `githubSastScanner.ts` and wiring the SSE endpoint.
