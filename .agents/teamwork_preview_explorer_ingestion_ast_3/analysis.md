# Design Analysis: Scanner Integration and AST Data Structure for Dataflow Tracing

## Executive Summary
This analysis outlines the integration architecture for a Static Application Security Testing (SAST) scanner within the ServX monorepo. It details how the existing Express security controller can be extended, defines a database schema for asynchronous scan requests and findings, and specifies a unified graph data structure (Nodes, Edges, Files Mapped) designed specifically to enable inter-procedural, cross-service dataflow tracing from React frontend API calls to Node.js backend controllers and Supabase database queries.

---

## 1. Scanner Invocation & Integration Pathway

### Current Invocation Pathway (DAST URL Scanner)
Currently, ServX implements a Dynamic Application Security Testing (DAST) scanner that operates synchronously. The integration pathway is structured as follows:

1. **Routing**:
   - In `apps/api/src/app.ts`, the router `/api/security` is registered:
     ```typescript
     app.use('/api/security', securityRouter);
     ```
   - In `apps/api/src/domains/security/router.ts`, the post request is mapped:
     ```typescript
     router.post('/scan-target', requireAuth, scanTarget);
     ```
2. **Controller (`apps/api/src/domains/security/controller.ts`)**:
   - The `scanTarget` controller acts as the entry point. It extracts the target `url` from `req.body`, performs basic format checks (`new URL(url)`), and awaits the execution of `scanLiveDeployment(url)`.
3. **Service Execution (`apps/api/src/services/dastScanner.ts`)**:
   - `scanLiveDeployment` launches a headless Puppeteer browser using robust sandboxing flags (e.g. `--no-sandbox` for compatibility inside Docker container environments).
   - It listens for `console` events and intercepts network `response` payloads, testing them against a pre-defined set of regular expressions (`SECRET_PATTERNS`) for leaked API keys (Stripe, AWS, Google, GitHub, Bearer tokens).
   - The scanner collects findings, closes the browser, and returns the list of leaks synchronously.
4. **Response**:
   - The controller sends the JSON response directly back to the HTTP client containing the findings list and a dynamically computed security score:
     ```typescript
     res.json({
       success: true,
       url,
       timestamp: new Date().toISOString(),
       score: findings.length === 0 ? 100 : Math.max(0, 100 - findings.length * 20),
       findings
     });
     ```

### Proposed SAST Ingestion Integration Pathway
Because static analysis (SAST) parsing of codebases and AST creation can be extremely resource-intensive and time-consuming, performing it synchronously inside an Express request handler is highly discouraged due to the risk of gateway timeouts.

We recommend an **Asynchronous Queue-based Integration Model**:

```
[ Frontend Client ]
       │
       ├─► 1. POST /api/security/scan-ast (Payload: { repoId })
       │   ◄─ [ 202 Accepted & Scan ID ]
       │
       └─► 2. Polling/SSE updates from /api/security/scans/:scanId
```

1. **New Route**: Register `POST /api/security/scan-ast` in `apps/api/src/domains/security/router.ts`.
2. **Controller**: Validate the repository exists and belongs to the authenticated user context (via matching `user_uuid` in `servx_repositories`).
3. **Queue Ingestion**: Create a record in the database with status `PENDING`. Dispatch a background job containing the `scan_id` and the `repo_id` to the job queue (either using Redis-backed BullMQ or custom database polling in `apps/worker`).
4. **Worker Execution (`apps/worker`)**:
   - The worker fetches the repository credentials (GitHub App access token) from `github_vault`.
   - The worker reads the codebase recursively (utilizing the ingestion engine designed by the `ast_1` team).
   - The worker parses code to AST (via the TypeScript compiler API) and constructs the Unified Code Graph.
   - The worker runs the Dataflow Tracer over the graph to detect vulnerability paths.
   - The worker updates the database with the results and marks the scan status as `COMPLETED`.

---

## 2. Database Schema Design (PostgreSQL / Supabase)

To support this asynchronous SAST pipeline, we propose three new database tables inside PostgreSQL/Supabase. These tables integrate cleanly with the existing `servx_repositories` table.

```sql
-- 1. SAST Scans Table: Tracks the status and progress of a scan execution
CREATE TABLE IF NOT EXISTS public.sast_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES public.servx_repositories(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
    error_message TEXT,
    score INTEGER DEFAULT 100,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT check_scan_status CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'))
);

-- 2. SAST Graphs Table: Stores the generated graph representing the codebase for tracing
CREATE TABLE IF NOT EXISTS public.sast_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.sast_scans(id) ON DELETE CASCADE UNIQUE,
    nodes JSONB NOT NULL,          -- Array of Node objects
    edges JSONB NOT NULL,          -- Array of Edge objects
    files_mapped JSONB NOT NULL,   -- Array of file paths and metadata
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SAST Findings Table: Stores specific vulnerabilities detected along taint pathways
CREATE TABLE IF NOT EXISTS public.sast_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.sast_scans(id) ON DELETE CASCADE,
    vuln_type VARCHAR(100) NOT NULL, -- SQL_INJECTION, DIRECTORY_TRAVERSAL, HARDCODED_SECRET, RCE
    severity VARCHAR(50) NOT NULL,    -- LOW, MEDIUM, HIGH, CRITICAL
    message TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    remediation TEXT,
    evidence_chain JSONB NOT NULL,   -- Array of node IDs forming the exact taint propagation path
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT check_vuln_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);
```

---

## 3. AST Scan Output Data Structure

To enable the Taint Analysis Engine to trace dataflow seamlessly from the React UI dashboard all the way to the Supabase Postgres DB, we must organize the AST output into a **Unified Taint Graph** consisting of `Nodes` and `Edges`.

### JSON Schema Specification

```json
{
  "scanId": "uuid-string",
  "filesMapped": {
    "relative/path/to/file.ts": {
      "hash": "sha256-string",
      "imports": [
        { "specifier": "@/lib/apiClient", "bindings": ["apiClient"] }
      ],
      "exports": [
        { "name": "saveGroup", "kind": "function" }
      ]
    }
  },
  "nodes": [
    {
      "id": "file_path#line_col#unique_index",
      "type": "NODE_TYPE",
      "name": "variable_or_function_name",
      "filePath": "relative/path/to/file.ts",
      "range": {
        "start": { "line": 10, "character": 5 },
        "end": { "line": 10, "character": 35 }
      },
      "code": "const username = req.body.username;",
      "meta": {}
    }
  ],
  "edges": [
    {
      "sourceId": "source-node-id",
      "targetId": "target-node-id",
      "type": "EDGE_TYPE"
    }
  ]
}
```

### A. Graph Nodes Schema
Nodes represent sources of data, operations, sinks, or variables.

| Node Type | Description | Key Meta Properties |
| :--- | :--- | :--- |
| `SOURCE_HTTP_REQUEST` | Source representing untrusted HTTP inputs (e.g. `req.body.x`, `req.query.y`, `req.params.z`) | `parameter`: parameter name |
| `SOURCE_UI_INPUT` | Frontend form bindings or interactive input entries (e.g. `const [username, setUsername] = useState('')`) | `formField`: name of form input field |
| `API_CALL` | Outgoing HTTP requests from frontend modules (e.g., calling `apiClient.post(...)`) | `method`: HTTP Verb, `url`: Route target |
| `ROUTER_HANDLER` | Route controllers in the API (e.g., `router.post('/groups', saveGroup)`) | `method`: HTTP Verb, `route`: route path matching |
| `SINK_DATABASE` | Database operations (Supabase adapter, Mongoose models, raw SQL) | `table`: DB table targeted, `operation`: select/insert/update |
| `SINK_SHELL` | Commands passed to terminal executions (`child_process.exec`, `spawn`) | `engine`: child_process method used |
| `SINK_FILE_SYSTEM` | Filesystem write or read operations (`fs.writeFile`, `fs.readFile`) | `operation`: write/read/delete |
| `SINK_EVAL` | Code executions that run arbitrary strings (`eval`, `Function`) | None |
| `SANITIZER` | Safe functions that validate, escape, or encrypt inputs (e.g. `encryptToken`) | `functionName`: function signature |
| `VARIABLE_DECL` | Variable bindings that store values inside lexical scopes | `name`: variable identifier name |
| `FUNCTION_CALL` | Call site of a function | `functionName`: target name, `argsCount`: count of variables passed |
| `FUNCTION_PARAM` | Parameters accepted by a function definition | `index`: parameter position index |

---

### B. Graph Edges Schema
Edges model how data values propagate from node to node.

1. **`DATA_FLOW`**: Indicates direct data assignment or parameter mapping (e.g., `const b = a` creates an edge `a ──► b`).
2. **`CALL_ARGUMENT`**: Maps a caller's arguments to a function's parameters (inter-procedural flow).
3. **`CALL_RETURN`**: Maps the returned value of a function back to the variable assigned at the call site.
4. **`API_LINK`**: Connects a frontend `API_CALL` node to its matching backend `ROUTER_HANDLER` node. This represents the network hop boundary, allowing tracing to jump from frontend UI components to backend controller operations.

---

## 4. Multi-Hop Dataflow Tracing Walkthrough

This scenario shows how a vulnerability (like unvalidated payload insertion to the DB) is traced through the generated graph.

### The Code Example
1. **Frontend Call** (`apps/web/src/pages/DataGovernance.tsx`):
   ```typescript
   apiClient.post('/groups', { name: userInput });
   ```
2. **Backend Router** (`apps/api/src/domains/security/router.ts`):
   ```typescript
   router.post('/groups', requireAuth, saveGroup);
   ```
3. **Backend Controller** (`apps/api/src/domains/security/controller.ts`):
   ```typescript
   export async function saveGroup(req: Request, res: Response, next: NextFunction) {
     const group = req.body;
     const result = await saveProjectGroup(req.user.id, group);
     res.json(result);
   }
   ```
4. **Backend Service** (`apps/api/src/domains/security/service.ts`):
   ```typescript
   export async function saveProjectGroup(userId: string, group: any) {
     const { data, error } = await supabaseAdmin
       .from('project_groups')
       .upsert({ name: group.name, user_id: userId });
     return data;
   }
   ```

### The Generated Graph Nodes
- **`N1`**: `type: SOURCE_UI_INPUT`, code: `userInput`, filePath: `apps/web/src/pages/DataGovernance.tsx`
- **`N2`**: `type: API_CALL`, meta: `{ method: "POST", url: "/groups" }`, filePath: `apps/web/src/pages/DataGovernance.tsx`
- **`N3`**: `type: ROUTER_HANDLER`, meta: `{ method: "POST", route: "/groups" }`, filePath: `apps/api/src/domains/security/router.ts`
- **`N4`**: `type: SOURCE_HTTP_REQUEST`, code: `req.body`, filePath: `apps/api/src/domains/security/controller.ts`
- **`N5`**: `type: VARIABLE_DECL`, code: `const group = req.body`, filePath: `apps/api/src/domains/security/controller.ts`
- **`N6`**: `type: FUNCTION_CALL`, code: `saveProjectGroup(req.user.id, group)`, filePath: `apps/api/src/domains/security/controller.ts`
- **`N7`**: `type: FUNCTION_PARAM`, code: `group: any` (param index 1), filePath: `apps/api/src/domains/security/service.ts`
- **`N8`**: `type: SINK_DATABASE`, meta: `{ table: "project_groups", operation: "upsert" }`, filePath: `apps/api/src/domains/security/service.ts`

### The Generated Graph Edges
- **`E1`**: `N1 ──► N2` (`DATA_FLOW`): user input goes into API payload.
- **`E2`**: `N2 ──► N3` (`API_LINK`): matching frontend POST to backend POST router path.
- **`E3`**: `N3 ──► N4` (`DATA_FLOW`): router handler receives HTTP request payload.
- **`E4`**: `N4 ──► N5` (`DATA_FLOW`): value assigned to local `group` variable.
- **`E5`**: `N5 ──► N6` (`DATA_FLOW`): local variable passed as an argument.
- **`E6`**: `N6 ──► N7` (`CALL_ARGUMENT`): argument propagates to function parameter scope.
- **`E7`**: `N7 ──► N8` (`DATA_FLOW`): parameter payload goes directly into database upsert payload.

### Taint Traversal Execution
The tracer performs a Depth-First Search (DFS) starting at Taint Sources (`SOURCE_UI_INPUT` or `SOURCE_HTTP_REQUEST`) and attempts to reach any Taint Sinks (`SINK_DATABASE`, `SINK_SHELL`, etc.).

1. Start at `N1` (Source).
2. Traverse `E1` to `N2`.
3. Traverse `E2` (cross-service hop) to `N3`.
4. Traverse `E3` to `N4`.
5. Traverse `E4` to `N5`.
6. Traverse `E5` to `N6`.
7. Traverse `E6` (inter-procedural hop) to `N7`.
8. Traverse `E7` to `N8` (Sink).
9. **Result**: Path `N1 -> N2 -> N3 -> N4 -> N5 -> N6 -> N7 -> N8` is flagged as vulnerable because taint flows from a client input directly to a database sink without traversing a `SANITIZER` node.

---

## 5. Summary Recommendations & Roadmap

1. **Adopt Asynchronous Scans**: Do not trigger AST parsing synchronously inside Express requests. Introduce `sast_scans` table and schedule work asynchronously via the `apps/worker` project.
2. **Standardize the Graph Interface**: Implement the `Nodes` and `Edges` schemas strictly in the AST generation engine. This ensures the Taint Analysis algorithm remains independent of the language parsed (meaning we can scan Python or Go in the future using the exact same tracing backend).
3. **Handle Route Prefix Mappings**: When linking `API_CALL` to `ROUTER_HANDLER` via `API_LINK`, remember that Express prepends prefixes (e.g. `app.use('/api/security', ...)` makes router `/scan-target` resolve to `/api/security/scan-target`). The linker must resolve the global route mapping context recursively.
