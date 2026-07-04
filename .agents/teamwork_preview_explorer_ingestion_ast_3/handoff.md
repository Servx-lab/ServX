# Handoff Report — 2026-07-03T13:25:00Z

This handoff report summarizes the design analysis for the scanner integration points, database models, and AST scan output data structure for dataflow tracing in the ServX monorepo.

---

## 1. Observation

1. **Scanner Route Registration**:
   - Mapped in `apps/api/src/domains/security/router.ts` at line 16:
     ```typescript
     router.post('/scan-target', requireAuth, scanTarget);
     ```
   - In `apps/api/src/app.ts` at line 127, this router is prefixed with `/api/security`:
     ```typescript
     app.use('/api/security', securityRouter);
     ```

2. **Controller Implementation**:
   - Located in `apps/api/src/domains/security/controller.ts` starting at line 30:
     ```typescript
     export async function scanTarget(req: Request, res: Response, next: NextFunction): Promise<void> {
       try {
         const { url } = req.body;
         // ...
         const findings = await scanLiveDeployment(url);
         res.json({
           success: true,
           url,
           timestamp: new Date().toISOString(),
           score: findings.length === 0 ? 100 : Math.max(0, 100 - findings.length * 20),
           findings
         });
       } catch (err) {
         next(err);
       }
     }
     ```

3. **DAST Execution**:
   - Defined in `apps/api/src/services/dastScanner.ts` starting at line 22:
     ```typescript
     export async function scanLiveDeployment(targetUrl: string): Promise<LeakedSecret[]> { ... }
     ```
     This synchronous call uses Puppeteer to run a headless browser instance, checking console logs and HTTP response bodies against regexes for API secrets and Bearer tokens.

4. **Database State & Mappings**:
   - The application manages repository settings in PostgreSQL/Supabase. Mapped in `apps/api/src/domains/repositories/service.ts` at lines 26–37:
     ```typescript
     const { data, error } = await supabaseAdmin
       .from('servx_repositories')
       .insert({
         user_uuid: userId,
         github_repo_id: githubRepoId,
         // ...
       })
     ```
   - Mapped in `apps/api/src/domains/security/service.ts` at lines 38-48 for groups:
     ```typescript
     const { data, error } = await supabaseAdmin
       .from('project_groups')
       .upsert({ ... })
     ```
   - There are no database tables or schemas for scan requests, scan history, or static code analysis findings.

---

## 2. Logic Chain

1. **Synchronous Execution Limitation**:
   - As observed in `controller.ts:30`, the DAST scanner runs synchronously. However, AST parsing and static dataflow tracing of full repositories are highly processor-intensive.
   - Therefore, a synchronous controller execution model for SAST is not feasible as it would cause HTTP gateway timeouts. An asynchronous, queue-based model (e.g. BullMQ or a worker polling database state) is required.

2. **Database Models Need Extension**:
   - Because no database tables for scan runs or code vulnerabilities exist in MongoDB or Supabase, we must design a database schema.
   - The schema must support tracing state (status of the scan job), indexing findings (type, severity, location), and mapping the generated graph coordinates (Nodes and Edges) for eventual taint analysis.

3. **Graph Design for Multi-Hop Analysis**:
   - Tracing inputs to database queries requires crossing service boundaries (frontend React UI to backend API).
   - Therefore, the AST output data structure must include a representation of the network layer. We map this using `API_LINK` edges connecting client-side `API_CALL` nodes directly to server-side `ROUTER_HANDLER` nodes.

---

## 3. Caveats

- **Queue Engine**: We assume that background job queues will run under `apps/worker`. However, the current worker (`apps/worker/src/index.ts`) is designed as a batch command script that exits upon completion. Implementing a persistent background daemon (e.g. using BullMQ/Redis or continuous table polling) is needed to handle scans asynchronously.

---

## 4. Conclusion

We recommend the introduction of a new asynchronous SAST scanner pipeline. The scan will be requested via `POST /api/security/scan-ast`, queued in a new database schema in Supabase (`sast_scans`, `sast_graphs`, `sast_findings`), and processed by `apps/worker`. The AST scanner will output a unified Graph containing `Nodes` representing variables/operations and `Edges` modeling data dependencies and cross-service HTTP routing mappings.

---

## 5. Verification Method

To verify the project configuration and baseline test execution:
1. Run the test command in the root folder to ensure Vitest runs successfully:
   ```bash
   npm run test
   ```
2. Inspect the design document `/home/premsaik/Desktop/Projects/ServX/.agents/teamwork_preview_explorer_ingestion_ast_3/analysis.md` to review the database SQL script and JSON graph structures.
