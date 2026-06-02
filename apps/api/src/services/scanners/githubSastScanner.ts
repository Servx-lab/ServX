import { Octokit } from '@octokit/rest';
import { Finding, ScanEmitFn } from './types';
import { fetchRepoSecurityData } from '../githubGraphScanner';

export function normalizeSeverity(value?: string): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
  const upper = (value || '').toUpperCase();
  if (upper === 'CRITICAL') return 'CRITICAL';
  if (upper === 'HIGH') return 'HIGH';
  if (upper === 'MODERATE' || upper === 'MEDIUM') return 'MODERATE';
  return 'LOW';
}

export async function scanGithubSast(
  owner: string,
  repo: string,
  token: string,
  emit?: ScanEmitFn
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const scannerName = 'sast';

  if (emit) {
    emit('scanner:start', { scanner: scannerName });
  }

  try {
    console.log(`[SAST] Starting GitHub Code Scanning alerts query for ${owner}/${repo}`);
    const octokit = new Octokit({ auth: token });

    try {
      const { data: alerts } = await octokit.rest.codeScanning.listAlertsForRepo({
        owner,
        repo,
        state: 'open',
      });

      console.log(`[SAST] Successfully retrieved ${alerts.length} CodeQL alerts`);
      for (const alert of alerts) {
        const severity = normalizeSeverity(
          alert.rule.security_severity_level || alert.rule.severity
        );
        
        const finding: Finding = {
          id: `sast-${alert.number}`,
          scanner: 'sast',
          title: alert.rule.description || alert.rule.id || 'SAST Vulnerability',
          severity,
          description: alert.rule.description || alert.rule.id || 'No details provided.',
          remediation: `Review this finding on GitHub: ${alert.html_url}`,
          file: alert.most_recent_instance?.location?.path || 'unknown',
          line: alert.most_recent_instance?.location?.start_line || 1,
          evidence: `Rule ID: ${alert.rule.id}`,
          timestamp: alert.created_at,
        };

        findings.push(finding);
        if (emit) {
          emit('finding', finding);
        }
      }
    } catch (err: any) {
      console.warn(
        `[SAST] GitHub Code Scanning API is not available or returned an error: ${err.message}. Falling back to Dependabot.`
      );
      
      // Fallback: fetch Dependabot alerts (works for all repos, public or private, free)
      const dependabotData = await fetchRepoSecurityData(owner, repo, token);
      console.log(`[SAST] Successfully retrieved ${dependabotData.nodes.length} Dependabot alerts as fallback`);

      for (const node of dependabotData.nodes) {
        const vuln = node.securityVulnerability;
        if (!vuln) continue;

        const severity = normalizeSeverity(vuln.severity);
        const pkgName = vuln.package?.name ?? 'unknown-package';
        const range = vuln.vulnerableVersionRange ?? 'unknown';
        const patched = vuln.firstPatchedVersion?.identifier ?? 'None';
        const summary = vuln.advisory?.summary ?? 'No advisory summary available';

        const finding: Finding = {
          id: `sast-dep-${node.createdAt || ''}-${pkgName}`,
          scanner: 'sast',
          title: `Vulnerable dependency in package: ${pkgName}`,
          severity,
          description: summary,
          remediation: `Upgrade package ${pkgName} out of vulnerable range: ${range}. Patched version: ${patched}.`,
          file: 'package.json',
          line: 1,
          evidence: `Package Name: ${pkgName} (${range})`,
          timestamp: node.createdAt || new Date().toISOString(),
        };

        findings.push(finding);
        if (emit) {
          emit('finding', finding);
        }
      }
    }
  } catch (err: any) {
    console.error(`[SAST] Critical scanner failure for ${owner}/${repo}: ${err.message}`);
    const failedFinding: Finding = {
      id: `sast-failure-${Date.now()}`,
      scanner: 'sast',
      title: 'SAST Scanner Connection Failure',
      severity: 'MODERATE',
      description: `SAST scanner failed to query Code Scanning or Dependabot alerts: ${err.message}`,
      remediation: 'Verify your GitHub account connection in Settings / vault. Ensure the repository is active and public, or linked with a valid token.',
      file: 'GitHub API Endpoint',
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
