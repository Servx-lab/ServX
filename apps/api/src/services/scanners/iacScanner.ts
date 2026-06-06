import { Octokit } from '@octokit/rest';
import { Finding, ScanEmitFn } from './types';

export function scanDockerfile(path: string, content: string): Finding[] {
  const fileFindings: Finding[] = [];

  // 1. Check for USER instruction (defaults to root if missing or explicitly set to root)
  const userMatch = content.match(/^USER\s+(\w+)/im);
  if (!userMatch) {
    fileFindings.push({
      id: `iac-dockerfile-no-user-${path}`,
      scanner: 'iac',
      title: 'Dockerfile runs as root by default',
      severity: 'HIGH',
      description: 'The Dockerfile does not specify a USER instruction. By default, all container processes execute with full root privileges, increasing the blast radius of container escapes.',
      remediation: 'Create a non-privileged user in the Dockerfile and switch to it using: USER <username>.',
      file: path,
      line: 1,
      evidence: 'No USER instruction found',
      timestamp: new Date().toISOString(),
    });
  } else if (userMatch[1].toLowerCase() === 'root') {
    const lines = content.split('\n');
    const lineIndex = lines.findIndex(l => /^\s*USER\s+root/i.test(l)) + 1;
    fileFindings.push({
      id: `iac-dockerfile-root-user-${path}`,
      scanner: 'iac',
      title: 'Explicit USER root in Dockerfile',
      severity: 'HIGH',
      description: 'The Dockerfile explicitly configures the container process to run as root, negating the container sandbox.',
      remediation: 'Configure a non-root user and set: USER <non-root-user>.',
      file: path,
      line: lineIndex || 1,
      evidence: `USER ${userMatch[1]}`,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Check for latest tag in FROM
  const fromLines = content.split('\n');
  const fromLineIndex = fromLines.findIndex(l => /^\s*FROM/i.test(l)) + 1;
  const isLatest = content.match(/^FROM\s+[a-zA-Z0-9_/.-]+:latest/im) || !content.match(/^FROM\s+[a-zA-Z0-9_/.-]+:\d+/im);
  if (isLatest) {
    fileFindings.push({
      id: `iac-dockerfile-latest-tag-${path}`,
      scanner: 'iac',
      title: 'Using unpinned or latest base image tag',
      severity: 'MODERATE',
      description: 'The base image tag is either explicitly set to "latest" or completely unpinned. This makes builds non-deterministic and can pull vulnerable base images automatically.',
      remediation: 'Use a specific, pinned SHA256 digest or version tag for the base image, e.g. node:20-alpine.',
      file: path,
      line: fromLineIndex || 1,
      evidence: fromLines[fromLineIndex - 1]?.trim() || 'FROM node',
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Check for HEALTHCHECK
  if (!/^\s*HEALTHCHECK/im.test(content)) {
    fileFindings.push({
      id: `iac-dockerfile-no-healthcheck-${path}`,
      scanner: 'iac',
      title: 'Missing Docker HEALTHCHECK instruction',
      severity: 'LOW',
      description: 'No HEALTHCHECK instruction is defined in the Dockerfile. Container orchestrators cannot monitor container responsiveness and replace unhealthy containers.',
      remediation: 'Add a HEALTHCHECK instruction, e.g. HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:3000/health || exit 1.',
      file: path,
      line: 1,
      evidence: 'No HEALTHCHECK instruction found',
      timestamp: new Date().toISOString(),
    });
  }

  return fileFindings;
}

export function scanDockerCompose(path: string, content: string): Finding[] {
  const fileFindings: Finding[] = [];
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // 1. privileged: true
    if (/^\s*privileged\s*:\s*true/i.test(line)) {
      fileFindings.push({
        id: `iac-compose-privileged-${path}-${idx}`,
        scanner: 'iac',
        title: 'Privileged container execution',
        severity: 'CRITICAL',
        description: 'Docker Compose service runs in privileged mode, granting it full root system access to the host kernel and host devices. An attacker can escape the container easily.',
        remediation: 'Remove "privileged: true" and configure only the specific capabilities required using "cap_add".',
        file: path,
        line: idx + 1,
        evidence: line.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    // 2. network_mode: host
    if (/^\s*network_mode\s*:\s*["']?host["']?/i.test(line)) {
      fileFindings.push({
        id: `iac-compose-host-network-${path}-${idx}`,
        scanner: 'iac',
        title: 'Host network mode enabled',
        severity: 'HIGH',
        description: 'The service is configured with network_mode: host, exposing all host ports to the container and bypassing network namespace isolation.',
        remediation: 'Use bridge networks and map specific ports using ports directive.',
        file: path,
        line: idx + 1,
        evidence: line.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    // 3. cap_add: ALL
    if (/^\s*cap_add\s*:\s*\[\s*["']?ALL["']?\s*\]/i.test(line) || /^\s*-\s*["']?ALL["']?/i.test(line)) {
      fileFindings.push({
        id: `iac-compose-cap-all-${path}-${idx}`,
        scanner: 'iac',
        title: 'Broad kernel capabilities added (ALL)',
        severity: 'HIGH',
        description: 'The service adds ALL Linux kernel capabilities, giving the container root-level control over host network and security interfaces.',
        remediation: 'Grant only the specific capabilities required (e.g. NET_ADMIN) instead of ALL.',
        file: path,
        line: idx + 1,
        evidence: line.trim(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  return fileFindings;
}

export function scanWorkflow(path: string, content: string): Finding[] {
  const fileFindings: Finding[] = [];
  const lines = content.split('\n');

  // 1. pull_request_target trigger misuse
  if (/pull_request_target/i.test(content)) {
    const hasCheckout = lines.some(l => /uses\s*:\s*actions\/checkout/i.test(l));
    const specifiesRef = lines.some(l => /ref\s*:\s*/i.test(l));

    if (hasCheckout && !specifiesRef) {
      fileFindings.push({
        id: `iac-workflow-pull-request-target-${path}`,
        scanner: 'iac',
        title: 'Insecure pull_request_target workflow trigger',
        severity: 'CRITICAL',
        description: 'The workflow uses "pull_request_target" trigger alongside an unchecked checkout. This allows malicious pull requests from forks to execute untrusted code in the context of the base repository and steal repository secrets.',
        remediation: 'Use "pull_request" trigger instead of "pull_request_target", or ensure the ref is explicitly checked out to a secure, reviewed commit.',
        file: path,
        line: 1,
        evidence: 'pull_request_target trigger with default checkout',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 2. Hardcoded secret patterns inside runner steps
  lines.forEach((line, idx) => {
    if (/^\s*-\s*run\s*:/i.test(line) || /run\s*:\s*\|/i.test(line)) {
      const context = line.trim();
      const hasHardcoded = /(?:api_key|password|secret|token)\s*=\s*['"]?[a-zA-Z0-9-_]{10,}['"]?/i.test(context) && !/\$\{\{\s*secrets\./i.test(context);

      if (hasHardcoded) {
        fileFindings.push({
          id: `iac-workflow-hardcoded-secret-${path}-${idx}`,
          scanner: 'iac',
          title: 'Potential hardcoded secret in workflow run step',
          severity: 'HIGH',
          description: 'A hardcoded secret, token, or password was detected inside a workflow run step instead of referencing a safe repository secret.',
          remediation: 'Store the credential in GitHub Repository Secrets and reference it as ${{ secrets.YOUR_SECRET_NAME }}.',
          file: path,
          line: idx + 1,
          evidence: context,
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  return fileFindings;
}

export function scanVercel(path: string, content: string): Finding[] {
  const fileFindings: Finding[] = [];
  try {
    const config = JSON.parse(content);
    if (config.headers) {
      config.headers.forEach((headerRule: any, idx: number) => {
        const corsHeader = headerRule.headers?.find(
          (h: any) => h.key?.toLowerCase() === 'access-control-allow-origin' && h.value === '*'
        );
        if (corsHeader) {
          fileFindings.push({
            id: `iac-vercel-cors-${path}-${idx}`,
            scanner: 'iac',
            title: 'Wildcard CORS Origin configured',
            severity: 'MODERATE',
            description: 'Vercel configuration exposes a wildcard CORS header (Access-Control-Allow-Origin: *). This allows any external domain to make requests and read credentials/sessions.',
            remediation: 'Restrict access to trusted subdomains or dynamic configurations instead of using a wildcard.',
            file: path,
            line: 1,
            evidence: JSON.stringify(headerRule),
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  } catch (err: any) {
    console.warn(`[IaC Scanner] Failed to parse vercel.json: ${err.message}`);
  }
  return fileFindings;
}

export function scanRender(path: string, content: string): Finding[] {
  const fileFindings: Finding[] = [];
  const lines = content.split('\n');

  let isDbService = false;
  lines.forEach((line, idx) => {
    if (/^\s*type\s*:\s*database/i.test(line)) {
      isDbService = true;
    }

    if (isDbService && /ipAllowList\s*:/i.test(line)) {
      const nextLine = lines[idx + 1] || '';
      if (/0\.0\.0\.0\/0/i.test(line) || /0\.0\.0\.0\/0/i.test(nextLine)) {
        fileFindings.push({
          id: `iac-render-db-public-${path}-${idx}`,
          scanner: 'iac',
          title: 'Database publicly exposed to the Internet',
          severity: 'HIGH',
          description: 'A Render database service configuration includes an IP allowlist of 0.0.0.0/0, allowing incoming connections from anywhere on the internet.',
          remediation: 'Restrict the IP allowlist to only specific server IPs, or use Render internal private networking.',
          file: path,
          line: idx + 1,
          evidence: line.trim() + ' ' + nextLine.trim(),
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  return fileFindings;
}

export async function scanIac(
  owner: string,
  repo: string,
  token: string,
  emit?: ScanEmitFn
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const scannerName = 'iac';

  if (emit) {
    emit('scanner:start', { scanner: scannerName });
  }

  try {
    console.log(`[IaC Scanner] Starting IaC scan for ${owner}/${repo}`);
    const octokit = new Octokit({ auth: token });

    // 1. Fetch file tree to identify configuration files
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 'true',
    });

    if (treeData && treeData.tree) {
      // Filter for IaC files
      const iacFiles = treeData.tree.filter((node) => {
        if (!node.path || node.type !== 'blob') return false;
        const p = node.path.toLowerCase();
        
        return (
          p.includes('dockerfile') ||
          p === 'docker-compose.yml' ||
          p === 'docker-compose.yaml' ||
          p === 'vercel.json' ||
          p === 'render.yaml' ||
          p.startsWith('.github/workflows/')
        );
      });

      console.log(`[IaC Scanner] Found ${iacFiles.length} IaC files to audit`);

      for (const file of iacFiles) {
        if (!file.path) continue;

        try {
          // Fetch file content
          const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.path,
          });

          if ('content' in data && data.content) {
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            const p = file.path.toLowerCase();

            let fileFindings: Finding[] = [];

            if (p.includes('dockerfile')) {
              fileFindings = scanDockerfile(file.path, content);
            } else if (p === 'docker-compose.yml' || p === 'docker-compose.yaml') {
              fileFindings = scanDockerCompose(file.path, content);
            } else if (p.startsWith('.github/workflows/')) {
              fileFindings = scanWorkflow(file.path, content);
            } else if (p === 'vercel.json') {
              fileFindings = scanVercel(file.path, content);
            } else if (p === 'render.yaml') {
              fileFindings = scanRender(file.path, content);
            }

            for (const f of fileFindings) {
              findings.push(f);
              if (emit) {
                emit('finding', f);
              }
            }
          }
        } catch (fileErr: any) {
          console.warn(`[IaC Scanner] Failed to audit file ${file.path}: ${fileErr.message}`);
        }
      }
    }
  } catch (err: any) {
    console.error(`[IaC Scanner] Critical scanner failure for ${owner}/${repo}: ${err.message}`);
    const failedFinding: Finding = {
      id: `iac-failure-${Date.now()}`,
      scanner: 'iac',
      title: 'IaC Scanner Connection Failure',
      severity: 'MODERATE',
      description: `Infrastructure-as-Code (IaC) scanner failed to read repository files: ${err.message}`,
      remediation: 'Verify your GitHub account connection in Settings / vault. Ensure the repository contains infrastructure files (Dockerfile, Compose, workflows, vercel.json, render.yaml).',
      file: 'GitHub Tree API',
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
