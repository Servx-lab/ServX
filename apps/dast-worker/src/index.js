import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import http from 'http';

dotenv.config();

const app = express();
const PORT = process.env.DAST_PORT || 5001;

app.use(cors());
app.use(express.json());

// Type definition for Findings to keep structure consistent
const SECRET_PATTERNS = {
  google: /AIza[0-9A-Za-z-_]{35}/,
  stripe: /sk_live_[0-9a-zA-Z]{24}/,
  aws_key: /AKIA[0-9A-Z]{16}/,
  github: /ghp_[a-zA-Z0-9]{36}/,
  genericBearer: /Bearer [a-zA-Z0-9-._~+/]+=*/,
};

async function auditHeaders(targetUrl) {
  const findings = [];
  try {
    const response = await fetch(targetUrl, { method: 'GET', redirect: 'follow' });
    const headers = response.headers;

    // 1. Missing Security Headers
    const missingHeaders = [
      { key: 'content-security-policy', name: 'Content-Security-Policy (CSP)', severity: 'HIGH', desc: 'A Content Security Policy (CSP) prevents a wide range of attacks including cross-site scripting and data injection.', remedy: 'Configure a robust Content-Security-Policy header on your server.' },
      { key: 'strict-transport-security', name: 'Strict-Transport-Security (HSTS)', severity: 'MODERATE', desc: 'HSTS forces browsers to connect only via HTTPS, protecting against man-in-the-middle attacks.', remedy: 'Add the Strict-Transport-Security header with appropriate max-age value.' },
      { key: 'x-frame-options', name: 'X-Frame-Options', severity: 'MODERATE', desc: 'X-Frame-Options prevents clickjacking by restricting whether the page can be loaded in an iframe.', remedy: 'Configure X-Frame-Options header to SAMEORIGIN or DENY.' },
      { key: 'x-content-type-options', name: 'X-Content-Type-Options', severity: 'LOW', desc: 'Setting X-Content-Type-Options: nosniff prevents the browser from MIME-sniffing away from the declared content-type.', remedy: 'Add "X-Content-Type-Options: nosniff" to server headers.' }
    ];

    missingHeaders.forEach((h) => {
      if (!headers.get(h.key)) {
        findings.push({
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
        });
      }
    });

    // 2. Server Information Disclosure
    const serverHeader = headers.get('server');
    const poweredByHeader = headers.get('x-powered-by');
    if (serverHeader) {
      findings.push({
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
      });
    }
    if (poweredByHeader) {
      findings.push({
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

  console.log(`[DAST Worker] Starting DAST scan for target: ${url}`);
  const findings = [];

  // 1. Run quick HTTP header audit
  const headerFindings = await auditHeaders(url);
  findings.push(...headerFindings);

  // 2. Run Puppeteer browser analysis
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

    // Monitor for runtime JS errors
    page.on('pageerror', (err) => {
      findings.push({
        id: `dast-js-error-${Buffer.from(err.message).toString('base64').substring(0, 10)}`,
        scanner: 'dast',
        title: 'Unhandled Client-Side JavaScript Exception',
        severity: 'LOW',
        description: `An unhandled client-side runtime exception occurred: ${err.message}. This can cause application crashes or reveal operational stack traces to users.`,
        remediation: 'Inspect the stack trace and wrap vulnerable event handlers or lifecycle hooks in try-catch statements.',
        file: url,
        line: 1,
        evidence: err.stack || err.message,
        timestamp: new Date().toISOString(),
      });
    });

    // Monitor console logs for leaked secrets or warnings
    page.on('console', (msg) => {
      const text = msg.text();
      Object.entries(SECRET_PATTERNS).forEach(([name, regex]) => {
        if (regex.test(text)) {
          findings.push({
            id: `dast-console-secret-${name}`,
            scanner: 'dast',
            title: `Potential ${name} Leaked in Client Console`,
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

    // Monitor network payloads for secrets
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
                title: `Potential ${name} Leaking in Network Response Payload`,
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

    // Check for DOM-based XSS vulnerability via active probing of forms
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
        title: 'DOM-based Cross-Site Scripting (XSS) Vulnerability',
        severity: 'CRITICAL',
        description: 'The application executed an injected script payload when standard input fields were filled and submitted. This allows attackers to run arbitrary code on behalf of visiting users.',
        remediation: 'Escape all user input before injecting it into the DOM, use secure JSX/templates, and implement strict Content-Security-Policy (CSP) headers.',
        file: url,
        line: 1,
        evidence: 'Injected <svg onload=window.dast_xss=1> executed successfully',
        timestamp: new Date().toISOString(),
      });
    }

  } catch (err) {
    console.error('[DAST Worker] Puppeteer execution failed:', err.message);
    findings.push({
      id: 'dast-browser-error',
      scanner: 'dast',
      title: 'Headless Browser Audit Limitation',
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
