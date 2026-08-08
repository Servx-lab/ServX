# Exposure Analysis (EASM) Backend Architecture

This document outlines the backend architecture for the External Attack Surface Management (EASM) module, implemented in Phases 2 and 3. The backend is designed to automatically discover assets and passively scan them for vulnerabilities, producing an aggregated exposure score.

## Database Schema (Supabase)

The backend relies on two primary tables created in `migration-supabase-exposure.sql`:

1. **`exposure_assets`**: Stores discovered infrastructure footprint.
   - **Fields**: `id`, `user_id`, `asset_type` (DOMAIN, SUBDOMAIN, IP, BUCKET), `value`, `source` (dns, vercel, digitalocean, manual), `parent_domain`, `metadata`, `last_scanned_at`.
   - **Constraints**: Tenant-scoped by `user_id`. Unique constraint on `(user_id, asset_type, value)` to allow upserts.

2. **`exposure_findings`**: Stores vulnerabilities and misconfigurations detected on assets.
   - **Fields**: `id`, `user_id`, `asset_value`, `category` (network, cloud_storage, dns, iam, web_headers), `severity` (CRITICAL, HIGH, MEDIUM, LOW, INFO), `title`, `description`, `remediation`, `dedupe_key`, `resolved`.
   - **Constraints**: Tenant-scoped by `user_id`. Unique constraint on `(user_id, dedupe_key)` to prevent duplicate alerts on re-scans.

## Scanning Engine (`domains/exposure/service.ts`)

The scanning engine orchestrates discovery and vulnerability scanning using a hybrid approach (passive OSINT + API integrations).

### Phase 2: Asset Discovery
- **`enumerateDns(domain)`**: Uses Node's `dns/promises` to resolve A, AAAA, MX, TXT, and NS records. Probes common subdomains (www, api, staging, etc.) silently without intrusive scanning.
- **`discoverCloudAssets(userId)`**: Integrates with the existing `hosting_vault` to reuse encrypted OAuth tokens/API keys.
  - *Vercel*: Fetches connected domains via Vercel Domains API.
  - *DigitalOcean*: Fetches Droplet public IPs via DigitalOcean API.

### Phase 3: Passive Scanning
- **`checkSecurityHeaders(host)`**: A lightweight, free scanner that performs a `GET` request to the target and validates the presence of critical security headers (HSTS, CSP, X-Frame-Options).
- **`scanPortsShodan(ip)`**: Integrates with the Shodan REST API (requires `SHODAN_API_KEY`) to identify open ports without actively sending packets from our infrastructure. Flags sensitive ports (e.g., 22, 3306, 5432) as `CRITICAL` and others as `MEDIUM`. Degrades gracefully if the API key is missing.

### Scoring System
- **`computeExposureScore(findings)`**: Calculates a global exposure score from 0 to 100.
  - Categories: `network`, `cloud_storage`, `dns`, `iam`, `web_headers`.
  - Severity weights: CRITICAL (30), HIGH (18), MEDIUM (8), LOW (3).
  - Outputs a letter grade (A-F) and status string based on the total penalty.

## API Layer (`domains/exposure/router.ts`)

All routes are protected by the `requireAuth` middleware and mounted at `/api/exposure`.

- **`GET /api/exposure/summary`**: Returns aggregated stats for the dashboard (Global Score, asset counts, critical finding counts).
- **`GET /api/exposure/findings`**: Fetches unresolved findings. Supports filtering by category (`open_ports`, `missing_headers`, `critical`).
- **`GET /api/exposure/assets`**: Lists all discovered assets for the tenant.
- **`POST /api/exposure/assets`**: Manually adds a new asset to the monitoring pool.
- **`POST /api/exposure/scan`**: Triggers an on-demand scan for a given root domain. Orchestrates discovery, header checks, port scans, and persists the results. Emits real-time progress via `auditEmitter` for the frontend SSE feed.

## Next Steps
The backend is fully operational and type-checked. The next phase (Phase 1 & 4 Frontend) will consume these endpoints to render the light-themed, bento-box Exposure Dashboard and wire findings into the Auto-Medic remediation pipeline.
