import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

dotenv.config();

const app = express();
const PORT = process.env.DAST_PORT || 5001;

app.use(cors());
app.use(express.json());

const SECRET_PATTERNS = {
  google: /AIza[0-9A-Za-z-_]{35}/,
  stripe: /sk_live_[0-9a-zA-Z]{24}/,
  aws_key: /AKIA[0-9A-Z]{16}/,
  github: /ghp_[a-zA-Z0-9]{36}/,
  genericBearer: /Bearer [a-zA-Z0-9-._~+/]+=*/,
};

// Helper to check standard subpaths for Broken Access Control (A01)
async function probeAccessControl(baseUrl) {
  const findings = [];
  const pathsToProbe = [
    { path: '/admin', title: 'Exposed Administrator Panel', desc: 'The administration path (/admin) is accessible without authorization, revealing application internals.' },
    { path: '/.env', title: 'Exposed Configuration File (.env)', desc: 'The environment configuration file (.env) is publicly accessible, leaking database credentials and secret keys.' },
    { path: '/api/users', title: 'Unauthenticated User API Directory', desc: 'The users directory endpoint (/api/users) is accessible without credentials, leaking user records.' }
  ];

  for (const p of pathsToProbe) {
    try {
      const url = new URL(p.path, baseUrl).toString();
      const res = await fetch(url, { method: 'GET', redirect: 'manual' });
      // If returns 200 OK and is not a redirect, flag as potential Broken Access Control
      if (res.status === 200) {
        findings.push({
          id: `dast-access-control-${p.path.replace(/\//g, '')}`,
          scanner: 'dast',
          title: `OWASP A01: ${p.title}`,
          severity: p.path.includes('.env') ? 'CRITICAL' : 'HIGH',
          description: p.desc,
          remediation: `Configure your server middleware to return a 401 Unauthorized or 403 Forbidden status for the path ${p.path} when no valid session token is provided.`,
          file: url,
          line: 1,
          evidence: `Status Code: 200 OK for unauthenticated probe`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Ignore network errors on paths
    }
  }
  return findings;
}

async function auditHeadersAndCookies(targetUrl) {
  const findings = [];
  try {
    const response = await fetch(targetUrl, { method: 'GET', redirect: 'follow' });
    const headers = response.headers;

    // OWASP A02: Cryptographic Failures (HTTP protocol usage)
    if (targetUrl.startsWith('http://')) {
      findings.push({
        id: 'dast-insecure-protocol',
        scanner: 'dast',
        title: 'OWASP A02: Insecure Communication Protocol (HTTP)',
        severity: 'HIGH',
        description: 'The target website communicates over unencrypted HTTP. All credentials, session tokens, and data payloads are vulnerable to interception.',
        remediation: 'Implement automatic redirect from HTTP to HTTPS and bind SSL/TLS certificates.',
        file: targetUrl,
        line: 1,
        evidence: `Protocol is insecure HTTP`,
        timestamp: new Date().toISOString(),
      });
    }

    // OWASP A02: Insecure Cookies (Missing Secure / HttpOnly flags)
    const cookies = headers.get('set-cookie');
    if (cookies) {
      const cookieLines = cookies.split(/,(?=[^;]+;)/);
      cookieLines.forEach((cookie, idx) => {
        const parts = cookie.split(';').map(p => p.trim().toLowerCase());
        const hasSecure = parts.includes('secure');
        const hasHttpOnly = parts.includes('httponly');
        const nameValue = cookie.split(';')[0];

        if (!hasSecure || !hasHttpOnly) {
          findings.push({
            id: `dast-cookie-insecure-${idx}`,
            scanner: 'dast',
            title: 'OWASP A02: Cookie Missing Security Flags',
            severity: 'MODERATE',
            description: `Session cookie (${nameValue.split('=')[0]}) is missing security attributes: ${!hasSecure ? 'Secure' : ''} ${!hasHttpOnly ? 'HttpOnly' : ''}.`,
            remediation: 'Configure Set-Cookie directives to include "Secure" (forces HTTPS transmission) and "HttpOnly" (prevents client-side JS read access).',
            file: 'HTTP Set-Cookie Headers',
            line: 1,
            evidence: `Set-Cookie: ${cookie.substring(0, 40)}...`,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    // OWASP A05: Security Misconfiguration (Missing Security Headers)
    const missingHeaders = [
      { key: 'content-security-policy', name: 'Content-Security-Policy (CSP)', severity: 'HIGH', desc: 'A Content Security Policy (CSP) prevents a wide range of attacks including cross-site scripting and data injection.', remedy: 'Configure a robust Content-Security-Policy header on your server.' },
      { key: 'strict-transport-security', name: 'Strict-Transport-Security (HSTS)', severity: 'MODERATE', desc: 'HSTS forces browsers to connect only via HTTPS, protecting against man-in-the-middle attacks.', remedy: 'Add the Strict-Transport-Security header with appropriate max-age value.' },
      { key: 'x-frame-options', name: 'X-Frame-Options', severity: 'MODERATE', desc: 'X-Frame-Options prevents clickjacking by restricting whether the page can be loaded in an iframe.', remedy: 'Configure X-Frame-Options header to SAMEORIGIN or DENY.' },
      { key: 'x-content-type-options', name: 'X-Content-Type-Options', severity: 'LOW', desc: 'Setting X-Content-Type-Options: nosniff prevents the browser from MIME-sniffing away from the declared content-type.', remedy: 'Add "X-Content-Type-Options: nosniff" to server headers.' },
      { key: 'referrer-policy', name: 'Referrer-Policy', severity: 'LOW', desc: 'Referrer-Policy governs how much referrer information is included in requests.', remedy: 'Configure a secure Referrer-Policy header, e.g., "same-origin" or "strict-origin-when-cross-origin".' },
      { key: 'permissions-policy', name: 'Permissions-Policy', severity: 'LOW', desc: 'Permissions-Policy controls browser features like camera, microphone, or geolocation permissions.', remedy: 'Set a restrictive Permissions-Policy header to prevent unauthorized sensor usage.' }
    ];

    missingHeaders.forEach((h) => {
      if (!headers.get(h.key)) {
        findings.push({
          id: `dast-header-missing-${h.key}`,
          scanner: 'dast',
          title: `OWASP A05: Missing ${h.name} Security Header`,
          severity: h.severity,
          description: h.desc,
          remediation: h.remedy,
          file: 'HTTP Response Headers',
          line: 1,
          evidence: `Header "${h.key}" is not set`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // CORS Wildcard check (A01)
    const corsOrigin = headers.get('access-control-allow-origin');
    if (corsOrigin === '*') {
      findings.push({
        id: 'dast-cors-wildcard',
        scanner: 'dast',
        title: 'OWASP A01: Wildcard CORS Header Enabled (*)',
        severity: 'HIGH',
        description: 'The server accepts requests from any origin by returning Access-Control-Allow-Origin: *. This exposes authenticated APIs to malicious external domains.',
        remediation: 'Restrict origins to specific trusted domains instead of a wildcard.',
        file: 'HTTP Response Headers',
        line: 1,
        evidence: `Access-Control-Allow-Origin: *`,
        timestamp: new Date().toISOString(),
      });
    }

    // OWASP A05: Server Information Disclosure
    const serverHeader = headers.get('server');
    const poweredByHeader = headers.get('x-powered-by');
    if (serverHeader) {
      findings.push({
        id: `dast-header-server-disclosure`,
        scanner: 'dast',
        title: 'OWASP A05: Server Information Disclosure',
        severity: 'LOW',
        description: `The HTTP response exposes specific web server software information (${serverHeader}), which helps attackers search for targeted exploits.`,
        remediation: 'Disable the server banner / Server signature in your web server configuration.',
        file: 'HTTP Response Headers',
        line: 1,
        evidence: `Server: ${serverHeader}`,
        timestamp: new Date().toISOString(),
      });
    }
    if (poweredByHeader) {
      findings.push({
        id: `dast-header-powered-disclosure`,
        scanner: 'dast',
        title: 'OWASP A05: Technology Stack Disclosure (X-Powered-By)',
        severity: 'LOW',
        description: `The HTTP response exposes the underlying technology stack (${poweredByHeader}) via the X-Powered-By header.`,
        remediation: 'Configure your web framework or server to hide the X-Powered-By header.',
        file: 'HTTP Response Headers',
        line: 1,
        evidence: `X-Powered-By: ${poweredByHeader}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[DAST Worker] HTTP header audit failed:', err.message);
  }
  return findings;
}

app.post('/scan', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  console.log(`[DAST Worker] Starting deep DAST scan for target: ${url}`);
  const findings = [];

  // 1. Run quick HTTP audits
  const headerFindings = await auditHeadersAndCookies(url);
  findings.push(...headerFindings);

  // 2. Probe access control (A01)
  const acFindings = await probeAccessControl(url);
  findings.push(...acFindings);

  // 3. Run Puppeteer browser analysis
  let browser = null;
  try {
    let executablePath = null;
    try {
      executablePath = await chromium.executablePath();
    } catch (err) {
      console.log('[DAST Worker] Could not resolve sparticuz/chromium. Falling back to local Chrome.');
      executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome' || undefined;
    }

    console.log(`[DAST Worker] Launching chromium using path: ${executablePath}`);
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Monitor for runtime JS errors (A09: Logging and Monitoring)
    page.on('pageerror', (err) => {
      findings.push({
        id: `dast-js-error-${Buffer.from(err.message).toString('base64').substring(0, 10)}`,
        scanner: 'dast',
        title: 'OWASP A09: Unhandled Client-Side JS Exception',
        severity: 'LOW',
        description: `An unhandled client-side runtime exception occurred: ${err.message}. This can indicate improper error logging or expose diagnostic logs.`,
        remediation: 'Inspect the stack trace and wrap vulnerable event handlers or lifecycle hooks in try-catch statements.',
        file: url,
        line: 1,
        evidence: err.stack || err.message,
        timestamp: new Date().toISOString(),
      });
    });

    // Monitor console logs for leaked secrets or warnings (A09)
    page.on('console', (msg) => {
      const text = msg.text();
      Object.entries(SECRET_PATTERNS).forEach(([name, regex]) => {
        if (regex.test(text)) {
          findings.push({
            id: `dast-console-secret-${name}`,
            scanner: 'dast',
            title: `OWASP A09: Potential ${name} Leaked in Client Console`,
            severity: 'CRITICAL',
            description: `A console log contains a pattern matching a ${name} secret: ${text.substring(0, 50)}...`,
            remediation: 'Remove all debug console.log statements and verify no secure tokens or environment variables are printed to the client logs.',
            file: url,
            line: 1,
            evidence: `Console logged: ${text.substring(0, 100)}`,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    // Monitor network payloads for secrets (A07)
    page.on('response', async (response) => {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json') || contentType.includes('text/') || contentType.includes('javascript')) {
          const body = await response.text();
          Object.entries(SECRET_PATTERNS).forEach(([name, regex]) => {
            if (regex.test(body)) {
              findings.push({
                id: `dast-payload-secret-${name}-${Buffer.from(response.url()).toString('base64').substring(0, 8)}`,
                scanner: 'dast',
                title: `OWASP A07: Potential ${name} Leaking in Network Response Payload`,
                severity: 'CRITICAL',
                description: `Network response payload from endpoint ${response.url()} contains pattern matching a ${name} secret.`,
                remediation: 'Ensure secure credentials are not included in public API response payloads. Filter out keys before returning payloads.',
                file: response.url(),
                line: 1,
                evidence: `Endpoint: ${response.url()}`,
                timestamp: new Date().toISOString(),
              });
            }
          });
        }
      } catch {
        // Safe to ignore binary or empty responses
      }
    });

    // Navigate to URL
    console.log(`[DAST Worker] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract HTML and run audits for other OWASP rules
    const htmlContent = await page.content();

    // OWASP A08: Software and Data Integrity Failures (External CDN Scripts lacking SRI hashes)
    const integrityAudit = await page.evaluate(() => {
      const externalScripts = Array.from(document.querySelectorAll('script[src^="http"]'));
      const missingIntegrity = externalScripts.filter(s => !s.getAttribute('integrity'));
      return missingIntegrity.map(s => s.getAttribute('src'));
    });

    if (integrityAudit.length > 0) {
      findings.push({
        id: 'dast-integrity-sri-missing',
        scanner: 'dast',
        title: 'OWASP A08: CDN Script Lacks Subresource Integrity (SRI)',
        severity: 'MODERATE',
        description: `The application loads external libraries (${integrityAudit[0]}) from a public CDN without a Subresource Integrity (SRI) signature. If the CDN is compromised, malicious code can be injected.`,
        remediation: 'Add the "integrity" attribute containing a cryptographic SHA256/SHA384 hash of the library, e.g., integrity="sha384-...".',
        file: url,
        line: 1,
        evidence: `Missing integrity on CDN script: ${integrityAudit[0]}`,
        timestamp: new Date().toISOString(),
      });
    }

    // OWASP A04: Insecure Design (Forms with passwords lacking autocomplete controls)
    const autocompleteAudit = await page.evaluate(() => {
      const passwords = Array.from(document.querySelectorAll('input[type="password"]'));
      const insecure = passwords.filter(p => {
        const auto = p.getAttribute('autocomplete');
        return !auto || (auto !== 'off' && auto !== 'new-password' && auto !== 'current-password');
      });
      return insecure.length > 0;
    });

    if (autocompleteAudit) {
      findings.push({
        id: 'dast-insecure-design-autocomplete',
        scanner: 'dast',
        title: 'OWASP A04: Sensitive Form Input Autocomplete Enabled',
        severity: 'LOW',
        description: 'The application contains credential/password input fields that allow browser autocomplete caching, which exposes passwords on shared local workstations.',
        remediation: 'Configure sensitive credentials inputs with attribute: autocomplete="new-password" or autocomplete="off".',
        file: url,
        line: 1,
        evidence: 'Input[type="password"] allows autocomplete cache',
        timestamp: new Date().toISOString(),
      });
    }

    // OWASP A06: Vulnerable and Outdated Components (Checking script sources for legacy libraries)
    const legacyLibraries = [
      { name: 'jQuery', regex: /jquery[\/\.-](1\.\d+\.\d+|2\.\d+\.\d+)/i, desc: 'Outdated jQuery versions (v1.x/v2.x) contain severe Cross-Site Scripting (XSS) and prototype pollution vulnerabilities.' },
      { name: 'AngularJS', regex: /angular[\/\.-](1\.\d+\.\d+)/i, desc: 'Legacy AngularJS v1.x has reached End-of-Life (EOL) and contains sandbox bypass vulnerabilities.' }
    ];

    const scriptUrls = await page.evaluate(() => Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src')));
    for (const sUrl of scriptUrls) {
      for (const lib of legacyLibraries) {
        if (lib.regex.test(sUrl)) {
          findings.push({
            id: `dast-vulnerable-component-${lib.name.toLowerCase()}`,
            scanner: 'dast',
            title: `OWASP A06: Outdated & Vulnerable Component (${lib.name})`,
            severity: 'HIGH',
            description: lib.desc,
            remediation: `Upgrade the ${lib.name} script to a modern, supported version.`,
            file: sUrl,
            line: 1,
            evidence: `Script URL: ${sUrl}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // OWASP A07: Identification and Authentication Failures (Form submissions over GET method)
    const insecureForms = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const badForms = forms.filter(f => {
        const method = (f.getAttribute('method') || 'get').toLowerCase();
        const hasCredentials = !!f.querySelector('input[type="password"]') || !!f.querySelector('input[name*="pass"]') || !!f.querySelector('input[name*="key"]');
        return method === 'get' && hasCredentials;
      });
      return badForms.length > 0;
    });

    if (insecureForms) {
      findings.push({
        id: 'dast-auth-form-get-method',
        scanner: 'dast',
        title: 'OWASP A07: Authentication Form Uses HTTP GET Method',
        severity: 'HIGH',
        description: 'Authentication forms containing credentials submit inputs via GET query parameters, exposing user passwords in browser history and proxy access logs.',
        remediation: 'Configure authentication forms to use the HTTP POST method (method="POST").',
        file: url,
        line: 1,
        evidence: 'Form containing passwords uses default GET submission',
        timestamp: new Date().toISOString(),
      });
    }

    // OWASP A10: Server-Side Request Forgery (SSRF) (Unvalidated URL inputs)
    const urlInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.some(i => i.type === 'url' || i.name?.includes('url') || i.placeholder?.includes('http'));
    });

    if (urlInputs) {
      findings.push({
        id: 'dast-ssrf-unvalidated-inputs',
        scanner: 'dast',
        title: 'OWASP A10: Unvalidated URL Form Inputs (Potential SSRF)',
        severity: 'MODERATE',
        description: 'The website collects target URLs in form inputs. If the server fetches these URLs without strict domain/IP filters, attackers can execute Server-Side Request Forgery (SSRF).',
        remediation: 'Implement server-side domain whitelist filtering. Restrict outgoing fetches to public IPs, and block local/private IP subnets (e.g., 10.0.0.0/8, 192.168.0.0/16, 127.0.0.1).',
        file: url,
        line: 1,
        evidence: 'Input field accepts URL/http patterns',
        timestamp: new Date().toISOString(),
      });
    }

    // Check for DOM-based XSS vulnerability via active probing of forms (OWASP A03: Injection)
    console.log('[DAST Worker] Performing active client-side form auditing...');
    
    // Inject and probe inputs
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], textarea');
      const payload = '<svg onload=window.dast_xss=1>';
      
      inputs.forEach((input) => {
        (input).value = payload;
        // Trigger standard change events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      // Try to click standard submit/login buttons
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      buttons.forEach((btn) => {
        const text = (btn.textContent || '').toLowerCase();
        if (text.includes('submit') || text.includes('save') || text.includes('search') || text.includes('go')) {
          (btn).click();
        }
      });
    });

    // Wait 2 seconds for JS execution
    await new Promise((r) => setTimeout(r, 2000));

    // Check if probe executed
    const isXssExecuted = await page.evaluate(() => {
      return (window).dast_xss === 1;
    });

    if (isXssExecuted) {
      findings.push({
        id: 'dast-dom-xss',
        scanner: 'dast',
        title: 'OWASP A03: DOM-based Cross-Site Scripting (XSS) Vulnerability',
        severity: 'CRITICAL',
        description: 'The application executed an injected script payload when standard input fields were filled and submitted. This allows attackers to run arbitrary code on behalf of visiting users.',
        remediation: 'Escape all user input before injecting it into the DOM, use secure JSX/templates, and implement strict Content-Security-Policy (CSP) headers.',
        file: url,
        line: 1,
        evidence: 'Injected <svg onload=window.dast_xss=1> executed successfully',
        timestamp: new Date().toISOString(),
      });
    }

    // Scan page source for SQL error indicators to detect SQL injection vulnerabilities (A03)
    const sqlErrorIndicators = [
      /SQLITE_ERROR/i,
      /Syntax error in SQL statement/i,
      /mysql_query/i,
      /PostgreSQL query failed/i,
      /ORA-00933/i
    ];
    for (const regex of sqlErrorIndicators) {
      if (regex.test(htmlContent)) {
        findings.push({
          id: 'dast-sql-injection-leak',
          scanner: 'dast',
          title: 'OWASP A03: SQL Query Error Leak (Potential SQL Injection)',
          severity: 'CRITICAL',
          description: 'The page content contains a database query error signature. This indicates database query issues that could allow SQL Injection attacks.',
          remediation: 'Parameterize all database SQL queries, implement prepared statements, and disable verbose database error messages in production.',
          file: url,
          line: 1,
          evidence: `Signature found: ${htmlContent.substring(htmlContent.search(regex), htmlContent.search(regex) + 50)}`,
          timestamp: new Date().toISOString(),
        });
        break; // Show one SQL leak max
      }
    }

  } catch (err) {
    console.error('[DAST Worker] Puppeteer execution failed:', err.message);
    findings.push({
      id: 'dast-browser-error',
      scanner: 'dast',
      title: 'OWASP A05: Headless Browser Audit Limitation',
      severity: 'LOW',
      description: `Could not launch chromium browser for deep DOM/XSS probing: ${err.message}. Header checks and static validations are still active.`,
      remediation: 'Check server chromium installation, memory configurations, or Chrome path.',
      file: url,
      line: 1,
      evidence: err.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (browser) {
      await browser.close();
      console.log('[DAST Worker] Closed browser session.');
    }
  }

  res.json({
    success: true,
    url,
    timestamp: new Date().toISOString(),
    findings,
  });
});

app.listen(PORT, () => {
  console.log(`📡 DAST Worker microservice LIVE at http://localhost:${PORT}`);
});
