# Code Layout, Recursive Ingestion, and AST Parsing Design Analysis

## Executive Summary
This report analyzes the ServX monorepo code layout (`apps/web`, `apps/api`, `apps/worker`) and presents a production-grade, zero-dependency design for a recursive file ingestion and abstract syntax tree (AST) parsing engine using the project's native `typescript` module.

---

## 1. Monorepo Code Layout and Scan Targets

ServX is structured as a monorepo containing multiple npm workspaces. The main application targets are located under the `apps/` directory:

| Application | Framework / Runtime | Target Entry Point | Primary Source Directory | Key Scan Considerations |
| :--- | :--- | :--- | :--- | :--- |
| **`apps/web`** | React + Vite (TS) | `index.html` | `src/` | Scan `.ts` and `.tsx` files. Ignore asset folders like `public/`, config files (`vite.config.ts`, `tailwind.config.js`), and test configs (`playwright.config.ts`). |
| **`apps/api`** | Express.js + TSX | `server.js` | `src/` (core), `services/`, `models/`, `middleware/` | Scan `.ts` and `.js` files. In addition to the modern TS code under `src/` (e.g. domain controllers/services), it contains legacy JS files in `services/`, `models/`, and `middleware/` that need AST parsing. Ignore utility/migration scripts in `scripts/` and scratchpad files in `scratch/`. |
| **`apps/worker`** | Node.js + TS | `src/index.ts` | `src/` (jobs, utils) | Scan `.ts` files inside `src/`. Ignore build outputs or config files. |

---

## 2. Dependency Verification
Based on the root `package.json`, the workspace provides the following development dependencies out-of-the-box, allowing us to build the AST parser without adding new external packages:
* **`typescript`**: `^5.8.3` (Compiler API for parsing JS/TS code)
* **`tsx`**: `^4.22.4` (Direct execution of TS files for scripting and runners)
* **`@types/node`**: `^22.16.5` (Node.js API typings)

---

## 3. Recursive Ingestion Engine Design

The file ingestion engine discovers files recursively, applies filtering rules, and returns a list of target files.

### Exclusion and Filter Rules
To optimize parser performance and prevent parsing non-source assets, the engine applies:
1. **Folder-level exclusions**: `node_modules`, `dist`, `build`, `.next`, `.git`, `.vscode`, `.agents`, `public`, `scratch`, `scripts`.
2. **File pattern exclusions**: Hidden files (starting with `.`), test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, etc.), and config tools (`vite.config.ts`, `postcss.config.js`, etc.).
3. **Extension white-listing**: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, `.cts`.

### Ingestion Implementation Design
Below is a complete, clean implementation design using Node's `fs/promises` and `path` modules:

```typescript
import fs from 'fs/promises';
import path from 'path';

export interface IngestionOptions {
  excludeDirs?: string[];
  excludeFiles?: RegExp[];
  allowedExtensions?: string[];
  maxDepth?: number;
}

export class FileIngestionEngine {
  private options: Required<IngestionOptions>;

  constructor(options: IngestionOptions = {}) {
    this.options = {
      excludeDirs: options.excludeDirs ?? [
        'node_modules', 'dist', 'build', '.next', '.git', 
        '.vscode', '.agents', 'public', 'scratch', 'scripts', 'coverage'
      ],
      excludeFiles: options.excludeFiles ?? [
        /\.(test|spec)\.[jt]sx?$/, // Test files
        /^\./,                     // Hidden files
        /\.config\.[jt]s(x)?$/,    // Config files
        /tsconfig\.json$/          // TypeScript configs
      ],
      allowedExtensions: options.allowedExtensions ?? [
        '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts'
      ],
      maxDepth: options.maxDepth ?? 25
    };
  }

  /**
   * Recursively crawls a target path and builds an array of absolute file paths.
   */
  public async scan(targetPath: string): Promise<string[]> {
    const absolutePath = path.resolve(targetPath);
    const stats = await fs.stat(absolutePath);

    if (stats.isFile()) {
      return this.isFileTarget(absolutePath) ? [absolutePath] : [];
    }

    if (stats.isDirectory()) {
      return this.crawl(absolutePath, 0);
    }

    return [];
  }

  private async crawl(dirPath: string, depth: number): Promise<string[]> {
    if (depth > this.options.maxDepth) {
      return [];
    }

    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || this.options.excludeDirs.includes(entry.name)) {
          continue;
        }
        const subFiles = await this.crawl(fullPath, depth + 1);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        if (this.isFileTarget(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private isFileTarget(filename: string): boolean {
    // Check if filename matches exclusion patterns
    const isExcluded = this.options.excludeFiles.some(pattern => pattern.test(filename));
    if (isExcluded) return false;

    // Check extension
    const ext = path.extname(filename).toLowerCase();
    return this.options.allowedExtensions.includes(ext);
  }
}
```

---

## 4. AST Parser Design using the TypeScript Compiler API

Rather than introducing bulky external libraries, we use the `typescript` module already installed. Syntactic parsing via `ts.createSourceFile` is fast, type-safe, and natively understands all modern TS/JS syntax.

### Architectural Component Diagram
```
[ File System ]
       │  (File Scanner)
       ▼
[ File Paths List ]
       │  (Read File)
       ▼
[ Source Code (string) ] ──(Determine ScriptKind)──► [ ts.createSourceFile() ]
                                                            │
                                                            ▼
                                                    [ ts.SourceFile AST ]
                                                            │
                                                            ▼
                                                     (AST Traversal)
                                                            │
                                        ┌───────────────────┼───────────────────┐
                                        ▼                   ▼                   ▼
                               [ Extract Imports ]  [ Extract Exports ]  [ Code Signatures ]
```

### AST Extraction Logic Design

The AST Parser needs to identify:
1. **Imports (Dependencies)**: Extract module specifiers and named bindings to trace dependency graphs.
2. **Exports**: Capture functions, classes, and types exposed by each module.
3. **Signatures**: Catalog function signatures, parameters, classes, and documentation.

```typescript
import * as ts from 'typescript';
import fs from 'fs/promises';

export interface ASTImportDetails {
  moduleSpecifier: string;
  bindings: string[];
  isTypeOnly: boolean;
}

export interface ASTExportDetails {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'unknown';
  isDefault: boolean;
}

export interface ASTFunctionDetails {
  name: string;
  parameters: { name: string; type: string }[];
  returnType: string;
  jsDocComment?: string;
}

export interface ASTModuleSummary {
  filePath: string;
  imports: ASTImportDetails[];
  exports: ASTExportDetails[];
  functions: ASTFunctionDetails[];
  classes: string[];
}

export class ASTIngestionParser {
  /**
   * Parse a file into a ts.SourceFile object
   */
  public async parseFile(filePath: string): Promise<ts.SourceFile> {
    const sourceCode = await fs.readFile(filePath, 'utf-8');
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    let scriptKind = ts.ScriptKind.Unknown;
    switch (ext) {
      case 'ts': scriptKind = ts.ScriptKind.TS; break;
      case 'tsx': scriptKind = ts.ScriptKind.TSX; break;
      case 'js':
      case 'mjs':
      case 'cjs': scriptKind = ts.ScriptKind.JS; break;
      case 'jsx': scriptKind = ts.ScriptKind.JSX; break;
    }

    return ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true, // setParentNodes = true: allows navigating upwards to parent nodes
      scriptKind
    );
  }

  /**
   * Traverse a SourceFile and extract high-level code metadata
   */
  public analyze(sourceFile: ts.SourceFile): ASTModuleSummary {
    const summary: ASTModuleSummary = {
      filePath: sourceFile.fileName,
      imports: [],
      exports: [],
      functions: [],
      classes: []
    };

    const visit = (node: ts.Node) => {
      // 1. Resolve Imports
      if (ts.isImportDeclaration(node)) {
        summary.imports.push(this.extractImport(node));
      }

      // 2. Resolve Exports & Declarations
      if (this.hasExportModifier(node)) {
        const exp = this.extractExport(node);
        if (exp) summary.exports.push(exp);
      }

      // Export Assignments (e.g. export default myVar)
      if (ts.isExportAssignment(node)) {
        summary.exports.push({
          name: node.expression.getText(sourceFile),
          kind: 'unknown',
          isDefault: true
        });
      }

      // 3. Extract Function Metadata
      if (ts.isFunctionDeclaration(node)) {
        summary.functions.push(this.extractFunction(node, sourceFile));
      }

      // 4. Extract Class Names
      if (ts.isClassDeclaration(node) && node.name) {
        summary.classes.push(node.name.text);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return summary;
  }

  private extractImport(node: ts.ImportDeclaration): ASTImportDetails {
    const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
    const isTypeOnly = node.importClause?.isTypeOnly ?? false;
    const bindings: string[] = [];

    const importClause = node.importClause;
    if (importClause) {
      if (importClause.name) {
        bindings.push(importClause.name.text); // Default import
      }
      if (importClause.namedBindings) {
        if (ts.isNamespaceImport(importClause.namedBindings)) {
          bindings.push(importClause.namedBindings.name.text); // * as ns
        } else if (ts.isNamedImports(importClause.namedBindings)) {
          importClause.namedBindings.elements.forEach(el => {
            bindings.push(el.name.text); // Named elements
          });
        }
      }
    }

    return { moduleSpecifier, bindings, isTypeOnly };
  }

  private hasExportModifier(node: ts.Node): boolean {
    const modifiers = ts.getModifiers(node);
    if (!modifiers) return false;
    return modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  private extractExport(node: ts.Node): ASTExportDetails | null {
    const isDefault = ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;

    if (ts.isFunctionDeclaration(node) && node.name) {
      return { name: node.name.text, kind: 'function', isDefault };
    }
    if (ts.isClassDeclaration(node) && node.name) {
      return { name: node.name.text, kind: 'class', isDefault };
    }
    if (ts.isInterfaceDeclaration(node)) {
      return { name: node.name.text, kind: 'interface', isDefault };
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return { name: node.name.text, kind: 'type', isDefault };
    }
    if (ts.isVariableStatement(node)) {
      // Variable declaration list can declare multiple exported variables
      // e.g., export const a = 1, b = 2;
      const decl = node.declarationList.declarations[0];
      if (decl && ts.isIdentifier(decl.name)) {
        return { name: decl.name.text, kind: 'variable', isDefault };
      }
    }

    return null;
  }

  private extractFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): ASTFunctionDetails {
    const name = node.name ? node.name.text : 'anonymous';
    const returnType = node.type ? node.type.getText(sourceFile) : 'void/implicit';
    
    const parameters = node.parameters.map(p => {
      const pName = p.name.getText(sourceFile);
      const pType = p.type ? p.type.getText(sourceFile) : 'any';
      return { name: pName, type: pType };
    });

    // Extract leading JSDoc comments
    let jsDocComment: string | undefined;
    const ranges = ts.getLeadingCommentRanges(sourceFile.text, node.pos);
    if (ranges && ranges.length > 0) {
      jsDocComment = sourceFile.text.substring(ranges[0].pos, ranges[0].end).trim();
    }

    return { name, parameters, returnType, jsDocComment };
  }
}
```

---

## 5. Summary Recommendations & Implementation Roadmap

1. **Leverage Native Tools**: Since `typescript` and `tsx` are already configured in root dependencies, do not install third-party AST parsers (such as Babel, Acorn, or Esprima).
2. **Utilize `ts.createSourceFile`**: Use the AST compiler API's fast syntactic parsing mode to index files rapidly without running type resolution.
3. **Structured API Package**: Construct a new workspace folder at `packages/ast-parser` that exports these ingestion and parsing modules, sharing it between `apps/api` and `apps/worker` easily.
4. **Resiliency**: Handle parsing exceptions gracefully (e.g., in legacy `.js` files with syntax errors) by wrapping the parser calls in try-catch blocks and returning syntax error metadata rather than crashing the ingestion pipeline.
