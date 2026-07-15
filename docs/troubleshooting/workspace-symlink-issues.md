# Workspace Symlink Issues

## Background
In a monorepo setup (like pnpm or npm workspaces), local packages such as `@servx/react` and `@servx/cli` are symlinked into the root `node_modules` and individual app `node_modules` so they can be resolved as standard dependencies. 

## The Problem
If you are developing on a Windows machine and have created a Junction/Symlink for your project directory (e.g. `C:\VS\Servx` pointing to `C:\PROJECTS\MAIN Projects\Servx`), running `npm install` or `bun install` inside the symlinked path can cause catastrophic failures. 

Package managers attempt to create relative symlinks for the workspace packages based on the path they are executed in. When executed inside a Windows junction, they resolve the absolute paths incorrectly (e.g. `..\..\PROJECTS\...`), leading to `ENOENT: failed to symlink dependencies` errors.

Additionally, we discovered that `apps/web/package.json` was missing its `name` and `version` fields. Without a valid package name, the entire workspace dependency resolution tree fails.

## Symptoms
- `MODULE_NOT_FOUND` errors for workspace packages (e.g., `Failed to resolve import "@servx/react"` in Vite).
- Entire `node_modules` folders being wiped during failed installs.

## Resolution
1. **Fix package.json**: Ensure every `package.json` in the `apps/*` and `packages/*` directories has a valid `name` and `version`.
2. **True Path Installation**: Always run `npm install` or `bun install` in the true, physical path of the project (e.g. `C:\PROJECTS\MAIN Projects\Servx`) instead of the symlinked shortcut path.
3. **Build Workspace Packages**: Ensure that workspace packages are compiled before running dev servers. Run `npm run build` in the root to generate the `dist` folders for `@servx/react` and `@servx/cli` so Vite can properly resolve them.
