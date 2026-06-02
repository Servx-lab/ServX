import { Request, Response, NextFunction } from 'express';
import { getGithubToken } from '../github/service';
import { scanGithubSast } from '../../services/scanners/githubSastScanner';
import { scanGithubSecrets } from '../../services/scanners/githubSecretScanner';
import { scanOsvSca } from '../../services/scanners/osvScanner';
import { scanIac } from '../../services/scanners/iacScanner';
import { Finding } from '../../services/scanners/types';
import { Octokit } from '@octokit/rest';
import axios from 'axios';

// Helper to parse GitHub URLs
export function parseGithubUrl(urlStr: string): { owner: string; repo: string } | null {
  if (!urlStr) return null;
  const cleaned = urlStr.trim();
  try {
    const url = new URL(cleaned);
    if (url.hostname === 'github.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
      }
    }
  } catch {
    // Treat as "owner/repo" string
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }
  return null;
}

function sendSseEvent(res: Response, event: string, data: any) {
  // Guard against writing to a closed/ended stream — prevents ERR_STREAM_WRITE_AFTER_END
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch (writeErr: any) {
    // Silently absorb write errors (e.g. client disconnected mid-stream)
    console.warn(`[SSE] Suppressed write error after stream end: ${writeErr.message}`);
  }
}

async function resolveDeploymentUrl(octokit: Octokit, owner: string, repo: string): Promise<string | null> {
  try {
    console.log(`[Security Scan Stream] Fetching deployments for ${owner}/${repo}`);
    const { data: deployments } = await octokit.rest.repos.listDeployments({
      owner,
      repo,
      per_page: 5,
    });

    if (deployments && deployments.length > 0) {
      for (const dep of deployments) {
        const { data: statuses } = await octokit.rest.repos.listDeploymentStatuses({
          owner,
          repo,
          deployment_id: dep.id,
          per_page: 5,
        });

        const activeStatus = statuses.find(s => s.state === 'success' && s.environment_url);
        if (activeStatus?.environment_url) {
          return activeStatus.environment_url;
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Security Scan Stream] Failed to resolve deployment URL: ${err.message}`);
  }
  return null;
}

async function runDastScan(targetUrl: string, emit: (event: string, data: any) => void): Promise<Finding[]> {
  const findings: Finding[] = [];
  emit('scanner:start', { scanner: 'dast' });

  try {
    const dastServiceUrl = process.env.DAST_SERVICE_URL;
    if (dastServiceUrl) {
      console.log(`[DAST] Routing scan to microservice: ${dastServiceUrl}/scan`);
      const response = await axios.post(`${dastServiceUrl}/scan`, { url: targetUrl }, { timeout: 60000 });
      if (response.data && Array.isArray(response.data.findings)) {
        for (const finding of response.data.findings) {
          findings.push(finding);
          emit('finding', finding);
        }
      }
    } else {
      console.log(`[DAST] DAST_SERVICE_URL not configured. Running fallback fetch()-based HTTP header scanner.`);
      const response = await axios.get(targetUrl, { timeout: 10000, validateStatus: () => true });
      const headers = response.headers;

      // 1. Missing Security Headers
      const missingHeaders = [
        { key: 'content-security-policy', name: 'Content-Security-Policy (CSP)', severity: 'HIGH' as const, desc: 'A Content Security Policy (CSP) prevents a wide range of attacks including cross-site scripting and data injection.', remedy: 'Configure a robust Content-Security-Policy header on your server.' },
        { key: 'strict-transport-security', name: 'Strict-Transport-Security (HSTS)', severity: 'MODERATE' as const, desc: 'HSTS forces browsers to connect only via HTTPS, protecting against man-in-the-middle attacks.', remedy: 'Add the Strict-Transport-Security header with appropriate max-age value.' },
        { key: 'x-frame-options', name: 'X-Frame-Options', severity: 'MODERATE' as const, desc: 'X-Frame-Options prevents clickjacking by restricting whether the page can be loaded in an iframe.', remedy: 'Configure X-Frame-Options header to SAMEORIGIN or DENY.' },
        { key: 'x-content-type-options', name: 'X-Content-Type-Options', severity: 'LOW' as const, desc: 'Setting X-Content-Type-Options: nosniff prevents the browser from MIME-sniffing away from the declared content-type.', remedy: 'Add "X-Content-Type-Options: nosniff" to server headers.' }
      ];

      missingHeaders.forEach((h) => {
        if (!headers[h.key]) {
          const finding: Finding = {
            id: `dast-header-missing-${h.key}`,
            scanner: 'dast',
            title: `Missing ${h.name} Security Header`,
            severity: h.severity,
            description: h.desc,
            remediation: h.remedy,
            file: 'HTTP Response Headers',
            line: 1,
            evidence: `Header "${h.key}" is not set`,
            timestamp: new Date().toISOString(),
          };
          findings.push(finding);
          emit('finding', finding);
        }
      });

      // 2. Server Information Disclosure
      const serverHeader = headers['server'];
      const poweredByHeader = headers['x-powered-by'];
      if (serverHeader) {
        const finding: Finding = {
          id: `dast-header-server-disclosure`,
          scanner: 'dast',
          title: 'Server Information Disclosure',
          severity: 'LOW',
          description: `The HTTP response exposes specific web server software information (${serverHeader}), which helps attackers search for targeted exploits.`,
          remediation: 'Disable the server banner / Server signature in your web server configuration.',
          file: 'HTTP Response Headers',
          line: 1,
          evidence: `Server: ${serverHeader}`,
          timestamp: new Date().toISOString(),
        };
        findings.push(finding);
        emit('finding', finding);
      }
      if (poweredByHeader) {
        const finding: Finding = {
          id: `dast-header-powered-disclosure`,
          scanner: 'dast',
          title: 'Technology Stack Disclosure (X-Powered-By)',
          severity: 'LOW',
          description: `The HTTP response exposes the underlying technology stack (${poweredByHeader}) via the X-Powered-By header.`,
          remediation: 'Configure your web framework or server to hide the X-Powered-By header.',
          file: 'HTTP Response Headers',
          line: 1,
          evidence: `X-Powered-By: ${poweredByHeader}`,
          timestamp: new Date().toISOString(),
        };
        findings.push(finding);
        emit('finding', finding);
      }
    }
  } catch (err: any) {
    console.error(`[DAST] DAST scanning failed: ${err.message}`);
    const failedFinding: Finding = {
      id: 'dast-failed',
      scanner: 'dast',
      title: 'DAST Scan Connection Failure',
      severity: 'HIGH',
      description: `Could not connect to target URL ${targetUrl} for security auditing: ${err.message}`,
      remediation: 'Verify the deployment URL is active, public, and not blocking automated requests.',
      file: targetUrl,
      line: 1,
      evidence: err.message,
      timestamp: new Date().toISOString(),
    };
    findings.push(failedFinding);
    emit('finding', failedFinding);
  }

  emit('scanner:done', { scanner: 'dast', findingsCount: findings.length });
  return findings;
}

export async function scanStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  const uid = req.user?.id;
  const { target, type, dastUrl, scanRepo, scanDast } = req.body;

  if (!uid) {
    res.status(401).json({ error: 'Authenticated user context is required.' });
    return;
  }
  if (!target || !type) {
    res.status(400).json({ error: 'Both target and type (repo | url) are required in request body.' });
    return;
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`[Security Scan Stream] Starting scan. Target: ${target}, Type: ${type}, User: ${uid}`);

  const emit = (event: string, data: any) => {
    sendSseEvent(res, event, data);
  };

  try {
    if (type === 'repo') {
      const gitInfo = parseGithubUrl(target);
      if (!gitInfo) {
        emit('error', { message: 'Invalid GitHub repository URL or format. Expected https://github.com/owner/repo or owner/repo' });
        res.end();
        return;
      }

      const { owner, repo } = gitInfo;
      console.log(`[Security Scan Stream] Parsed GitHub Repo: ${owner}/${repo}`);

      // Load GitHub OAuth token from Supabase github_vault (same store used by repos, integrations, etc.)
      let token = '';
      try {
        const { accessToken } = await getGithubToken(uid);
        token = accessToken;
      } catch (tokenErr: any) {
        console.error(`[Security Scan Stream] GitHub token resolution failed: ${tokenErr.message}`);
        emit('error', { message: 'GitHub account not connected. Please connect your GitHub account via Settings → Connections first.' });
        res.end();
        return;
      }

      const octokit = new Octokit({ auth: token });

      // Initialize scans concurrently based on user selections
      const scanners = [];

      // Run Repo Code audit scanners (SAST, SCA, Secrets, IaC) if enabled
      if (scanRepo !== false) {
        scanners.push(
          scanGithubSast(owner, repo, token, emit),
          scanGithubSecrets(owner, repo, token, emit),
          scanOsvSca(owner, repo, token, emit),
          scanIac(owner, repo, token, emit)
        );
      } else {
        // Emit done for skipped repo scanners
        emit('scanner:start', { scanner: 'sast' });
        emit('scanner:done', { scanner: 'sast', findingsCount: 0 });
        emit('scanner:start', { scanner: 'secret' });
        emit('scanner:done', { scanner: 'secret', findingsCount: 0 });
        emit('scanner:start', { scanner: 'sca' });
        emit('scanner:done', { scanner: 'sca', findingsCount: 0 });
        emit('scanner:start', { scanner: 'iac' });
        emit('scanner:done', { scanner: 'iac', findingsCount: 0 });
      }

      // Run DAST live audit scanner if enabled
      if (scanDast !== false) {
        // Resolve DAST target: use manual override if provided, otherwise auto-discover from GitHub Deployments
        let dastTarget: string | null = dastUrl?.trim() || null;
        if (dastTarget) {
          console.log(`[Security Scan Stream] Using manually provided DAST URL: ${dastTarget}`);
        } else {
          try {
            dastTarget = await resolveDeploymentUrl(octokit, owner, repo);
            if (dastTarget) {
              console.log(`[Security Scan Stream] Auto-discovered deployment URL for DAST: ${dastTarget}`);
            } else {
              console.log(`[Security Scan Stream] No live deployments found for DAST scan of ${owner}/${repo}`);
            }
          } catch (err: any) {
            console.warn(`[Security Scan Stream] DAST auto-discovery failed: ${err.message}`);
          }
        }

        if (dastTarget) {
          scanners.push(runDastScan(dastTarget, emit));
        } else {
          emit('scanner:start', { scanner: 'dast' });
          emit('scanner:done', { scanner: 'dast', findingsCount: 0 });
        }
      } else {
        emit('scanner:start', { scanner: 'dast' });
        emit('scanner:done', { scanner: 'dast', findingsCount: 0 });
      }

      // Run all enabled scanners concurrently
      await Promise.allSettled(scanners);
      console.log(`[Security Scan Stream] Repository scan completed for ${owner}/${repo}`);

    } else if (type === 'url') {
      // Validate live URL
      let validatedUrl = '';
      try {
        const parsed = new URL(target);
        validatedUrl = parsed.toString();
      } catch {
        emit('error', { message: 'Invalid target URL format for DAST scanning.' });
        res.end();
        return;
      }

      // Run DAST Scan
      await runDastScan(validatedUrl, emit);
      console.log(`[Security Scan Stream] DAST scan completed for ${validatedUrl}`);
    } else {
      emit('error', { message: 'Unsupported scan type. Expected "repo" or "url".' });
    }
  } catch (err: any) {
    console.error(`[Security Scan Stream] Fatal error in scan pipeline: ${err.message}`);
    emit('error', { message: `Scan pipeline encountered a fatal error: ${err.message}` });
  } finally {
    // Send final completion event and close response stream only if still open.
    // Early-return paths (e.g. token failure) already call res.end(); the finally
    // block still executes after a return-inside-try, so we must guard here.
    if (!res.writableEnded && !res.destroyed) {
      emit('scan:complete', { timestamp: new Date().toISOString() });
      res.end();
    }
  }
}
