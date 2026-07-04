# Design Analysis: AST Ingestion Patterns & Extraction Rules

## 1. Executive Summary
This analysis outlines the AST (Abstract Syntax Tree) node structures and traversal patterns required to parse and extract architectural elements from the ServX codebase. Specifically, it provides standard mapping rules and implementation-ready TypeScript Compiler API strategies for extracting frontend API calls, backend routes, database queries/ORM actions, and filesystem operations across the `apps/web`, `apps/api`, and `apps/worker` directories.

---

## 2. AST Library Analysis: TypeScript Compiler API vs ESTree / Babel
When parsing and analyzing TypeScript/JavaScript source code, two primary AST formats are commonly used: the **TypeScript Compiler API** (native compiler format) and the **ESTree / Babel AST** (used by ESLint, Babel, Acorn, etc.).

### Comparison of Node Types
The following table maps common language constructs to their respective AST node types in both formats:

| Language Construct | TypeScript Compiler API Type (`ts.SyntaxKind`) | ESTree / Babel AST Type | Key Properties to Inspect |
| :--- | :--- | :--- | :--- |
| **Import Declaration** | `ImportDeclaration` | `ImportDeclaration` | `moduleSpecifier`, `importClause` |
| **Variable Declaration** | `VariableDeclaration` | `VariableDeclarator` | `name`, `initializer` |
| **Assignment Expression** | `BinaryExpression` (with `EqualsToken`) | `AssignmentExpression` (with `=`) | `left`, `right`, `operatorToken` |
| **Function/Method Call** | `CallExpression` | `CallExpression` | `expression` (callee), `arguments` |
| **Property Access** | `PropertyAccessExpression` | `MemberExpression` (non-computed) | `expression` (object), `name` (property) |
| **Object Literal** | `ObjectLiteralExpression` | `ObjectExpression` | `properties` |
| **Object Property** | `PropertyAssignment` | `Property` | `name` (key), `initializer` (value) |
| **String Literal** | `StringLiteral` | `Literal` (value is string) | `text` (raw string content) |
| **Template Literal** | `TemplateExpression` or `NoSubstitutionTemplateLiteral` | `TemplateLiteral` | `head`, `templateSpans` (or `value`) |

### How to Parse Using TypeScript Compiler API
To parse a file and get its AST in TypeScript:
```typescript
import * as ts from 'typescript';

function getAST(filePath: string, fileContent: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true // setParentNodes: populates node.parent, essential for bottom-up traversal
  );
}
```

---

## 3. AST Node Structure Mapping
Below are detailed JSON representations of how the TypeScript Compiler API represents key constructs, enabling developer understanding of how to traverse property values.

### A. Function Call / Method Call (`apiClient.get('/repositories')`)
A call like `apiClient.get('/repositories')` is represented as a `CallExpression` where the callee (`expression`) is a `PropertyAccessExpression`:

```json
{
  "kind": "CallExpression",
  "expression": {
    "kind": "PropertyAccessExpression",
    "expression": {
      "kind": "Identifier",
      "text": "apiClient"
    },
    "name": {
      "kind": "Identifier",
      "text": "get"
    }
  },
  "arguments": [
    {
      "kind": "StringLiteral",
      "text": "/repositories"
    }
  ]
}
```

### B. Import Declaration (`import apiClient from '@/lib/apiClient'`)
An import declaration defines bindings and a source module path:

```json
{
  "kind": "ImportDeclaration",
  "importClause": {
    "kind": "ImportClause",
    "name": {
      "kind": "Identifier",
      "text": "apiClient"
    }
  },
  "moduleSpecifier": {
    "kind": "StringLiteral",
    "text": "@/lib/apiClient"
  }
}
```
*Note:* For destructured named imports like `import { promises as fs } from 'fs'`, the `importClause.namedBindings` is a `NamedImports` node containing `ImportSpecifier` elements with `.propertyName` (`promises`) and `.name` (`fs`).

### C. Variable Assignment (`const router = Router()`)
Variable statements enclose declaration lists containing one or more declarators:

```json
{
  "kind": "VariableStatement",
  "declarationList": {
    "kind": "VariableDeclarationList",
    "declarations": [
      {
        "kind": "VariableDeclaration",
        "name": {
          "kind": "Identifier",
          "text": "router"
        },
        "initializer": {
          "kind": "CallExpression",
          "expression": {
            "kind": "Identifier",
            "text": "Router"
          },
          "arguments": []
        }
      }
    ]
  }
}
```

---

## 4. AST Traversal & Scope Resolution Techniques
To accurately extract code structures, simple syntax pattern matching is insufficient. We recommend two core design patterns:

### Pattern A: Import Tracker Pattern
To avoid false positives (e.g. matching a local variable called `fs` that has nothing to do with the node file system module), we must build an **Import Scope Map** for each source file first.
- **Algorithm**:
  1. Before deep traversal, visit all top-level `ImportDeclaration` nodes.
  2. For each declaration, record the local variable name(s) imported and trace them to their module specifier.
  3. *Example Map:*
     ```json
     {
       "apiClient": { "module": "@/lib/apiClient", "isDefault": true },
       "fs": { "module": "fs", "importedName": "promises" },
       "Admin": { "module": "models/Admin", "isDefault": true },
       "createClient": { "module": "@supabase/supabase-js", "importedName": "createClient" }
     }
     ```
  4. When encountering a function/method call, resolve its base identifier against this map to confirm its package origin.

### Pattern B: Method Chain Flattening Algorithm
Database query builders (like MongoDB and Supabase) heavily utilize method chaining (e.g. `client.db(name).collection(table).find().limit().toArray()`).
- **Algorithm**:
  To parse a chained call sequence, recursively unwrap the nested `CallExpression` nodes:
  ```typescript
  interface FlattenedCall {
    methodName: string;
    arguments: ts.Expression[];
  }

  function flattenChain(node: ts.Expression): { baseObject: ts.Expression; chain: FlattenedCall[] } {
    const chain: FlattenedCall[] = [];
    let current: ts.Expression = node;

    while (ts.isCallExpression(current)) {
      const callee = current.expression;
      if (ts.isPropertyAccessExpression(callee)) {
        chain.unshift({
          methodName: callee.name.text,
          arguments: [...current.arguments]
        });
        current = callee.expression; // Traverse into the object (e.g. client.db(name))
      } else {
        break;
      }
    }
    return { baseObject: current, chain };
  }
  ```

---

## 5. Key Patterns to Search For in AST Traversal

### A. Frontend API Calls (in `apps/web`)
**Target Patterns:**
1. `apiClient.get(...)`, `apiClient.post(...)`, `apiClient.delete(...)`
2. `axios.post(...)`, `axios.get(...)`
3. `fetch(...)`

**AST Parsing Rule:**
- Find `ts.CallExpression` nodes.
- Check if `expression` is:
  - An `Identifier` with text `"fetch"` -> Extract `arguments[0]` as endpoint path.
  - A `PropertyAccessExpression` where `expression.expression` is an `Identifier` named `"apiClient"` or `"axios"` and `expression.name` is an `Identifier` in `["get", "post", "put", "delete", "patch"]`.
- Extract route path from `arguments[0]`.

---

### B. Backend Routes (in `apps/api`)
**Target Patterns:**
1. `router.get('/...', ...)`
2. `router.post('/...', ...)`
3. `router.use('/...', ...)` (middleware / nested routers)
4. `app.post('/...', ...)` (Express app instance)

**AST Parsing Rule:**
- Locate `VariableDeclaration` where `initializer` is a `CallExpression` calling `Router` or `express`. Record the declared variable name (usually `router` or `app`).
- Find `ts.CallExpression` nodes.
- Verify if `expression` is a `PropertyAccessExpression` where:
  - `expression.expression` matches the recorded router/app variable name.
  - `expression.name` is an `Identifier` representing HTTP verbs: `"get"`, `"post"`, `"put"`, `"delete"`, `"patch"`, `"use"`.
- Extract:
  - **Route Path**: `arguments[0]` (usually a `ts.StringLiteral` or `ts.NoSubstitutionTemplateLiteral`).
  - **HTTP Method**: `expression.name.text` (upper-cased).
  - **Handlers**: Subsequent arguments in the `arguments` array (can be variables referencing controllers or inline arrow functions).

---

### C. Database Queries & ORM Calls (in `apps/api` and `apps/worker`)
We target three major DB libraries used in the codebase: **Supabase**, **Mongoose (MongoDB ORM)**, and raw database drivers (like **pg** and **mysql2**).

#### 1. Supabase Client Queries
- **Target Patterns:**
  - `supabaseAdmin.from('table_name').select(...)`
  - `this.client.from(table).select(...)`
  - `this.client.rpc('rpc_method')`
- **AST Parsing Rule:**
  - Locate `ts.CallExpression` nodes.
  - Flatten the call chain using **Method Chain Flattening**.
  - If the base object matches a Supabase client instance (or the class property `this.client` inside a Supabase adapter) and the chain contains a method named `"from"`:
    - Extract the table name from the argument of the `"from"` call.
    - Extract the query action (e.g. `"select"`, `"insert"`, `"update"`, `"delete"`) by scanning other method names in the chain.
  - If the chain contains `"rpc"`:
    - Identify as a RPC procedure execution and extract the function name from `rpc(...)`'s first argument.

#### 2. Mongoose (MongoDB ORM) Queries
- **Target Patterns:**
  - `AdminModel.findOne(...)`
  - `User.findOneAndUpdate(...)`
  - `AccessControl.findOneAndDelete(...)`
- **AST Parsing Rule:**
  - Identify imports from `models/` directory or file patterns ending in `model.ts` / `Model` identifier naming convention to establish model names.
  - Locate `ts.CallExpression` where `expression` is a `PropertyAccessExpression`.
  - Validate that `expression.expression` is a Mongoose Model identifier (e.g., `AdminModel`, `User`, `AccessControl`).
  - Check if `expression.name.text` belongs to Mongoose query verbs: `["find", "findOne", "findById", "create", "updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete", "countDocuments"]`.
  - Extract the query parameters from the arguments array.

#### 3. SQL Queries (Postgres `pg` & MySQL `mysql2`)
- **Target Patterns:**
  - `client.query('SELECT ...')`
  - `conn.query('SELECT ...', ...)`
- **AST Parsing Rule:**
  - Find `ts.CallExpression` where `expression` is `PropertyAccessExpression`.
  - Check if `expression.name.text` is `"query"`.
  - Check if `arguments[0]` is a `StringLiteral` or contains SQL keywords (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`).
  - Extract the raw SQL string or template expression. Parsing SQL text using a regular expression regex like `FROM\s+([a-zA-Z0-9_\.\"]+)` can help identify referenced tables.

---

### D. Filesystem Operations (in `apps/api` and `apps/worker`)
**Target Patterns:**
1. `fs.readFile(...)`, `fs.writeFile(...)`, `fs.mkdir(...)`
2. `fs.promises.readFile(...)`

**AST Parsing Rule:**
- Resolve the variable mapped to the `fs` module (either imported default/named or required).
- Find `ts.CallExpression` where `expression` is a `PropertyAccessExpression`.
- Verify the base object is the mapped `fs` variable.
- Check if the method name is an FS operation: `"readFile"`, `"writeFile"`, `"mkdir"`, `"readdir"`, `"unlink"`, `"stat"`, `"readFileSync"`, `"writeFileSync"`, etc.
- Extract the file path argument from `arguments[0]`.

---

## 6. Implementation Reference: Traversal and Extraction Logic
Here is a reference implementation of an AST AST Analyzer using the `typescript` compiler API. This demonstrates how to implement the **Import Scope Map** and match **Express Routing** declarations.

```typescript
import * as ts from 'typescript';

export interface RouteDefinition {
  method: string;
  path: string;
  filePath: string;
}

export class ASTExtractor {
  private importsMap = new Map<string, string>(); // LocalName -> SourceModule
  private routerVars = new Set<string>(); // Router variables defined in the file

  constructor(private filePath: string, private content: string) {}

  public extract(): RouteDefinition[] {
    const sourceFile = ts.createSourceFile(
      this.filePath,
      this.content,
      ts.ScriptTarget.Latest,
      true
    );

    const routes: RouteDefinition[] = [];

    // Stage 1: Build import scope map
    this.buildImportMap(sourceFile);

    // Stage 2: Deep traversal
    const visit = (node: ts.Node) => {
      // Look for: const router = Router() or Router.create()
      if (ts.isVariableDeclaration(node)) {
        this.trackRouterDeclaration(node);
      }

      // Look for calls: router.get('/path', handler)
      if (ts.isCallExpression(node)) {
        const route = this.matchExpressRoute(node);
        if (route) {
          routes.push(route);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return routes;
  }

  private buildImportMap(sourceFile: ts.SourceFile) {
    sourceFile.statements.forEach(statement => {
      if (ts.isImportDeclaration(statement)) {
        const moduleSpecifier = (statement.moduleSpecifier as ts.StringLiteral).text;
        const clause = statement.importClause;
        if (!clause) return;

        // Default Import: import express from 'express'
        if (clause.name) {
          this.importsMap.set(clause.name.text, moduleSpecifier);
        }

        // Named Imports: import { Router } from 'express'
        if (clause.namedBindings) {
          if (ts.isNamedImports(clause.namedBindings)) {
            clause.namedBindings.elements.forEach(element => {
              this.importsMap.set(element.name.text, moduleSpecifier);
            });
          } else if (ts.isNamespaceImport(clause.namedBindings)) {
            this.importsMap.set(clause.namedBindings.name.text, moduleSpecifier);
          }
        }
      }
    });
  }

  private trackRouterDeclaration(node: ts.VariableDeclaration) {
    if (node.initializer && ts.isCallExpression(node.initializer)) {
      const callee = node.initializer.expression;
      if (ts.isIdentifier(callee) && callee.text === 'Router') {
        const sourceModule = this.importsMap.get('Router');
        if (sourceModule === 'express' && ts.isIdentifier(node.name)) {
          this.routerVars.add(node.name.text);
        }
      }
    }
  }

  private matchExpressRoute(node: ts.CallExpression): RouteDefinition | null {
    const callee = node.expression;
    if (!ts.isPropertyAccessExpression(callee)) return null;

    const baseObject = callee.expression;
    const methodName = callee.name.text;

    // Check if the method is called on a router object and is an HTTP verb
    if (ts.isIdentifier(baseObject) && this.routerVars.has(baseObject.text)) {
      const verbs = ['get', 'post', 'put', 'delete', 'patch', 'use'];
      if (verbs.includes(methodName) && node.arguments.length > 0) {
        const pathArg = node.arguments[0];
        if (ts.isStringLiteral(pathArg)) {
          return {
            method: methodName.toUpperCase(),
            path: pathArg.text,
            filePath: this.filePath
          };
        }
      }
    }

    return null;
  }
}
```

---

## 7. Recommendations
1. **Always Use `setParentNodes: true`**: When parsing files, setting the parent node property enables developers to construct precise bottom-up analysis pathways, such as finding the containing class, function scope, or try-catch block for error reporting.
2. **Combine AST with Global Config Analysis**: In monorepos (e.g. Next.js, Express, Vite), routes and path mappings might depend on aliases defined in `tsconfig.json` or `vite.config.ts`. The AST engine must resolve paths (like `@/lib/apiClient`) using the monorepo workspace configurations.
3. **Use Linter Rules for Consistency**: To make ingestion highly reliable and avoid complex edge-cases, enforce developer patterns such as renaming Supabase client imports or always wrapping DB client calls inside adapters, ensuring predictable AST structural shapes.
