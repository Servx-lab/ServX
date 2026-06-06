import axios from 'axios';
import { Octokit } from '@octokit/rest';
import { Finding, ScanEmitFn } from './types';
import { normalizeSeverity } from './githubSastScanner';

interface PackageQuery {
  name: string;
  version: string;
  ecosystem: string;
}

export function cleanSemver(verStr: string): string {
  if (!verStr) return '0.0.0';
  const match = verStr.match(/\d+\.\d+(?:\.\d+)?/);
  return match ? match[0] : verStr.replace(/[\^~>=<]/g, '').trim();
}

export function parsePackageLock(lockContent: string): PackageQuery[] {
  const queries: PackageQuery[] = [];
  try {
    const lock = JSON.parse(lockContent);
    // Modern v2/v3 lockfile parsing
    if (lock.packages) {
      for (const [key, value] of Object.entries(lock.packages)) {
        if (key === '') continue; // Root project
        const name = key.replace(/^node_modules\//, '');
        const pkg = value as { version?: string; dev?: boolean };
        if (pkg.version) {
          queries.push({
            name,
            version: pkg.version,
            ecosystem: 'npm',
          });
        }
      }
    } 
    // Legacy v1 lockfile fallback
    else if (lock.dependencies) {
      for (const [name, value] of Object.entries(lock.dependencies)) {
        const pkg = value as { version?: string };
        if (pkg.version) {
          queries.push({
            name,
            version: pkg.version,
            ecosystem: 'npm',
          });
        }
      }
    }
  } catch (err: any) {
    console.warn(`[OSV Scanner] Failed to parse package-lock.json: ${err.message}`);
  }
  return queries;
}

export function parsePackageJson(content: string): PackageQuery[] {
  const queries: PackageQuery[] = [];
  try {
    const pkg = JSON.parse(content);
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    for (const [name, ver] of Object.entries(deps)) {
      queries.push({
        name,
        version: cleanSemver(ver as string),
        ecosystem: 'npm',
      });
    }
  } catch (err: any) {
    console.warn(`[OSV Scanner] Failed to parse package.json: ${err.message}`);
  }
  return queries;
}

export function severityFromCvss(score: number): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MODERATE';
  return 'LOW';
}

export async function scanOsvSca(
  owner: string,
  repo: string,
  token: string,
  emit?: ScanEmitFn
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const scannerName = 'sca';

  if (emit) {
    emit('scanner:start', { scanner: scannerName });
  }

  try {
    console.log(`[OSV Scanner] Running SCA scanner for ${owner}/${repo}`);
    const octokit = new Octokit({ auth: token });

    let packages: PackageQuery[] = [];

    // 1. Try to fetch package-lock.json for precise versions
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'package-lock.json',
      });

      if ('content' in data && data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        packages = parsePackageLock(content);
        console.log(`[OSV Scanner] Parsed ${packages.length} dependencies from package-lock.json`);
      }
    } catch {
      console.log('[OSV Scanner] package-lock.json not found, falling back to package.json');
    }

    // 2. If packages is empty, fetch package.json and clean semver ranges
    if (packages.length === 0) {
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: 'package.json',
        });

        if ('content' in data && data.content) {
          const content = Buffer.from(data.content, 'base64').toString('utf8');
          packages = parsePackageJson(content);
          console.log(`[OSV Scanner] Parsed ${packages.length} dependencies from package.json`);
        }
      } catch (err: any) {
        console.warn(`[OSV Scanner] package.json not found or failed to parse: ${err.message}`);
      }
    }

    if (packages.length === 0) {
      console.log('[OSV Scanner] No dependencies found to scan.');
      if (emit) {
        emit('scanner:done', { scanner: scannerName, findingsCount: 0 });
      }
      return [];
    }

    // 3. Batch query OSV.dev in chunks of 500 packages
    const chunkSize = 500;
    for (let i = 0; i < packages.length; i += chunkSize) {
      const chunk = packages.slice(i, i + chunkSize);
      const queries = chunk.map(pkg => ({
        package: {
          name: pkg.name,
          ecosystem: pkg.ecosystem,
        },
        version: pkg.version,
      }));

      try {
        console.log(`[OSV Scanner] Querying OSV.dev for chunk ${i / chunkSize + 1}`);
        const response = await axios.post(
          'https://api.osv.dev/v1/querybatch',
          { queries },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
          }
        );

        const results = response.data.results;
        if (results && Array.isArray(results)) {
          results.forEach((result: any, idx: number) => {
            const pkgInfo = chunk[idx];
            if (result.vulns && Array.isArray(result.vulns)) {
              result.vulns.forEach((vuln: any) => {
                // Find CVE aliases if present
                const cve = vuln.aliases?.find((alias: string) => alias.startsWith('CVE-'));
                const ghsa = vuln.aliases?.find((alias: string) => alias.startsWith('GHSA-')) || vuln.id;

                // Extract severity
                let severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
                let cvssScore: number | undefined = undefined;

                if (vuln.severity && Array.isArray(vuln.severity)) {
                  // Find CVSS v3 score
                  const cvss3 = vuln.severity.find((sev: any) => sev.type === 'CVSS_V3');
                  if (cvss3 && cvss3.score) {
                    cvssScore = Number(cvss3.score);
                  }
                }

                if (cvssScore !== undefined) {
                  severity = severityFromCvss(cvssScore);
                } else if (vuln.database_specific?.severity) {
                  severity = normalizeSeverity(vuln.database_specific.severity);
                }

                // Determine remediation (look at affected version ranges)
                let remediation = `Upgrade package ${pkgInfo.name} from version ${pkgInfo.version} to a patched release.`;
                const affected = vuln.affected?.find(
                  (a: any) => a.package?.name === pkgInfo.name
                );
                if (affected?.ranges) {
                  const events = affected.ranges.flatMap((r: any) => r.events || []);
                  const fixed = events.find((e: any) => e.fixed);
                  if (fixed?.fixed) {
                    remediation = `Upgrade package ${pkgInfo.name} from version ${pkgInfo.version} to version ${fixed.fixed} or higher.`;
                  }
                }

                const finding: Finding = {
                  id: `sca-osv-${vuln.id}-${pkgInfo.name}`,
                  scanner: 'sca',
                  title: vuln.summary || `Vulnerability in ${pkgInfo.name}`,
                  severity,
                  description: vuln.details || vuln.summary || 'No description provided.',
                  remediation,
                  file: 'package.json',
                  line: 1,
                  cve,
                  evidence: `Vulnerable dependency: ${pkgInfo.name}@${pkgInfo.version}`,
                  timestamp: vuln.published || new Date().toISOString(),
                };

                findings.push(finding);
                if (emit) {
                  emit('finding', finding);
                }
              });
            }
          });
        }
      } catch (err: any) {
        console.error(`[OSV Scanner] OSV API batch query failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error(`[OSV Scanner] Critical scanner failure for ${owner}/${repo}: ${err.message}`);
    const failedFinding: Finding = {
      id: `sca-failure-${Date.now()}`,
      scanner: 'sca',
      title: 'SCA Scanner Connection Failure',
      severity: 'MODERATE',
      description: `Dependency SCA scanner failed to load repository manifests or query vulnerability database: ${err.message}`,
      remediation: 'Verify your GitHub account connection in Settings / vault. Ensure the repository contains package.json or package-lock.json.',
      file: 'GitHub Contents API',
      line: 1,
      evidence: err.message,
      timestamp: new Date().toISOString(),
    };
    findings.push(failedFinding);
    if (emit) {
      emit('finding', failedFinding);
    }
  }

  if (emit) {
    emit('scanner:done', { scanner: scannerName, findingsCount: findings.length });
  }

  return findings;
}
