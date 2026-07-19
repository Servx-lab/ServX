import fs from 'fs/promises';
import AttackPathsJobModel from '../../../../api/models/AttackPathsJob.js';
import {
  setAttackPathsJobResult,
  updateAttackPathsJobProgress,
} from '../../../../api/src/domains/attack-paths/services/attackPathsJobService.js';
import { decrypt } from '@servx/crypto';
import { scanLiveDeployment } from '../../../../api/src/services/dastScanner.js';
import { fetchRepoSecurityData } from '../../../../api/src/services/githubGraphScanner.js';
import {
  transformVulnerabilityAlerts,
  type VulnerabilityItem,
} from '../../../../api/src/services/vulnerabilityTransform.js';
import { getUserInstallationToken } from '../../../../api/src/services/githubInstallationTokenStore.js';
import { materializeRepoFromGitHub } from './repoMaterializer.js';
import {
  detectScannerTools,
  ensureJobWorkspace,
  type ScannerRunResult,
} from '../../scanner/scannerRunner.js';
import {
  runNuclei,
  runGitleaks,
  runTrivy,
  runSemgrep,
  runSyft,
  runCloudSploit,
  parseGitleaksFindings,
  parseSemgrepFindings,
  parseTrivyFindings,
  parseNucleiFindings,
  parseSyftFindings,
  parseCloudSploitFindings,
} from '../../scanner/scannerWrappers.js';

const OSV_API_URL = 'https://osv.dev/api/v1/query';

const processAny = (globalThis as any).process as any;

const JOB_POLL_MS = Number(processAny?.env?.ATTACK_PATHS_POLL_MS || 2000);
const MAX_JOBS_PER_CYCLE = Number(processAny?.env?.ATTACK_PATHS_MAX_JOBS_PER_CYCLE || 3);

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

type OwaspCategoryStatus = 'covered' | 'partial' | 'not_assessed';
type OwaspVerdict = 'pass' | 'partial' | 'fail' | 'not_assessed';

type OwaspCategorySummary = {
  id: string;
  name: string;
  status: OwaspCategoryStatus;
  findingsCount: number;
  criticalCount: number;
  evidenceSources: string[];
  notes?: string;
};

type OwaspAssuranceSummary = {
  framework: 'OWASP Web Top 10';
  version: '2025';
  verdict: OwaspVerdict;
  coveragePct: number;
  totalFindings: number;
  categories: OwaspCategorySummary[];
};

async function claimOneQueuedJob(): Promise<any | null> {
  const job = await AttackPathsJobModel.findOne({ status: 'queued' })
    .sort({ createdAt: 1 })
    .exec();

  if (!job) return null;

  const claimed = await AttackPathsJobModel.findOneAndUpdate(
    { _id: job._id, status: 'queued' },
    {
      $set: {
        status: 'cpgraph_building',
        phaseMessage: 'Preparing repository scan inputs...',
        progressPct: 5,
        startedAt: job.startedAt || new Date(),
      },
    },
    { returnDocument: 'after' as any }
  ).exec();

  return claimed as any;
}

function safeRepoFullName(repoFullName: string) {
  return String(repoFullName || '').trim();
}

function safeTargetUrl(targetUrl: string | undefined) {
  const value = String(targetUrl || '').trim();
  if (!value) return '';

  try {
    return new URL(value).toString();
  } catch {
    return '';
  }
}

async function fetchPackageJsonFromGitHub(
  token: string,
  owner: string,
  repo: string
): Promise<{ dependencies: Record<string, string>; devDependencies: Record<string, string> } | null> {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'ServX-AttackPaths-Worker',
  };

  const candidates = ['package.json', 'app/package.json', 'apps/web/package.json', 'apps/api/package.json', 'frontend/package.json'];

  for (const filePath of candidates) {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        headers,
        cache: 'no-store',
      });

      if (!response.ok) continue;

      const data = (await response.json()) as any;
      if (!data?.content || data.encoding !== 'base64') continue;

      const raw = Buffer.from(data.content, 'base64').toString('utf8');
      const parsed = JSON.parse(raw);

      return {
        dependencies: (parsed.dependencies || {}) as Record<string, string>,
        devDependencies: (parsed.devDependencies || {}) as Record<string, string>,
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function queryOsvForPackage(name: string, ecosystem: string, version?: string): Promise<any[]> {
  const body: Record<string, unknown> = {
    package: { name, ecosystem },
  };

  if (version && version !== 'latest' && version !== '*' && version !== '') {
    body.version = version;
  }

  const response = await fetch(OSV_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as any;
  return Array.isArray(data.vulns) ? data.vulns : [];
}

function mapOsvSeverityToFindingSeverity(severity: unknown): 'critical' | 'medium' | 'low' {
  const raw = typeof severity === 'string' ? severity.toLowerCase() : '';
  if (raw.includes('critical')) return 'critical';
  if (raw.includes('high')) return 'critical';
  if (raw.includes('moderate') || raw.includes('medium')) return 'medium';
  return 'low';
}

async function scanPackageDependencies(
  token: string,
  owner: string,
  repo: string,
  repoId: string
): Promise<AttackPathFinding[]> {
  const manifest = await fetchPackageJsonFromGitHub(token, owner, repo);
  if (!manifest) {
    return [];
  }

  const allDeps = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };

  const entries = Object.entries(allDeps);
  if (entries.length === 0) {
    return [];
  }

  const findings: AttackPathFinding[] = [];
  const seen = new Set<string>();

  for (const [name, rawVersion] of entries) {
    const version = String(rawVersion || '').replace(/^[\^~>=<]+/, '').trim();
    if (!version) continue;

    const vulns = await queryOsvForPackage(name, 'npm', version);
    for (const vuln of vulns) {
      const id = String(vuln.id || `${repoId}-osv-${name}-${version}`);
      if (seen.has(id)) continue;
      seen.add(id);

      const summary = String(vuln.summary || vuln.details || `Known vulnerability in ${name}`).trim();
      const severity = mapOsvSeverityToFindingSeverity((vuln.severity || [])[0]);

      findings.push({
        id,
        severity,
        title: `Dependency vulnerability: ${name}@${version}`,
        detail: summary,
        file: 'package.json',
        source: 'package_scan',
        metadata: {
          packageName: name,
          version,
          osvId: vuln.id,
          aliases: vuln.aliases || [],
          published: vuln.published || null,
        },
      });
    }
  }

  return findings;
}

const AWS_ACCESS_KEY_RE = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/;
const GITHUB_TOKEN_RE = /\b(?:ghp|github_pat|gho|ghu|ghs|ghx)_[A-Za-z0-9_]{36,}\b/;
const GENERIC_API_KEY_RE = /(?:api[_-]?key|apikey|secret|token|password)\s*[:=]\s*['"][^'"]{12,}['"]/i;
const AWS_SECRET_RE = /(?:aws.{0,10}?(?:secret|password))\s*[:=]\s*['"][^'"]{12,}['"]/i;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\b/;
const BASIC_AUTH_RE = /authorization:\s*basic\s+[a-zA-Z0-9+/=]{20,}/i;

async function scanForSecrets(
  repoId: string,
  files: Array<{ path: string; content?: string }>
): Promise<AttackPathFinding[]> {
  const findings: AttackPathFinding[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const content = file.content || '';
    if (!content.trim()) continue;

    const checks: Array<{ pattern: RegExp; title: string; detail: string; severity: 'critical' | 'medium' | 'low' }> = [
      {
        pattern: AWS_ACCESS_KEY_RE,
        title: 'AWS access key detected',
        detail: 'An AWS access key ID was detected in source. Rotate it immediately and move it to a secrets manager.',
        severity: 'critical',
      },
      {
        pattern: AWS_SECRET_RE,
        title: 'AWS secret reference detected',
        detail: 'A reference that looks like an AWS secret was detected. Rotate affected credentials and remove them from source.',
        severity: 'critical',
      },
      {
        pattern: GITHUB_TOKEN_RE,
        title: 'GitHub token detected',
        detail: 'A GitHub token or PAT was detected in source. Revoke it immediately and rotate to a stored secret.',
        severity: 'critical',
      },
      {
        pattern: JWT_RE,
        title: 'JWT-style token detected',
        detail: 'A bearer-style token was detected in source. Treat it as compromised and rotate it.',
        severity: 'critical',
      },
      {
        pattern: BASIC_AUTH_RE,
        title: 'Basic auth credential detected',
        detail: 'A base64-encoded basic auth credential was detected in source. Revoke and rotate it.',
        severity: 'critical',
      },
      {
        pattern: GENERIC_API_KEY_RE,
        title: 'Generic secret pattern detected',
        detail: 'A string assigned to a secret-like key was detected in source. Confirm it is not a production credential.',
        severity: 'medium',
      },
    ];

    for (const check of checks) {
      const match = content.match(check.pattern);
      if (!match) continue;

      const id = `${repoId}-secret-${file.path}-${check.title}`;
      if (seen.has(id)) continue;
      seen.add(id);

      findings.push({
        id,
        severity: check.severity,
        title: check.title,
        detail: check.detail,
        file: file.path,
        source: 'secret_scan',
        metadata: {
          pattern: check.title,
          matched: match[0] ? maskSecret(match[0]) : undefined,
        },
      });
    }
  }

  return findings;
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function scanForSastPatterns(
  repoId: string,
  files: Array<{ path: string; content?: string }>
): Promise<AttackPathFinding[]> {
  const findings: AttackPathFinding[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const content = file.content || '';
    if (!content.trim()) continue;
    const lines = content.split(/\r?\n/);

    const patterns: Array<{ expression: RegExp; title: string; detail: string; severity: 'critical' | 'medium' | 'low' }> = [
      {
        expression: /\beval\s*\(/,
        title: 'Suspicious eval() usage',
        detail: 'eval() executes dynamic code and is a common source of injection attacks. Validate and remove it if possible.',
        severity: 'critical',
      },
      {
        expression: /new\s+Function\s*\(/,
        title: 'Suspicious Function constructor usage',
        detail: 'new Function() compiles dynamic code at runtime. Prefer static implementations.',
        severity: 'critical',
      },
      {
        expression: /innerHTML\s*=|document\.write\s*\(/,
        title: 'Potential DOM XSS sink',
        detail: 'Direct DOM manipulation with untrusted content can enable cross-site scripting. Use safe APIs.',
        severity: 'medium',
      },
      {
        expression: /(?:query|execute|exec)\s*\(\s*(?:`|\${)/,
        title: 'Potential SQL/command injection',
        detail: 'Dynamic query or command assembly was detected. Use parameterized queries or validated inputs.',
        severity: 'critical',
      },
      {
        expression: /\.exec\s*\(/,
        title: 'Potential command execution',
        detail: 'Child process execution was detected. Avoid shell execution with unsanitized input.',
        severity: 'medium',
      },
      {
        expression: /\$or\s*:\s*\[/,
        title: 'Potential NoSQL injection',
        detail: 'Mongo-style query operators are being constructed dynamically. Validate input types.',
        severity: 'medium',
      },
    ];

    for (const pattern of patterns) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(pattern.expression);
        if (!match) continue;

        const id = `${repoId}-sast-${file.path}-${i + 1}-${pattern.title}`;
        if (seen.has(id)) continue;
        seen.add(id);

        findings.push({
          id,
          severity: pattern.severity,
          title: pattern.title,
          detail: pattern.detail,
          file: `${file.path}:${i + 1}`,
          source: 'sast_scan',
          metadata: {
            line: i + 1,
            snippet: line.trim(),
          },
        });
      }
    }
  }

  return findings;
}

async function scanForIacIssues(
  repoId: string,
  files: Array<{ path: string; content?: string }>
): Promise<AttackPathFinding[]> {
  const findings: AttackPathFinding[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const content = file.content || '';
    const fileName = file.path.split('/').pop()?.toLowerCase() || '';

    if (fileName === 'dockerfile' || /dockerfile/i.test(file.path)) {
      if (/USER\s+root/i.test(content) && !/USER\s+(?!root\b)[a-zA-Z0-9_-]+/i.test(content)) {
        const id = `${repoId}-iac-root-${file.path}`;
        if (!seen.has(id)) {
          seen.add(id);
          findings.push({
            id,
            severity: 'medium',
            title: 'Container runs as root',
            detail: 'The Dockerfile does not downgrade to a non-root user. Run containers with the least privilege.',
            file: file.path,
            source: 'iac_scan',
          });
        }
      }

      if (!/HEALTHCHECK/i.test(content)) {
        const id = `${repoId}-iac-healthcheck-${file.path}`;
        if (!seen.has(id)) {
          seen.add(id);
          findings.push({
            id,
            severity: 'low',
            title: 'Missing docker HEALTHCHECK',
            detail: 'A HEALTHCHECK instruction helps orchestrators detect unhealthy containers earlier.',
            file: file.path,
            source: 'iac_scan',
          });
        }
      }
    }

    if (fileName === 'vercel.json' || /vercel/i.test(file.path)) {
      if (!/content-security-policy/i.test(content)) {
        const id = `${repoId}-iac-csp-${file.path}`;
        if (!seen.has(id)) {
          seen.add(id);
          findings.push({
            id,
            severity: 'medium',
            title: 'Missing CSP header in Vercel config',
            detail: 'Add a Content-Security-Policy header in vercel.json to mitigate XSS risk.',
            file: file.path,
            source: 'iac_scan',
          });
        }
      }

      if (/cors|access-control-allow-origin[\s\S]*?\*/i.test(content)) {
        const id = `${repoId}-iac-cors-${file.path}`;
        if (!seen.has(id)) {
          seen.add(id);
          findings.push({
            id,
            severity: 'medium',
            title: 'Overly permissive CORS configuration',
            detail: 'CORS is allowing all origins. Restrict access to trusted domains.',
            file: file.path,
            source: 'iac_scan',
          });
        }
      }
    }

    if (fileName.endsWith('.tf') || fileName === 'render.yaml' || fileName === 'render.yml') {
      const hasPublicBucket = /public\s*[:=]\s*true|acl\s*[:=]\s*['"]public['"]/i.test(content);
      if (hasPublicBucket) {
        const id = `${repoId}-iac-public-bucket-${file.path}`;
        if (!seen.has(id)) {
          seen.add(id);
          findings.push({
            id,
            severity: 'critical',
            title: 'Public bucket exposure detected in IaC',
            detail: 'Infrastructure as code allows public object access. Restrict bucket access to private or required principals.',
            file: file.path,
            source: 'iac_scan',
          });
        }
      }
    }
  }

  return findings;
}

async function scanForDastSignals(repoId: string, targetUrl: string): Promise<AttackPathFinding[]> {
  const findings: AttackPathFinding[] = [];

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
    });

    const headers = response.headers;

    if (!headers.has('x-content-type-options')) {
      findings.push({
        id: `${repoId}-dast-mime-sniffing`,
        severity: 'low',
        title: 'Missing X-Content-Type-Options header',
        detail: 'Add the X-Content-Type-Options nosniff header to prevent MIME type confusion attacks.',
        file: targetUrl,
        source: 'dast_scan',
      });
    }

    if (!headers.has('strict-transport-security')) {
      findings.push({
        id: `${repoId}-dast-hsts`,
        severity: 'medium',
        title: 'Missing HSTS header',
        detail: 'Add Strict-Transport-Security to enforce HTTPS on future requests.',
        file: targetUrl,
        source: 'dast_scan',
      });
    }

    if (!headers.has('x-frame-options') && !/frame-ancestors/i.test(headers.get('content-security-policy') || '')) {
      findings.push({
        id: `${repoId}-dast-clickjack`,
        severity: 'medium',
        title: 'Missing clickjacking protection',
        detail: 'Add X-Frame-Options or a frame-ancestors CSP directive to prevent clickjacking.',
        file: targetUrl,
        source: 'dast_scan',
      });
    }

    if (headers.get('access-control-allow-origin') === '*') {
      findings.push({
        id: `${repoId}-dast-cors`,
        severity: 'medium',
        title: 'Wildcard CORS on live target',
        detail: 'Access-Control-Allow-Origin is *, which allows any origin to read authenticated responses.',
        file: targetUrl,
        source: 'dast_scan',
      });
    }

    const cookieHeader = headers.get('set-cookie') || '';
    if (cookieHeader.length > 0 && !/secure/i.test(cookieHeader)) {
      findings.push({
        id: `${repoId}-dast-cookie-secure`,
        severity: 'medium',
        title: 'Cookie missing Secure flag',
        detail: 'Session cookies should include the Secure flag to enforce HTTPS-only transmission.',
        file: targetUrl,
        source: 'dast_scan',
      });
    }
  } catch {
    // ignore live target probe failures
  }

  return findings;
}

async function extractSbomManifest(repoId: string, files: Array<{ path: string; content?: string }>): Promise<AttackPathFinding[]> {
  const findings: AttackPathFinding[] = [];
  const seen = new Set<string>();

  const manifestFiles = files.filter((file) => /(^|\/)package\.json$|(^|\/)package-lock\.json$|(^|\/)yarn\.lock$|(^|\/)pnpm-lock\.yaml$|(^|\/)bun\.lockb$|(^|\/)go\.mod$/i.test(file.path));

  if (manifestFiles.length === 0) {
    return findings;
  }

  for (const file of manifestFiles) {
    const id = `${repoId}-sbom-${file.path}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const ext = file.path.split('.').pop()?.toLowerCase();
    findings.push({
      id,
      severity: 'low',
      title: 'Software inventory found',
      detail: `A ${ext ? ext.toUpperCase() : 'manifest'} file was detected at ${file.path}. Keep it updated to maintain an accurate supply-chain inventory.`,
      file: file.path,
      source: 'sbom_scan',
      metadata: {
        manifestType: ext || 'unknown',
      },
    });
  }

  return findings;
}

async function scanForCspmConfigs(repoId: string, files: Array<{ path: string; content?: string }>): Promise<AttackPathFinding[]> {
  const findings: AttackPathFinding[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const content = file.content || '';
    if (!content.trim()) continue;

    if (/(^|\/)\.env(\.|$)/i.test(file.path)) {
      const id = `${repoId}-cspm-${file.path}-env`;
      if (!seen.has(id)) {
        seen.add(id);
        findings.push({
          id,
          severity: 'medium',
          title: 'Environment file detected',
          detail: 'An environment file was detected. Verify no production secrets are stored in it.',
          file: file.path,
          source: 'cspm_scan',
        });
      }
    }

    if (/(aws|gcp|azure|iam|bucket|storage|cloud)/i.test(file.path)) {
      const id = `${repoId}-cspm-${file.path}-cloud`;
      if (!seen.has(id)) {
        seen.add(id);
        findings.push({
          id,
          severity: 'medium',
          title: 'Cloud credentials or config reference detected',
          detail: 'Files reference cloud provider configurations. Ensure least-privilege IAM and audit external access.',
          file: file.path,
          source: 'cspm_scan',
        });
      }
    }
  }

  return findings;
}

function mapSeverity(value: string | undefined): 'critical' | 'medium' | 'low' {
  const upper = String(value || '').toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH') return 'critical';
  if (upper === 'MODERATE' || upper === 'MEDIUM') return 'medium';
  return 'low';
}

function makeGitHubFindings(repoId: string, alerts: VulnerabilityItem[]): AttackPathFinding[] {
  return alerts.map((alert, index) => ({
    id: `${repoId}-gh-${index + 1}`,
    severity: mapSeverity(alert.severity),
    title: `Dependency vulnerability: ${alert.packageName}`,
    detail: [
      alert.advisorySummary || 'Open GitHub security alert detected for this dependency.',
      alert.vulnerableVersionRange ? `Affected: ${alert.vulnerableVersionRange}.` : null,
      alert.firstPatchedVersion ? `Patch: ${alert.firstPatchedVersion}.` : null,
      typeof alert.cvssScore === 'number' ? `CVSS: ${alert.cvssScore}.` : null,
    ]
      .filter(Boolean)
      .join(' '),
    file: 'package manifest / dependency graph',
    source: 'github_security_alert',
    metadata: {
      packageName: alert.packageName,
      severity: alert.severity,
      cvssScore: alert.cvssScore,
      createdAt: alert.createdAt,
    },
  }));
}

function makeLiveFindings(repoId: string, targetUrl: string, findings: Array<{ type: string; pattern: string; context: string; source: string }>): AttackPathFinding[] {
  return findings.map((finding, index) => ({
    id: `${repoId}-live-${index + 1}`,
    severity: finding.pattern === 'aws_key' || finding.pattern === 'stripe' || finding.pattern === 'github' ? 'critical' : 'medium',
    title: `Live exposure detected: ${finding.pattern}`,
    detail: `${finding.type} observed while scanning ${targetUrl}. ${finding.context}`,
    file: finding.source,
    source: 'live_deployment_scan',
    metadata: {
      pattern: finding.pattern,
      source: finding.source,
      targetUrl,
    },
  }));
}

function categoriesForFinding(finding: AttackPathFinding): string[] {
  const source = finding.source;
  const title = finding.title.toLowerCase();

  if (source === 'github_security_alert' || source === 'package_scan' || source === 'sbom_scan') {
    return ['A08'];
  }
  if (source === 'secret_scan' || title.includes('token') || title.includes('key')) {
    return ['A04', 'A02'];
  }
  if (source === 'iac_scan' || source === 'cspm_scan') {
    return ['A02'];
  }
  if (source === 'dast_scan' || source === 'live_deployment_scan') {
    if (title.includes('cors') || title.includes('access control') || title.includes('clickjacking')) return ['A01', 'A02'];
    if (title.includes('cookie') || title.includes('hsts') || title.includes('header')) return ['A02'];
    return ['A05', 'A02'];
  }
  if (source === 'sast_scan') {
    if (title.includes('injection')) return ['A05'];
    if (title.includes('eval') || title.includes('function constructor')) return ['A06'];
    if (title.includes('xss')) return ['A03'];
    return ['A05'];
  }
  return [];
}

function buildOwaspWebAssuranceSummary(findings: AttackPathFinding[], toolStatuses: ScannerRunResult[]): OwaspAssuranceSummary {
  const categories: Array<{ id: string; name: string; assessable: boolean }> = [
    { id: 'A01', name: 'Broken Access Control', assessable: true },
    { id: 'A02', name: 'Security Misconfiguration', assessable: true },
    { id: 'A03', name: 'Cross-Site Scripting / Client-Side Injection', assessable: true },
    { id: 'A04', name: 'Cryptographic Failures', assessable: true },
    { id: 'A05', name: 'Injection', assessable: true },
    { id: 'A06', name: 'Insecure Design', assessable: false },
    { id: 'A08', name: 'Software and Data Integrity Failures', assessable: true },
    { id: 'A09', name: 'Security Logging and Monitoring Failures', assessable: false },
  ];

  const summaries: OwaspCategorySummary[] = categories.map((category) => {
    const relatedFindings = findings.filter((finding) => categoriesForFinding(finding).includes(category.id));
    const criticalCount = relatedFindings.filter((finding) => finding.severity === 'critical').length;
    const evidenceSources = Array.from(new Set(relatedFindings.map((finding) => finding.source)));

    let status: OwaspCategoryStatus = 'not_assessed';
    let notes = '';

    if (!category.assessable) {
      status = 'not_assessed';
      notes = 'Requires architectural review or non-automated assessment.';
    } else if (relatedFindings.length > 0) {
      status = 'covered';
      if (criticalCount > 0) {
        notes = `${criticalCount} critical findings require remediation.`;
      }
    } else {
      const hasRelevantTool =
        (category.id === 'A01' && findings.some((f) => f.source === 'dast_scan' || f.source === 'live_deployment_scan')) ||
        (category.id === 'A02' && findings.some((f) => f.source === 'iac_scan' || f.source === 'cspm_scan' || f.source === 'dast_scan')) ||
        (category.id === 'A03' && findings.some((f) => f.source === 'sast_scan')) ||
        (category.id === 'A04' && findings.some((f) => f.source === 'secret_scan')) ||
        (category.id === 'A05' && findings.some((f) => f.source === 'sast_scan' || f.source === 'dast_scan')) ||
        (category.id === 'A08' && findings.some((f) => f.source === 'package_scan' || f.source === 'github_security_alert' || f.source === 'sbom_scan'));

      status = hasRelevantTool ? 'partial' : 'not_assessed';
      notes = hasRelevantTool ? 'Coverage exists, but no direct finding was detected in this run.' : 'No scanner evidence for this category.';
    }

    return {
      id: category.id,
      name: category.name,
      status,
      findingsCount: relatedFindings.length,
      criticalCount,
      evidenceSources,
      notes,
    };
  });

  const assessable = summaries.filter((item) => item.status !== 'not_assessed' || categories.find((c) => c.id === item.id)?.assessable);
  const covered = summaries.filter((item) => item.status === 'covered').length;
  const partial = summaries.filter((item) => item.status === 'partial').length;
  const critical = findings.filter((finding) => finding.severity === 'critical').length;
  const coveragePct = Math.round((covered / Math.max(1, assessable.length)) * 100);

  let verdict: OwaspVerdict = 'not_assessed';
  if (findings.length === 0 && partial === 0 && covered === 0) {
    verdict = 'not_assessed';
  } else if (critical > 0) {
    verdict = 'fail';
  } else if (partial > 0 || summaries.some((item) => item.status === 'not_assessed' && categories.find((c) => c.id === item.id)?.assessable)) {
    verdict = 'partial';
  } else {
    verdict = 'pass';
  }

  return {
    framework: 'OWASP Web Top 10',
    version: '2025',
    verdict,
    coveragePct,
    totalFindings: findings.length,
    categories: summaries,
  };
}

function buildGraphArtifact(params: {
  repoFullName: string;
  targetUrl: string;
  githubFindings: AttackPathFinding[];
  packageScanFindings: AttackPathFinding[];
  secretFindings: AttackPathFinding[];
  sastFindings: AttackPathFinding[];
  iacFindings: AttackPathFinding[];
  dastFindings: AttackPathFinding[];
  sbomFindings: AttackPathFinding[];
  cspmFindings: AttackPathFinding[];
  liveFindings: AttackPathFinding[];
  failedScanners: Array<{ scanner: string; error: string }>;
  toolStatuses: ScannerRunResult[];
  assuranceSummary: OwaspAssuranceSummary;
}) {
  const {
    repoFullName,
    targetUrl,
    githubFindings,
    packageScanFindings,
    secretFindings,
    sastFindings,
    iacFindings,
    dastFindings,
    sbomFindings,
    cspmFindings,
    liveFindings,
    failedScanners,
    toolStatuses,
    assuranceSummary,
  } = params;

  const nodes: any[] = [
    { id: 'repo', type: 'repo', label: repoFullName },
    { id: 'deps', type: 'scan', label: 'GitHub Security Alerts' },
    { id: 'packages', type: 'scan', label: 'Package Dependency Scan (OSV)' },
  ];
  const edges: any[] = [
    { from: 'repo', to: 'deps', type: 'analyzes' },
    { from: 'repo', to: 'packages', type: 'analyzes' },
  ];

  if (secretFindings.length || toolStatuses.some((t) => t.tool === 'gitleaks')) {
    nodes.push({ id: 'secrets', type: 'scan', label: 'Secret Scan' });
    edges.push({ from: 'repo', to: 'secrets', type: 'analyzes' });
  }
  if (sastFindings.length || toolStatuses.some((t) => t.tool === 'semgrep')) {
    nodes.push({ id: 'sast', type: 'scan', label: 'SAST Scan' });
    edges.push({ from: 'repo', to: 'sast', type: 'analyzes' });
  }
  if (iacFindings.length || toolStatuses.some((t) => t.tool === 'trivy')) {
    nodes.push({ id: 'iac', type: 'scan', label: 'IaC Scan' });
    edges.push({ from: 'repo', to: 'iac', type: 'analyzes' });
  }
  if (dastFindings.length || toolStatuses.some((t) => t.tool === 'nuclei')) {
    nodes.push({ id: 'dast', type: 'scan', label: 'DAST Signals' });
    edges.push({ from: 'repo', to: 'dast', type: 'analyzes' });
  }

  if (targetUrl) {
    nodes.push({ id: 'live', type: 'scan', label: targetUrl });
    edges.push({ from: 'repo', to: 'live', type: 'analyzes' });
  }

  if (sbomFindings.length || toolStatuses.some((t) => t.tool === 'syft')) {
    nodes.push({ id: 'sbom', type: 'inventory', label: 'SBOM / Inventory' });
    edges.push({ from: 'repo', to: 'sbom', type: 'analyzes' });
  }
  if (cspmFindings.length || toolStatuses.some((t) => t.tool === 'cloudsploit')) {
    nodes.push({ id: 'cspm', type: 'scan', label: 'CSPM Configs' });
    edges.push({ from: 'repo', to: 'cspm', type: 'analyzes' });
  }

  return {
    version: 'v5-owasp-web-assurance',
    summary: {
      repoFullName,
      targetUrl: targetUrl || null,
      githubFindings: githubFindings.length,
      packageScanFindings: packageScanFindings.length,
      secretFindings: secretFindings.length,
      sastFindings: sastFindings.length,
      iacFindings: iacFindings.length,
      dastFindings: dastFindings.length,
      sbomFindings: sbomFindings.length,
      cspmFindings: cspmFindings.length,
      liveFindings: liveFindings.length,
      totalFindings:
        githubFindings.length +
        packageScanFindings.length +
        secretFindings.length +
        sastFindings.length +
        iacFindings.length +
        dastFindings.length +
        sbomFindings.length +
        cspmFindings.length +
        liveFindings.length,
      assuranceSummary,
      toolStatuses: toolStatuses.map((tool) => ({
        tool: tool.tool,
        status: tool.status,
        findingsCount: tool.findingsCount,
        error: tool.error || null,
        artifacts: tool.artifacts.map((artifact) => ({
          path: artifact.path,
          kind: artifact.kind,
          sizeBytes: artifact.sizeBytes,
        })),
      })),
      failedScanners,
    },
    nodes,
    edges,
  };
}

async function resolveGitHubSecurityToken(job: any, fallbackAccessToken: string | null): Promise<string> {
  try {
    const installationToken = await getUserInstallationToken(String(job.requestedBy || ''));
    console.log(`[attackPathsJobRunner] Using GitHub App installation token for user ${job.requestedBy}`);
    return installationToken;
  } catch (installationErr: any) {
    console.warn(`[attackPathsJobRunner] Installation token unavailable: ${installationErr?.message || String(installationErr)}`);
    if (fallbackAccessToken) {
      console.log(`[attackPathsJobRunner] Falling back to encrypted OAuth token from job document`);
      return fallbackAccessToken;
    }
    throw new Error('No GitHub security token available for repository scan');
  }
}

async function processJob(job: any) {
  const jobId = String(job._id);
  const repoId = String(job.repoId || jobId);
  const repoFullName = safeRepoFullName(job.repoFullName);
  const targetUrl = safeTargetUrl(job.targetUrl);
  let githubAccessToken: string | null = null;

  try {
    if (job.githubAccessTokenEnc && job.githubTokenIv) {
      githubAccessToken = decrypt({
        iv: String(job.githubTokenIv),
        content: String(job.githubAccessTokenEnc),
      });
    }

    if (!repoFullName.includes('/')) {
      throw new Error(`Invalid repoFullName for job: ${repoFullName}`);
    }

    const [owner, repo] = repoFullName.split('/');
    const failedScanners: Array<{ scanner: string; error: string }> = [];
    const toolStatuses: ScannerRunResult[] = [];

    const jobDir = await ensureJobWorkspace(jobId);
    let repoScanDir = jobDir;

    await updateAttackPathsJobProgress(jobId, {
      status: 'cpgraph_building',
      progressPct: 5,
      phaseMessage: 'Preparing repository scan inputs...',
    } as any);

    let materializedFiles: Array<{ path: string; content?: string }> = [];
    try {
      const materializedRepo = await materializeRepoFromGitHub({
        jobId,
        repoFullName,
        accessToken: githubAccessToken || '',
        maxFilesToFetch: 60,
      });
      repoScanDir = materializedRepo.workDir;
      materializedFiles = materializedRepo.files.map((file) => ({
        path: file.path,
        content: file.content,
      }));
      console.log(`[attackPathsJobRunner] Materialized ${materializedFiles.length} files for ${repoFullName}`);
    } catch (err: any) {
      failedScanners.push({
        scanner: 'repo_materializer',
        error: err?.message || 'Failed to materialize repository files',
      });
      console.warn(`[attackPathsJobRunner] Materialization failed for ${repoFullName}: ${err?.message || String(err)}`);
    }

    await updateAttackPathsJobProgress(jobId, {
      status: 'cpgraph_analyzing',
      progressPct: 12,
      phaseMessage: 'Detecting available scanner tools...',
    } as any);

    const requestedTools = ['nuclei', 'gitleaks', 'trivy', 'semgrep', 'syft', 'cloudsploit'];
    const availableTools = await detectScannerTools(requestedTools);
    const installedTools = availableTools.filter((tool) => tool.installed).map((tool) => tool.name);
    console.log(`[attackPathsJobRunner] Available scanners: ${installedTools.join(', ') || 'none'}`);

    await updateAttackPathsJobProgress(jobId, {
      status: 'cpgraph_analyzing',
      progressPct: 18,
      phaseMessage: `Running scanners: ${installedTools.length}/${requestedTools.length} tools available`,
    } as any);

    const githubPromise = (async (): Promise<AttackPathFinding[]> => {
      const githubToken = await resolveGitHubSecurityToken(job, githubAccessToken);
      console.log(`[attackPathsJobRunner] Fetching GitHub security alerts for ${repoFullName}...`);
      const raw = await fetchRepoSecurityData(owner, repo, githubToken);
      const transformed = transformVulnerabilityAlerts(raw.nodes);
      return makeGitHubFindings(repoId, transformed.alerts);
    })();

    const packagePromise = (async (): Promise<AttackPathFinding[]> => {
      const packageToken = githubAccessToken || (await resolveGitHubSecurityToken(job, githubAccessToken));
      console.log(`[attackPathsJobRunner] Scanning package dependencies via OSV for ${repoFullName}...`);
      return scanPackageDependencies(packageToken, owner, repo, repoId);
    })();

    const builtinSecretPromise = scanForSecrets(repoId, materializedFiles);
    const builtinSastPromise = scanForSastPatterns(repoId, materializedFiles);
    const builtinIacPromise = scanForIacIssues(repoId, materializedFiles);
    const builtinSbomPromise = extractSbomManifest(repoId, materializedFiles);
    const builtinCspmPromise = scanForCspmConfigs(repoId, materializedFiles);
    const builtinDastPromise = targetUrl ? scanForDastSignals(repoId, targetUrl) : Promise.resolve([]);

    let gitleaksResult: ScannerRunResult = { tool: 'gitleaks', status: 'skipped', findingsCount: 0, artifacts: [], error: 'gitleaks is not installed on this worker.' };
    let semgrepResult: ScannerRunResult = { tool: 'semgrep', status: 'skipped', findingsCount: 0, artifacts: [], error: 'semgrep is not installed on this worker.' };
    let trivyResult: ScannerRunResult = { tool: 'trivy', status: 'skipped', findingsCount: 0, artifacts: [], error: 'trivy is not installed on this worker.' };
    let nucleiResult: ScannerRunResult = { tool: 'nuclei', status: 'skipped', findingsCount: 0, artifacts: [], error: 'nuclei is not installed on this worker.' };
    let syftResult: ScannerRunResult = { tool: 'syft', status: 'skipped', findingsCount: 0, artifacts: [], error: 'syft is not installed on this worker.' };
    let cloudsploitResult: ScannerRunResult = { tool: 'cloudsploit', status: 'skipped', findingsCount: 0, artifacts: [], error: 'cloudsploit is not installed on this worker.' };

    if (installedTools.includes('gitleaks')) {
      gitleaksResult = await runGitleaks({ repoDir: repoScanDir, jobDir });
    }
    toolStatuses.push(gitleaksResult);

    if (installedTools.includes('semgrep')) {
      semgrepResult = await runSemgrep({ repoDir: repoScanDir, jobDir });
    }
    toolStatuses.push(semgrepResult);

    if (installedTools.includes('trivy')) {
      trivyResult = await runTrivy({ target: repoScanDir, jobDir });
    }
    toolStatuses.push(trivyResult);

    if (installedTools.includes('nuclei') && targetUrl) {
      nucleiResult = await runNuclei({ targetUrl, jobDir });
    }
    toolStatuses.push(nucleiResult);

    if (installedTools.includes('syft')) {
      syftResult = await runSyft({ target: repoScanDir, jobDir });
    }
    toolStatuses.push(syftResult);

    if (installedTools.includes('cloudsploit')) {
      cloudsploitResult = await runCloudSploit({ jobDir });
    }
    toolStatuses.push(cloudsploitResult);

    const [
      githubFindings,
      packageScanFindings,
      builtinSecretFindings,
      builtinSastFindings,
      builtinIacFindings,
      builtinSbomFindings,
      builtinCspmFindings,
      builtinDastFindings,
      gitleaksFindings,
      semgrepFindings,
      trivyFindings,
      nucleiFindings,
      syftFindings,
      cloudsploitFindings,
    ] = await Promise.all([
      githubPromise.catch((err: any) => {
        console.error(`[attackPathsJobRunner] GitHub security alerts fetch failed for ${repoFullName}: ${err?.message || String(err)}`);
        failedScanners.push({ scanner: 'github_security_alerts', error: err?.message || String(err) });
        return [] as AttackPathFinding[];
      }),
      packagePromise.catch((err: any) => {
        console.error(`[attackPathsJobRunner] Package dependency scan failed for ${repoFullName}: ${err?.message || String(err)}`);
        failedScanners.push({ scanner: 'package_dependency_scan', error: err?.message || String(err) });
        return [] as AttackPathFinding[];
      }),
      builtinSecretPromise.catch((err: any) => {
        console.error(`[attackPathsJobRunner] Secret scan failed for ${repoFullName}: ${err?.message || String(err)}`);
        failedScanners.push({ scanner: 'secret_scan', error: err?.message || String(err) });
        return [] as AttackPathFinding[];
      }),
      builtinSastPromise.catch((err: any) => {
        console.error(`[attackPathsJobRunner] SAST scan failed for ${repoFullName}: ${err?.message || String(err)}`);
        failedScanners.push({ scanner: 'sast_scan', error: err?.message || String(err) });
        return [] as AttackPathFinding[];
      }),
      builtinIacPromise.catch((err: any) => {
        console.error(`[attackPathsJobRunner] IaC scan failed for ${repoFullName}: ${err?.message || String(err)}`);
        failedScanners.push({ scanner: 'iac_scan', error: err?.message || String(err) });
        return [] as AttackPathFinding[];
      }),
      builtinSbomPromise.catch((err: any) => {
        console.error(`[attackPathsJobRunner] SBOM extraction failed for ${repoFullName}: ${err?.message || String(err)}`);
        failedScanners.push({ scanner: 'sbom_scan', error: err?.message || String(err) });
        return [] as AttackPathFinding[];
      }),
      builtinCspmPromise.catch((err: any) => {
        console.error(`[attackPathsJobRunner] CSPM config scan failed for ${repoFullName}: ${err?.message || String(err)}`);
        failedScanners.push({ scanner: 'cspm_scan', error: err?.message || String(err) });
        return [] as AttackPathFinding[];
      }),
      builtinDastPromise.catch((err: any) => {
        console.error(`[attackPathsJobRunner] DAST signal scan failed for ${repoFullName}: ${err?.message || String(err)}`);
        failedScanners.push({ scanner: 'dast_scan', error: err?.message || String(err) });
        return [] as AttackPathFinding[];
      }),
      parseGitleaksFindings(repoId, gitleaksResult),
      parseSemgrepFindings(repoId, semgrepResult),
      parseTrivyFindings(repoId, trivyResult),
      parseNucleiFindings(repoId, nucleiResult),
      parseSyftFindings(repoId, syftResult),
      parseCloudSploitFindings(repoId, cloudsploitResult),
    ]);

    await updateAttackPathsJobProgress(jobId, {
      status: 'sandbox_verifying',
      progressPct: 70,
      phaseMessage: targetUrl
        ? 'Scanning live deployment for exposed secrets...'
        : 'No live deployment URL provided. Finalizing repository findings...',
    } as any);

    let liveFindings: AttackPathFinding[] = [];
    if (targetUrl) {
      try {
        const leaked = await scanLiveDeployment(targetUrl);
        liveFindings = makeLiveFindings(repoId, targetUrl, leaked);
      } catch (err: any) {
        failedScanners.push({
          scanner: 'live_deployment_scan',
          error: err?.message || 'Failed to scan live deployment',
        });
      }
    }

    await updateAttackPathsJobProgress(jobId, {
      status: 'rendering_report',
      progressPct: 90,
      phaseMessage: 'Normalizing real findings for dashboard rendering...',
    } as any);

    const secretFindings = [...builtinSecretFindings, ...gitleaksFindings];
    const sastFindings = [...builtinSastFindings, ...semgrepFindings];
    const iacFindings = [...builtinIacFindings, ...trivyFindings.filter((f) => f.source === 'iac_scan')];
    const packageScanFindingsMerged = [...packageScanFindings, ...trivyFindings.filter((f) => f.source === 'package_scan')];
    const sbomFindings = [...builtinSbomFindings, ...syftFindings];
    const cspmFindings = [...builtinCspmFindings, ...cloudsploitFindings];
    const dastFindings = [...builtinDastFindings, ...nucleiFindings];

    const repoFindings = [
      ...githubFindings,
      ...packageScanFindingsMerged,
      ...secretFindings,
      ...sastFindings,
      ...iacFindings,
      ...dastFindings,
    ];

    const summaryFindings = [...sbomFindings, ...cspmFindings];
    const results = [...repoFindings, ...liveFindings, ...summaryFindings];
    const scanArtifacts = toolStatuses.flatMap((tool) => tool.artifacts);
    const assuranceSummary = buildOwaspWebAssuranceSummary(results, toolStatuses);

    if (results.length === 0 && failedScanners.length > 0) {
      const errorMessages = failedScanners.map((item) => `${item.scanner}: ${item.error}`).join('; ');
      console.error(`[attackPathsJobRunner] All scanners failed for ${jobId}: ${errorMessages}`);
      throw new Error(errorMessages);
    }

    if (results.length === 0 && failedScanners.length === 0) {
      console.warn(`[attackPathsJobRunner] No findings for ${jobId}. Repo may have no detectable issues or GitHub token lacks permissions.`);
    }

    await setAttackPathsJobResult(jobId, {
      status: 'completed',
      progressPct: 100,
      phaseMessage:
        failedScanners.length > 0
          ? 'Real security scan completed with partial coverage'
          : 'Real security scan completed',
      results,
      scanArtifacts,
      toolStatuses: toolStatuses.map((tool) => ({
        tool: tool.tool,
        status: tool.status,
        findingsCount: tool.findingsCount,
        error: tool.error || null,
        rawExitCode: tool.rawExitCode ?? null,
        artifacts: tool.artifacts.map((artifact) => ({
          path: artifact.path,
          kind: artifact.kind,
          sizeBytes: artifact.sizeBytes,
        })),
      })),
      assuranceSummary,
      graphArtifact: buildGraphArtifact({
        repoFullName,
        targetUrl,
        githubFindings,
        packageScanFindings: packageScanFindingsMerged,
        secretFindings,
        sastFindings,
        iacFindings,
        dastFindings,
        sbomFindings,
        cspmFindings,
        liveFindings,
        failedScanners,
        toolStatuses,
        assuranceSummary,
      }),
      reportArtifactUrl: '',
      lastError: failedScanners.length > 0 ? failedScanners.map((item) => `${item.scanner}: ${item.error}`).join('; ') : '',
    });

    console.log(`[attackPathsJobRunner] job completed successfully: ${jobId}`);
  } catch (err: any) {
    const lastError = err?.message || String(err);

    await AttackPathsJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: 'failed',
        progressPct: job.progressPct || 0,
        phaseMessage: 'Job failed',
        lastError,
        completedAt: new Date(),
      },
    }).exec();

    console.error(`[attackPathsJobRunner] job failed: ${jobId}`, err);
  }
}

export async function runAttackPathsJobV1(): Promise<void> {
  console.log('[attackPathsJobRunner] starting polling loop');

  while (true) {
    try {
      for (let i = 0; i < MAX_JOBS_PER_CYCLE; i++) {
        const job = await claimOneQueuedJob();
        if (!job) break;

        console.log(`[attackPathsJobRunner] claimed job: ${String(job._id)}`);
        await processJob(job);
      }
    } catch (err) {
      console.error('[attackPathsJobRunner] cycle error', err);
    }

    await new Promise((r) => setTimeout(r, JOB_POLL_MS));
  }
}
