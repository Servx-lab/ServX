import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export interface ScannerToolStatus {
  name: string;
  installed: boolean;
  version?: string;
}

export interface ScanArtifact {
  tool: string;
  kind: 'report' | 'log' | 'sbom' | 'evidence';
  path: string;
  sizeBytes?: number;
}

export interface ScannerRunResult {
  tool: string;
  status: 'ran' | 'skipped' | 'failed';
  findingsCount: number;
  artifacts: ScanArtifact[];
  error?: string;
  rawExitCode?: number;
}

const WORKSPACE_ROOT = path.join(os.tmpdir(), 'servx-attack-paths');

export async function ensureJobWorkspace(jobId: string): Promise<string> {
  const jobDir = path.join(WORKSPACE_ROOT, jobId);
  await fs.mkdir(jobDir, { recursive: true });
  return jobDir;
}

export async function writeArtifactFile(jobDir: string, fileName: string, content: Buffer | string): Promise<ScanArtifact> {
  const safeName = path.basename(fileName);
  const targetPath = path.join(jobDir, safeName);
  const data = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
  await fs.writeFile(targetPath, data);
  return {
    tool: safeName,
    kind: 'report',
    path: targetPath,
    sizeBytes: data.length,
  };
}

export async function detectScannerTools(requested: string[]): Promise<ScannerToolStatus[]> {
  const unique = Array.from(new Set(requested));
  const results: ScannerToolStatus[] = [];

  for (const tool of unique) {
    const lower = tool.toLowerCase();
    let installed = false;
    let version: string | undefined;

    try {
      const child = spawn('which', [lower], { stdio: ['ignore', 'pipe', 'pipe'] });
      const stdout = await new Promise<string>((resolve, reject) => {
        let data = '';
        child.stdout?.on('data', (chunk) => { data += chunk.toString(); });
        child.stderr?.on('data', () => {});
        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) resolve(data.trim());
          else reject(new Error('not-found'));
        });
      });
      installed = Boolean(stdout);

      if (installed) {
        const versionChild = spawn(lower, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
        const versionOut = await new Promise<string>((resolve) => {
          let data = '';
          versionChild.stdout?.on('data', (chunk) => { data += chunk.toString(); });
          versionChild.stderr?.on('data', (chunk) => { data += chunk.toString(); });
          versionChild.on('close', () => resolve(data.trim()));
        });
        version = versionOut.split(/\r?\n/)[0] || undefined;
      }
    } catch {
      installed = false;
    }

    results.push({ name: lower, installed, version });
  }

  return results;
}

export async function runScannerCommand(params: {
  command: string;
  args: string[];
  cwd?: string;
  timeoutMs?: number;
  artifactPath?: string;
}): Promise<ScannerRunResult> {
  const { command, args, cwd, timeoutMs = 10 * 60 * 1000, artifactPath } = params;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(async () => {
      timedOut = true;
      try { child.kill('SIGTERM'); } catch {}
      const artifact: ScanArtifact = {
        tool: command,
        kind: 'log',
        path: artifactPath || '',
        sizeBytes: Buffer.byteLength(stderr || stdout, 'utf8'),
      };

      if (artifactPath && Buffer.byteLength(stdout || stderr || '', 'utf8') > 0) {
        await fs.writeFile(artifactPath, Buffer.from(stdout || stderr || '', 'utf8')).catch(() => {});
      }

      resolve({
        tool: command,
        status: 'failed',
        findingsCount: 0,
        artifacts: artifact.path ? [artifact] : [],
        error: 'Scanner timed out',
        rawExitCode: -1,
      });
    }, timeoutMs);

    child.on('error', async (err) => {
      clearTimeout(timer);
      resolve({
        tool: command,
        status: 'failed',
        findingsCount: 0,
        artifacts: [],
        error: err?.message || String(err),
        rawExitCode: -1,
      });
    });

    child.on('close', async (code) => {
      clearTimeout(timer);
      const artifact: ScanArtifact = {
        tool: command,
        kind: 'report',
        path: artifactPath || '',
        sizeBytes: Buffer.byteLength(stdout || '', 'utf8'),
      };

      if (artifactPath) {
        await fs.writeFile(artifactPath, Buffer.from(stdout || '', 'utf8')).catch(() => {});
      }

      if (timedOut) {
        resolve({
          tool: command,
          status: 'failed',
          findingsCount: 0,
          artifacts: artifact.path ? [artifact] : [],
          error: 'Scanner timed out',
          rawExitCode: code ?? -1,
        });
        return;
      }

      resolve({
        tool: command,
        status: code === 0 ? 'ran' : 'failed',
        findingsCount: 0,
        artifacts: artifact.path ? [artifact] : [],
        error: code === 0 ? undefined : stderr || `exit code ${code}`,
        rawExitCode: code ?? undefined,
      });
    });
  });
}
