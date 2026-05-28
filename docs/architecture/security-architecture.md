# ServX: Attack Paths & Security Integration Architecture

## Overview
This document outlines the architectural blueprint for integrating comprehensive security scanning capabilities into the **ServX Attack Paths** module. By leveraging industry-standard open-source engines, ServX will provide an enterprise-grade, 360-degree view of a user's security posture—spanning live endpoints, source code logic, leaked credentials, infrastructure configurations, and software supply chains.

---

## 1. Dynamic Application Security Testing (DAST)
*Target: Live URLs & Deployed Applications*

These tools send active payloads to live endpoints to detect OWASP Top 10 vulnerabilities, misconfigurations, and exposure points.

| Engine | Description & ServX Implementation Value | Repository |
| :--- | :--- | :--- |
| **Nuclei** *(ProjectDiscovery)* | A blazing-fast, community-powered vulnerability scanner relying on YAML-based templates. **Implementation:** Ideal for ServX due to its native structured JSON output, making it easy to parse in the Express API and render on the React dashboard. | `projectdiscovery/nuclei` |
| **OWASP ZAP** | The gold standard of open-source web app scanners. Acts as a proxy to intercept/manipulate traffic. **Implementation:** Run ZAP in a container alongside ServX; use the `zaproxy` npm Node.js client to trigger scans and retrieve REST data. | `zaproxy/zaproxy` |

---

## 2. Static Application Security Testing (SAST) & SCA
*Target: GitHub Repositories & Source Code*

These tools analyze code directly from a linked GitHub repository without needing a live, deployed environment.

| Engine | Description & ServX Implementation Value | Repository |
| :--- | :--- | :--- |
| **Semgrep** | A highly scalable static code analyzer using grep-like syntax to find logic errors and flaws. **Implementation:** Extremely fast, integrates beautifully with the ServX worker pipeline for auditing linked repos. | `semgrep/semgrep` |
| **OWASP CVE Lite CLI** | A lightweight dependency vulnerability scanner that reads lockfiles and queries the OSV database. **Implementation:** Built in TypeScript/Node.js, aligning perfectly with the ServX stack. Great for mapping dependencies to CVEs without massive API overhead. | `OWASP/cve-lite-cli` |

---

## 3. Secret & Credential Scanning (High Priority)
*Target: Commits, PRs, and Source Code History*

Prevents hardcoded API keys, database passwords, or JWT secrets from hitting production.

| Engine | Description & ServX Implementation Value | Repository |
| :--- | :--- | :--- |
| **Gitleaks** | Scans repos/commits for thousands of known secret formats (AWS, Supabase, Stripe) via regex/entropy. **Implementation:** The industry standard for speed; perfect for quick pre-flight checks when a user links a repo. | `zricethezav/gitleaks` |
| **TruffleHog** | Similar to Gitleaks, but actively attempts to *verify* exposed credentials against provider APIs. **Implementation:** Offers a higher fidelity alert system by confirming if a leaked key is actually active. | `trufflesecurity/trufflehog` |

---

## 4. Infrastructure as Code (IaC) & Config Scanning
*Target: `vercel.json`, `render.yaml`, `Dockerfile`, GitHub Actions*

Detects misconfigurations in hosting and deployment environments (e.g., Docker running as root, public S3 buckets).

| Engine | Description & ServX Implementation Value | Repository |
| :--- | :--- | :--- |
| **Trivy** *(Aqua Security)* | An all-in-one scanner excelling at Dockerfiles, Kubernetes manifests, and IaC files. **Implementation:** Outputs clean JSON; incredibly easy to trigger via the `apps/worker` background job. | `aquasecurity/trivy` |
| **Checkov** *(Prisma Cloud)* | Specialized static code analysis for IaC (Terraform, Serverless, CloudFormation). **Implementation:** Best if ServX expands into heavy AWS/GCP infrastructure management. | `bridgecrewio/checkov` |

---

## 5. Software Supply Chain (SBOM Generation)
*Target: Package Dependencies & System Inventory*

Generates a verifiable inventory of packages, sub-dependencies, and licenses (increasingly required for enterprise compliance).

| Engine | Description & ServX Implementation Value | Repository |
| :--- | :--- | :--- |
| **Syft** | CLI tool/library for generating a Software Bill of Materials (SBOM) from filesystems/images. **Implementation:** Allows ServX to export CycloneDX/SPDX compliance reports, instantly elevating it to an enterprise-tier tool. | `anchore/syft` |

---

## 6. Cloud Security Posture Management (CSPM)
*Target: Read-Only Cloud Provider Environments (AWS, GCP, Azure)*

| Engine | Description & ServX Implementation Value | Repository |
| :--- | :--- | :--- |
| **CloudSploit** | Runs read-only API calls against cloud accounts to check for security risks (missing MFA, open DBs). **Implementation:** Can be integrated alongside the existing ServX Connection Vault for deeper cloud audits. | `aquasecurity/cloudsploit` |

---

## 🛠️ Recommended ServX Implementation Architecture

To maintain the high performance of your sub-second React frontend and Express API, heavy scanning tools must be offloaded to background processes.

1. **The Trigger (Frontend):** User requests an "Attack Path" scan via the `apps/web` React interface.
2. **The Queue (API):** The Express API (`apps/api`) receives the request and pushes a scanning task to Redis.
3. **The Execution (Worker):** The `apps/worker` package picks up the job, utilizes Node's `child_process.spawn()` to run the appropriate CLI tool (e.g., Nuclei or Trivy).
4. **The Update (Real-time):** The worker parses the JSON output, updates MongoDB, and triggers Server-Sent Events (SSE) to update the 3D Attack Path visualization in real-time.
