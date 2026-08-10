# AutoMedic Pipeline Service

> [!IMPORTANT]
> **Core Responsibility:** AutoMedic is a standalone Express microservice that provides live, continuous monitoring of user deployments across Vercel and Render. It classifies errors in real-time and orchestrates automated remediation.

## Architecture & Workflow

AutoMedic acts as the proactive operational watcher for the ServX ecosystem, maintaining a constant pulse on connected hosting providers.

1. **Continuous Polling:** Polls the Vercel and Render APIs at a strict 30-second interval to monitor deployment status changes.
2. **Log Acquisition:** Upon detecting a failed deployment, it immediately fetches both build and runtime logs from the provider.
3. **Regex Classification Pipeline:** 
   - Evaluates logs against a complex regex ruleset.
   - **T1 Errors:** Trivial, auto-fixable issues (e.g., missing dependencies, syntax errors).
   - **T2 Errors:** Complex logical or configuration issues requiring deeper codebase analysis.
4. **Orchestration:** 
   - Persists the classified incident to the Supabase `incidents` table.
   - Pushes real-time alerts to the Main-UI frontend via Server-Sent Events (SSE).
   - Automatically forwards T2 errors to the **Exposure Analysis** service for deep repository correlation.

## API Surface

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/logs/vercel` | Aggregates and normalizes Vercel projects, deployments, and logs. |
| GET | `/api/logs/render` | Aggregates and normalizes Render services, deploys, and logs. |
| GET | `/api/incidents/latest` | Retrieves the most recent active incident for the user. |
| PATCH | `/api/incidents/:id/status` | Mutates the lifecycle state of an incident (e.g., acknowledging or resolving). |
| POST | `/api/escalate` | Manual override to escalate a T1 incident to Exposure Analysis. |
| GET | `/api/automedic/stream` | Authenticated SSE stream for real-time frontend alerts. |
