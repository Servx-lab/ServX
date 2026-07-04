import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import type { ScanArtifact, ScannerRunResult } from './scannerRunner.js';

const TMP_ROOT = path.join(os.tmpdir(), 'servx-attack-paths');

type AttackPathFinding = {
  id: string;
  severity: 'critical' | 'medium' | 'low';
  title: string;
  detail: string;
  file?: string;
  source:
    | 'github_security_alert'
    | 'live_deployment_scan'
    | 'package_scan'
    | 'secret_scan'
    | 'sast_scan'
    | 'iac_scan'
    | 'dast_scan'
    | 'sbom_scan'
    | 'cspm_scan';
  metadata?: Record<string, any>;
};

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function saveArtifact(jobDir: string, fileName: string, content: string): Promise<ScanArtifact | undefined> {
  try {
    const targetPath = path.join(jobDir, fileName);
    await ensureDir(targetPath);
    await fs.writeFile(targetPath, content, 'utf8');
    return {
      tool: fileName,
      kind: 'report',
      path: targetPath,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
    };
  } catch {
    return undefined;
  }
}

function makeFindingId(prefix: string, identifier: string): string {
  return `${prefix}-${identifier}`.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 100);
}

export async function parseGitleaksFindings(repoId: string, result: ScannerRunResult): Promise<AttackPathFinding[]> {
  if (result.status !== 'ran' || !result.artifacts[0]?.path) return [];
  try {
    const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
    const parsed = JSON.parse(raw);
    const findings = Array.isArray(parsed) ? parsed : [];
    return findings.map((item: any) => ({
      id: makeFindingId('gitleaks', item.RuleID || item.StartLine || item.commit || 'unknown'),
      severity: (item.Severity === 'high' || item.Severity === 'critical' ? 'critical' : item.Severity === 'medium' ? 'medium' : 'low') as 'critical' | 'medium' | 'low',
      title: `Secret detected: ${item.RuleID || 'unknown rule'}`,
      detail: item.Description || item.Message || 'Potential secret detected in repository',
      file: item.File || item.file || item.Path,
      source: 'secret_scan',
      metadata: { ruleId: item.RuleID, startLine: item.StartLine, endLine: item.EndLine, fingerprint: item.Fingerprint },
    }));
  } catch {
    return [];
  }
}

export async function parseSemgrepFindings(repoId: string, result: ScannerRunResult): Promise<AttackPathFinding[]> {
  if (result.status !== 'ran' || !result.artifacts[0]?.path) return [];
  try {
    const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
    const parsed = JSON.parse(raw);
    const findings = Array.isArray(parsed?.results) ? parsed.results : [];
    return findings.map((item: any) => ({
      id: makeFindingId('semgrep', item.check_id || item.ruleId || item.fingerprint || 'unknown'),
      severity: (item.extra?.severity === 'CRITICAL' || item.extra?.severity === 'ERROR' ? 'critical' :
        item.extra?.severity === 'WARNING' ? 'medium' : 'low') as 'critical' | 'medium' | 'low',
      title: item.extra?.message || item.check_id || 'Semgrep finding',
      detail: item.extra?.message || `Rule: ${item.check_id}`,
      file: item.path,
      source: 'sast_scan',
      metadata: { checkId: item.check_id, rule: item.rule, fingerprint: item.fingerprint },
    }));
  } catch {
    return [];
  }
}

export async function parseTrivyFindings(repoId: string, result: ScannerRunResult): Promise<AttackPathFinding[]> {
  if (result.status !== 'ran' || !result.artifacts[0]?.path) return [];
  try {
    const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
    const parsed = JSON.parse(raw);
    const results = parsed?.Results || parsed?.results || [];
    const findings: AttackPathFinding[] = [];

    for (const item of results) {
      if (Array.isArray(item?.Vulnerabilities)) {
        for (const vuln of item.Vulnerabilities) {
          findings.push({
            id: makeFindingId('trivy', vuln.VulnerabilityID || vuln.PkgId || 'unknown'),
            severity: (vuln.Severity === 'CRITICAL' || vuln.Severity === 'HIGH' ? 'critical' :
              vuln.Severity === 'MEDIUM' ? 'medium' : 'low') as 'critical' | 'medium' | 'low',
            title: `${vuln.Title || vuln.VulnerabilityID || 'Vulnerability'} in ${vuln.PkgName || 'unknown package'}`,
            detail: vuln.Description || `Package vulnerability detected`,
            file: item.Target,
            source: 'package_scan',
            metadata: { vulnerabilityId: vuln.VulnerabilityID, pkgName: vuln.PkgName, installedVersion: vuln.InstalledVersion, fixedVersion: vuln.FixedVersion },
          });
        }
      }
      if (Array.isArray(item?.Misconfigurations)) {
        for (const misconf of item.Misconfigurations) {
          findings.push({
            id: makeFindingId('trivy', misconf.RuleID || 'unknown'),
            severity: (misconf.Severity === 'CRITICAL' || misconf.Severity === 'HIGH' ? 'critical' :
              misconf.Severity === 'MEDIUM' ? 'medium' : 'low') as 'critical' | 'medium' | 'low',
            title: misconf.Title || misconf.RuleID || 'IaC misconfiguration',
            detail: misconf.Description || 'Infrastructure as Code issue detected',
            file: item.Target,
            source: 'iac_scan',
            metadata: { ruleId: misconf.RuleID, category: misconf.Category },
          });
        }
      }
    }
    return findings;
  } catch {
    return [];
  }
}

export async function parseNucleiFindings(repoId: string, result: ScannerRunResult): Promise<AttackPathFinding[]> {
  if (result.status !== 'ran' || !result.artifacts[0]?.path) return [];
  try {
    const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const findings: AttackPathFinding[] = [];

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        findings.push({
          id: makeFindingId('nuclei', String(item.templateId || item['template-id'] || item.matchedAt || item.host || 'unknown')),
          severity: (item.info?.severity === 'critical' || item.info?.severity === 'high' ? 'critical' :
            item.info?.severity === 'medium' ? 'medium' : 'low') as 'critical' | 'medium' | 'low',
          title: item.info?.name || item.templateId || 'DAST finding',
          detail: item.info?.description || `Vulnerability detected at ${item.matchedAt || 'target'}`,
          source: 'dast_scan',
          metadata: { templateId: item.templateId || item['template-id'], matchedAt: item.matchedAt, host: item.host },
        });
      } catch {
        // skip malformed lines
      }
    }
    return findings;
  } catch {
    return [];
  }
}

export async function parseSyftFindings(repoId: string, result: ScannerRunResult): Promise<AttackPathFinding[]> {
  if (result.status !== 'ran' || !result.artifacts[0]?.path) return [];
  try {
    const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
    const parsed = JSON.parse(raw);
    const artifacts = Array.isArray(parsed?.artifacts) ? parsed.artifacts : [];
    return artifacts.map((item: any) => ({
      id: makeFindingId('syft', item.id || item.name || 'unknown'),
      severity: 'low',
      title: `Component: ${item.name || item.id || 'Unknown'}`,
      detail: `Package discovered: ${item.name || 'unknown'} ${item.version || ''}`,
      source: 'sbom_scan',
      metadata: { id: item.id, name: item.name, version: item.version, type: item.type },
    }));
  } catch {
    return [];
  }
}

export async function parseCloudSploitFindings(repoId: string, result: ScannerRunResult): Promise<AttackPathFinding[]> {
  if (result.status !== 'ran' || !result.artifacts[0]?.path) return [];
  try {
    const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
    const parsed = JSON.parse(raw);
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    return results.map((item: any) => ({
      id: makeFindingId('cloudsploit', item.pluginId || item.id || 'unknown'),
      severity: (item.severity === 'critical' || item.severity === 'high' ? 'critical' :
        item.severity === 'medium' ? 'medium' : 'low') as 'critical' | 'medium' | 'low',
      title: item.pluginName || item.pluginId || 'CSPM finding',
      detail: item.description || 'Cloud security posture issue detected',
      source: 'cspm_scan',
      metadata: { pluginId: item.pluginId, region: item.region, resource: item.resource },
    }));
  } catch {
    return [];
  }
}

export async function runNuclei(params: {
  targetUrl: string;
  jobDir: string;
  timeoutMs?: number;
}): Promise<ScannerRunResult> {
  const { targetUrl, jobDir, timeoutMs = 10 * 60 * 1000 } = params;

  const artifactPath = path.join(jobDir, 'nuclei-report.json');
  const args = ['-json', '-u', targetUrl, '-o', artifactPath, '-timeout', '10', '-retries', '1'];

  const result = await spawnScanner('nuclei', args, jobDir, timeoutMs, artifactPath);
  if (result.status === 'skipped') return result;

  let findingsCount = 0;
  if (result.status === 'ran' && result.artifacts[0]?.path) {
    try {
      const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      findingsCount = lines.length;
      const normalizedPath = path.join(jobDir, 'nuclei-normalized.json');
      await saveArtifact(jobDir, 'nuclei-normalized.json', JSON.stringify({ findings: lines.length, sample: lines.slice(0, 5) }, null, 2));
    } catch {
      findingsCount = 0;
    }
  }

  return { ...result, findingsCount };
}

export async function runGitleaks(params: {
  repoDir: string;
  jobDir: string;
  timeoutMs?: number;
}): Promise<ScannerRunResult> {
  const { repoDir, jobDir, timeoutMs = 10 * 60 * 1000 } = params;

  const artifactPath = path.join(jobDir, 'gitleaks-report.json');
  const args = ['detect', '--source', repoDir, '--report-path', artifactPath, '--report-format', 'json', '--no-git', '--redact'];

  const result = await spawnScanner('gitleaks', args, jobDir, timeoutMs, artifactPath);
  if (result.status === 'skipped') return result;

  let findingsCount = 0;
  if (result.status === 'ran' && result.artifacts[0]?.path) {
    try {
      const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
      const parsed = JSON.parse(raw);
      findingsCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      findingsCount = 0;
    }
  }

  return { ...result, findingsCount };
}

export async function runTrivy(params: {
  target: string;
  jobDir: string;
  timeoutMs?: number;
}): Promise<ScannerRunResult> {
  const { target, jobDir, timeoutMs = 15 * 60 * 1000 } = params;

  const artifactPath = path.join(jobDir, 'trivy-report.json');
  const args = ['fs', '--format', 'json', '--output', artifactPath, '--scanners', 'vuln,secret,config', target];

  const result = await spawnScanner('trivy', args, jobDir, timeoutMs, artifactPath);
  if (result.status === 'skipped') return result;

  let findingsCount = 0;
  if (result.status === 'ran' && result.artifacts[0]?.path) {
    try {
      const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
      const parsed = JSON.parse(raw);
      const results = parsed?.Results || parsed?.results || [];
      findingsCount = results.reduce((acc: number, item: any) => acc + (Array.isArray(item?.Vulnerabilities) ? item.Vulnerabilities.length : 0), 0);
    } catch {
      findingsCount = 0;
    }
  }

  return { ...result, findingsCount };
}

export async function runSemgrep(params: {
  repoDir: string;
  jobDir: string;
  timeoutMs?: number;
}): Promise<ScannerRunResult> {
  const { repoDir, jobDir, timeoutMs = 15 * 60 * 1000 } = params;

  const artifactPath = path.join(jobDir, 'semgrep-report.json');
  const args = ['scan', '--json', '--output', artifactPath, '--quiet', '--no-ansi', repoDir];

  const result = await spawnScanner('semgrep', args, jobDir, timeoutMs, artifactPath);
  if (result.status === 'skipped') return result;

  let findingsCount = 0;
  if (result.status === 'ran' && result.artifacts[0]?.path) {
    try {
      const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
      const parsed = JSON.parse(raw);
      findingsCount = Array.isArray(parsed?.results) ? parsed.results.length : 0;
    } catch {
      findingsCount = 0;
    }
  }

  return { ...result, findingsCount };
}

export async function runSyft(params: {
  target: string;
  jobDir: string;
  timeoutMs?: number;
}): Promise<ScannerRunResult> {
  const { target, jobDir, timeoutMs = 10 * 60 * 1000 } = params;

  const artifactPath = path.join(jobDir, 'syft-sbom.json');
  const args = ['scan', target, '-o', `json:${artifactPath}`];

  const result = await spawnScanner('syft', args, jobDir, timeoutMs, artifactPath);
  if (result.status === 'skipped') return result;

  let findingsCount = 0;
  if (result.status === 'ran' && result.artifacts[0]?.path) {
    try {
      const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
      const parsed = JSON.parse(raw);
      findingsCount = Array.isArray(parsed?.artifacts) ? parsed.artifacts.length : 1;
    } catch {
      findingsCount = 1;
    }
  }

  return { ...result, findingsCount };
}

export async function runCloudSploit(params: {
  cloud?: 'aws' | 'gcp' | 'azure';
  jobDir: string;
  timeoutMs?: number;
}): Promise<ScannerRunResult> {
  const { cloud = 'aws', jobDir, timeoutMs = 10 * 60 * 1000 } = params;

  const artifactPath = path.join(jobDir, 'cloudsploit-report.json');
  const args = ['--cloud', cloud, '--json', artifactPath, '--ignore-ok', '--exit-code'];

  const result = await spawnScanner('node', ['/tmp/cloudsploit/index.js', ...args], jobDir, timeoutMs, artifactPath);
  if (result.status === 'skipped') return result;

  let findingsCount = 0;
  if (result.status === 'ran' && result.artifacts[0]?.path) {
    try {
      const raw = await fs.readFile(result.artifacts[0].path, 'utf8');
      const parsed = JSON.parse(raw);
      findingsCount = Array.isArray(parsed?.results) ? parsed.results.length : 0;
    } catch {
      findingsCount = 0;
    }
  }

  return { ...result, findingsCount };
}

async function spawnScanner(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  artifactPath: string
): Promise<ScannerRunResult> {
  try {
    const which = await new Promise<string>((resolve, reject) => {
      const child = spawn('which', [command], { stdio: ['ignore', 'pipe', 'pipe'] });
      let data = '';
      child.stdout?.on('data', (chunk) => { data += chunk.toString(); });
      child.on('error', () => reject(new Error('not-found')));
      child.on('close', (code) => (code === 0 ? resolve(data.trim()) : reject(new Error('not-found'))));
    });

    if (!which) {
      return {
        tool: command,
        status: 'skipped',
        findingsCount: 0,
        artifacts: [],
        error: `${command} is not installed on this worker.`,
      };
    }
  } catch {
    return {
      tool: command,
      status: 'skipped',
      findingsCount: 0,
      artifacts: [],
      error: `${command} is not installed on this worker.`,
    };
  }

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const timer = setTimeout(async () => {
      if (finished) return;
      finished = true;
      try { child.kill('SIGTERM'); } catch {}
      if (artifactPath && stdout) {
        await fs.writeFile(artifactPath, Buffer.from(stdout, 'utf8')).catch(() => {});
      }
      resolve({
        tool: command,
        status: 'failed',
        findingsCount: 0,
        artifacts: artifactPath ? [{ tool: command, kind: 'report', path: artifactPath, sizeBytes: Buffer.byteLength(stdout, 'utf8') }] : [],
        error: 'Scanner timed out',
        rawExitCode: -1,
      });
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', async (err) => {
      if (finished) return;
      finished = true;
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
      if (finished) return;
      finished = true;
      clearTimeout(timer);

      if (artifactPath) {
        await fs.writeFile(artifactPath, Buffer.from(stdout || '', 'utf8')).catch(() => {});
      }

      resolve({
        tool: command,
        status: code === 0 || code === 1 ? 'ran' : 'failed',
        findingsCount: 0,
        artifacts: artifactPath ? [{ tool: command, kind: 'report', path: artifactPath, sizeBytes: Buffer.byteLength(stdout || '', 'utf8') }] : [],
        error: code === 0 || code === 1 ? undefined : stderr || `exit code ${code}`,
        rawExitCode: code ?? undefined,
      });
    });
  });
}
