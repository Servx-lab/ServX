# Scope: Milestone 1 - Semantic Code Security & Dataflow Scanner

## Objective
Ingest linked GitHub repository source code or live application endpoints. Perform multi-hop static dataflow correlation from frontend API invocations to backend routes and database/filesystem interactions to detect potential OWASP Top 10 security misconfigurations and code flaws.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Ingestion & AST Parsing | Code ingestion module to parse JS/TS files in apps/web, apps/api, apps/worker. | None | PLANNED |
| 2 | Dataflow Tracer | Track dataflow from API calls (web client) to Express backend controllers, database calls, or filesystem operations. | M1 | PLANNED |
| 3 | OWASP Vulnerability Detector | Rules engine matching dataflow endpoints and sources to find OWASP Top 10 flaws (hardcoded secrets, SQL injection, unsafe shell execution, directory traversal). | M2 | PLANNED |
| 4 | Integration | Hook scanner into the Express controller in `apps/api/src/domains/security/controller.ts` and verify. | M3 | PLANNED |
