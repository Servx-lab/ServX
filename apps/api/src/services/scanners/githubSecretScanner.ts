import { Octokit } from '@octokit/rest';
import { Finding, ScanEmitFn } from './types';

export const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z-_]{35}/g },
  { name: 'Stripe Secret Key', pattern: /sk_live_[0-9a-zA-Z]{24}/g },
  { name: 'AWS Access Key ID', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Access Key', pattern: /(?:aws_secret_access_key|aws_secret|secret_key)\s*[:=]\s*['"]([A-Za-z0-9/+=]{40})['"]/gi },
  { name: 'GitHub Personal Access Token', pattern: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'GitHub OAuth Access Token', pattern: /gho_[a-zA-Z0-9]{36}/g },
  { name: 'Slack Webhook URL', pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9_]{8}\/B[A-Z0-9_]{8}\/[A-Za-z0-9_]{24}/g },
  { name: 'Generic Bearer Token', pattern: /bearer\s+([a-zA-Z0-9-._~+/]+=*)/gi },
  { name: 'Private Key', pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g },
  { name: 'Supabase Service Role Key', pattern: /sbp_[a-zA-Z0-9]{40}/g },
  { name: 'Firebase API Key', pattern: /AIzaSy[A-Za-z0-9-_]{33}/g }
];

const TEXT_EXTENSIONS = [
  '.env', '.env.example', '.env.local', '.env.development', '.env.production', '.env.test',
  '.js', '.ts', '.jsx', '.tsx', '.json', '.yml', '.yaml', '.toml', '.xml', '.ini', '.conf',
  '.py', '.sh', '.bash', '.md', '.txt'
];

export function isLikelyTextFile(path: string): boolean {
  const p = path.toLowerCase();
  if (
    p.includes('node_modules/') ||
    p.includes('dist/') ||
    p.includes('build/') ||
    p.includes('.git/') ||
    p.includes('.next/') ||
    p.endsWith('.png') ||
    p.endsWith('.jpg') ||
    p.endsWith('.ico') ||
    p.endsWith('.lock')
  ) {
    return false;
  }
  return TEXT_EXTENSIONS.some(ext => p.endsWith(ext)) || p.includes('.env');
}

export function getPriorityScore(path: string): number {
  const p = path.toLowerCase();
  if (p.includes('.env')) return 100;
  if (p.includes('config') || p.includes('settings') || p.includes('credentials')) return 50;
  if (!p.includes('/')) return 20; // Root level files
  return 0;
}

export async function scanGithubSecrets(
  owner: string,
  repo: string,
  token: string,
  emit?: ScanEmitFn
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const scannerName = 'secret';

  if (emit) {
    emit('scanner:start', { scanner: scannerName });
  }

  try {
    console.log(`[Secret Scanner] Starting GitHub Secret Scanning query for ${owner}/${repo}`);
    const octokit = new Octokit({ auth: token });

    try {
      // 1. Primary: GitHub Native Secret Scanning API
      const { data: alerts } = await octokit.rest.secretScanning.listAlertsForRepo({
        owner,
        repo,
        state: 'open',
      });

      console.log(`[Secret Scanner] Retrieved ${alerts.length} native secret alerts`);

      for (const alert of alerts) {
        let filePath = 'unknown';
        let lineNum = 1;

        // Fetch location details if possible
        try {
          const { data: locations } = await octokit.rest.secretScanning.listLocationsForAlert({
            owner,
            repo,
            alert_number: alert.number,
          });

          if (locations && locations.length > 0) {
            const loc = locations[0];
            if (loc.type === 'commit' && loc.details && 'path' in loc.details) {
              filePath = (loc.details as any).path;
              if ('start_line' in loc.details) {
                lineNum = (loc.details as any).start_line;
              }
            }
          }
        } catch (locErr: any) {
          console.warn(`[Secret Scanner] Could not fetch location details for alert ${alert.number}: ${locErr.message}`);
        }

        const finding: Finding = {
          id: `secret-${alert.number}`,
          scanner: 'secret',
          title: `Leaked Secret: ${alert.secret_type_display_name || alert.secret_type}`,
          severity: 'CRITICAL',
          description: `A leaked secret of type '${alert.secret_type}' was detected by GitHub's secret scanner. Resolution: ${alert.resolution || 'unresolved'}.`,
          remediation: `1. Revoke the credentials immediately.\n2. Verify who accessed them.\n3. Clean git history if it was committed in plaintext.\n4. View GitHub details: ${alert.html_url}`,
          file: filePath,
          line: lineNum,
          evidence: `Masked secret: ${alert.secret || '***********'}`,
          timestamp: alert.created_at,
        };

        findings.push(finding);
        if (emit) {
          emit('finding', finding);
        }
      }
    } catch (err: any) {
      console.warn(
        `[Secret Scanner] GitHub Native Secret Scanning is not enabled/available: ${err.message}. Running fallback regex scan on repository files.`
      );

      // 2. Fallback: Scan repository files via Contents API
      // First get default branch head tree
      const { data: treeData } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: 'HEAD',
        recursive: 'true',
      });

      if (treeData && treeData.tree) {
        const textFiles = treeData.tree.filter(
          node => node.type === 'blob' && node.path && isLikelyTextFile(node.path)
        );

        // Prioritize files and scan up to 30 files
        textFiles.sort((a, b) => getPriorityScore(b.path!) - getPriorityScore(a.path!));
        const targetFiles = textFiles.slice(0, 30);

        console.log(`[Secret Scanner] Running regex secret scan on ${targetFiles.length} prioritized files.`);

        for (const file of targetFiles) {
          if (!file.path) continue;

          try {
            // Get content of file
            const { data } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: file.path,
            });

            // Make sure we have a file with content
            if ('content' in data && data.content) {
              // GitHub encodes file content in base64
              const content = Buffer.from(data.content, 'base64').toString('utf8');

              // Run all patterns against file content
              for (const entry of SECRET_PATTERNS) {
                // Reset regex lastIndex just in case
                entry.pattern.lastIndex = 0;
                let match;
                let matchIndex = 0;

                while ((match = entry.pattern.exec(content)) !== null) {
                  // To prevent infinite loops in bad regexes
                  if (match.index === entry.pattern.lastIndex) {
                    entry.pattern.lastIndex++;
                  }

                  const matchedText = match[0];
                  // Mask the middle of the secret for security
                  const maskedText = matchedText.length > 8
                    ? `${matchedText.substring(0, 4)}...${matchedText.substring(matchedText.length - 4)}`
                    : '********';

                  // Calculate line number
                  const lines = content.substring(0, match.index).split('\n');
                  const lineNum = lines.length;

                  const finding: Finding = {
                    id: `secret-regex-${file.path}-${entry.name}-${matchIndex++}`,
                    scanner: 'secret',
                    title: `Potential Leaked ${entry.name}`,
                    severity: 'CRITICAL',
                    description: `A potential ${entry.name} was detected in file ${file.path} at line ${lineNum} during fallback static scanning.`,
                    remediation: `1. Revoke the credentials immediately.\n2. Move credentials to a secure environment variable file (.env) and add it to your .gitignore.\n3. Purge the Git history of this file if committed to a public or remote repository.`,
                    file: file.path,
                    line: lineNum,
                    evidence: `Pattern match: ${maskedText}`,
                    timestamp: new Date().toISOString(),
                  };

                  findings.push(finding);
                  if (emit) {
                    emit('finding', finding);
                  }
                }
              }
            }
          } catch (fileErr: any) {
            console.warn(`[Secret Scanner] Failed to fetch or scan content for ${file.path}: ${fileErr.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[Secret Scanner] Critical scanner failure for ${owner}/${repo}: ${err.message}`);
    const failedFinding: Finding = {
      id: `secret-failure-${Date.now()}`,
      scanner: 'secret',
      title: 'Secret Scanner Connection Failure',
      severity: 'MODERATE',
      description: `Secret scanner failed to query native secrets or repository files: ${err.message}`,
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
