# Exposure Analysis Service

> [!IMPORTANT]
> **Core Responsibility:** Exposure Analysis is a standalone Express microservice responsible for mapping live deployment errors back to specific repository files, lines, and commits. It also performs stateless codebase scanning for leaked secrets and misconfigurations.

## Architecture & Workflow

The service integrates seamlessly with the AutoMedic pipeline, acting as the escalation tier for complex incidents (T2 errors). 

1. **Incident Escalation:** Receives a payload from AutoMedic containing the deployment logs and error classification.
2. **Stateless Retrieval:** Interacts directly with the GitHub API to fetch repository source code and commit history without requiring a local `git clone`.
3. **Deep Analysis:**
   - Correlates stack traces and error signatures to specific lines of code.
   - Scans files and deployment logs for critical leaked secrets (e.g., AWS keys, Stripe tokens, JWTs).
   - Audits configuration patterns (e.g., committed `.env` files, improper `.gitignore` rules, `vercel.json` anomalies).
4. **Persistence:** Stores all derived security and operational findings in the Supabase `exposure_findings` table for the Main-UI to consume.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/escalate-incident` | Inbound webhook for AutoMedic T2 incident escalations. |
| POST | `/api/scan-repo` | Manual trigger for a full repository codebase scan. |
| GET | `/api/findings` | Retrieves the paginated exposure findings for the authenticated user. |
| DELETE | `/api/findings/:id` | Resolves and archives a specific finding. |
| GET | `/api/logs/scan` | Initiates a specialized regex scan against deployment logs for secrets. |
