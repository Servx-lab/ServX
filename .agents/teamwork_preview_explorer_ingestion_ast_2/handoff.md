# Handoff Report: AST Ingestion Patterns Exploration

## 1. Observation
- **Frontend API client setup**: Observed in `/apps/web/src/lib/apiClient.ts` that `apiClient` is a custom Axios client instance created via `axios.create(...)`.
- **Frontend API client calls**: Observed in `/apps/web/src/features/admin/api.ts` (e.g., line 12: `const res = await apiClient.get('/admin/list');` and line 17: `const res = await apiClient.post('/admin/invite', body);`).
- **Express router setups**: Observed in `/apps/api/src/domains/admin/router.ts` (e.g., line 13: `const router = Router();` and line 17: `router.post('/invite', inviteAdmin);`).
- **Supabase adapter calls**: Observed in `/apps/api/src/domains/databases/adapters/supabase.adapter.ts` (e.g., line 68: `const { data, error } = await this.client.from(table).select('*').limit(limit);`).
- **Postgres adapter query calls**: Observed in `/apps/api/src/domains/databases/adapters/postgres.adapter.ts` (e.g., line 73: `const res = await client.query(\`SELECT * FROM \${safeTable} LIMIT \$1\`, [limit]);`).
- **MongoDB adapter query calls**: Observed in `/apps/api/src/domains/databases/adapters/mongodb.adapter.ts` (e.g., line 52: `return client.db(dbName).collection(table).find({}).limit(limit).toArray();`).
- **Mongoose models and query calls**: Observed in `/apps/api/models/Admin.js` (line 27: `module.exports = mongoose.model('Admin', AdminSchema);`) and query usages in `/apps/api/src/core/middleware/isAdmin.ts` (line 39: `let adminRecord = await AdminModel.findOne({ id });`).
- **Filesystem operations**: Observed in `/apps/worker/src/jobs/generateExpertCache.ts` (e.g., line 1: `import { promises as fs } from 'fs';` and line 163: `const existing = JSON.parse(await fs.readFile(CACHE_FILE_PATH, 'utf-8'));`).

## 2. Logic Chain
1. By analyzing `/apps/web/src/lib/apiClient.ts` and `/apps/web/src/features/admin/api.ts`, we determine that frontend API calls in the web app are systematically performed using method calls on the `apiClient` identifier (e.g., `apiClient.get(...)`, `apiClient.post(...)`).
2. By analyzing `/apps/api/src/domains/admin/router.ts`, we determine that backend routes are declared using methods on the `router` variable initialized from the Express `Router()` builder.
3. By inspecting `/apps/api/src/domains/databases/adapters/`, we see that adapters encapsulate target database interactions (Supabase, Postgres, MongoDB, Redis, MySQL, Firebase). Each adapter wraps standard patterns like `client.from(...)` (Supabase), `client.query(...)` (Postgres), `client.db(...).collection(...)` (MongoDB/driver), and `AdminModel.findOne(...)` (Mongoose).
4. By inspecting `/apps/worker/src/jobs/generateExpertCache.ts`, we see that filesystem calls use `fs.promises` methods (`fs.readFile`, `fs.writeFile`, `fs.mkdir`).
5. Based on these target structures, we map how the TypeScript Compiler API represents them:
   - Call expressions map to `ts.SyntaxKind.CallExpression` with nested `ts.PropertyAccessExpression`.
   - Imports map to `ts.SyntaxKind.ImportDeclaration`.
   - Variables map to `ts.SyntaxKind.VariableDeclaration`.
6. From this, we design the `Import Tracker Pattern` to resolve import bindings to packages, and the `Method Chain Flattening Algorithm` to parse fluent API chains like those of MongoDB or Supabase.

## 3. Caveats
- Since this is a read-only investigation, no parsing script was executed directly on the project's source code; the implementation reference in `analysis.md` is based on standard compiler behaviour and local patterns observed.
- Dynamic route registration patterns (such as dynamically mapping directories to Express routers) are not currently covered, as Express endpoints are declared statically in the `domains/*/router.ts` files.

## 4. Conclusion
We have completed the investigation and authored a comprehensive design analysis in `analysis.md`. The design includes AST node structures for standard AST engines (emphasizing TypeScript Compiler API), a detailed lookup strategy for frontend calls, Express routes, database queries, and filesystem operations, alongside robust algorithms for chain flattening and variable tracking.

## 5. Verification Method
- Inspect the output files:
  - `/home/premsaik/Desktop/Projects/ServX/.agents/teamwork_preview_explorer_ingestion_ast_2/analysis.md`
  - `/home/premsaik/Desktop/Projects/ServX/.agents/teamwork_preview_explorer_ingestion_ast_2/BRIEFING.md`
  - `/home/premsaik/Desktop/Projects/ServX/.agents/teamwork_preview_explorer_ingestion_ast_2/progress.md`
- Verify that the traversal code snippets in `analysis.md` compile and run when executed using standard Node/TypeScript scripts.
