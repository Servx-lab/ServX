import puppeteer from 'puppeteer';

export interface LeakedSecret {
  type: string;
  pattern: string;
  context: string;
  source: string;
}

const SECRET_PATTERNS = {
  google: /AIza[0-9A-Za-z-_]{35}/,
  stripe: /sk_live_[0-9a-zA-Z]{24}/,
  aws_key: /AKIA[0-9A-Z]{16}/,
  github: /ghp_[a-zA-Z0-9]{36}/,
  genericBearer: /Bearer [a-zA-Z0-9-._~+/]+=*/,
};

/**
 * Scans a live deployment URL using Puppeteer to intercept console logs
 * and network traffic to find leaked secrets.
 */
export async function scanLiveDeployment(targetUrl: string): Promise<LeakedSecret[]> {
  const leakedSecrets: LeakedSecret[] = [];
  let browser: any = null;
  
  try {
    // Launch headless browser with robust flags
    console.log(`[DAST] Launching browser for: ${targetUrl}`);
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH || undefined, // Allow custom chrome path
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Console Interceptor
    page.on('console', msg => {
      const text = msg.text();
      Object.entries(SECRET_PATTERNS).forEach(([name, regex]) => {
        if (regex.test(text)) {
          console.warn(`[DAST] Found potential ${name} leak in console log`);
          leakedSecrets.push({
            type: 'Console Leak',
            pattern: name,
            context: text.substring(0, 100),
            source: 'Console'
          });
        }
      });
    });

    // 2. Network Interceptor (Responses)
    page.on('response', async response => {
      try {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        if (contentType.includes('application/json') || contentType.includes('text/') || contentType.includes('javascript')) {
          const body = await response.text();
          Object.entries(SECRET_PATTERNS).forEach(([name, regex]) => {
            if (regex.test(body)) {
              console.warn(`[DAST] Found potential ${name} leak in network response: ${url}`);
              leakedSecrets.push({
                type: 'Network Payload Leak',
                pattern: name,
                context: `Detected in response from: ${url}`,
                source: url
              });
            }
          });
        }
      } catch (err) {
        // Body might be empty or binary, ignore
      }
    });

    // 3. Execution
    console.log(`[DAST] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 45000 // 45s timeout for scan
    });

    // Wait for dynamic loads
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (err: any) {
    console.error(`[DAST] FATAL: Scan failed for ${targetUrl}`);
    console.error(`[DAST] Full Error: ${err.stack || err.message}`);
    
    if (err.message.includes('Could not find Chromium')) {
        console.error('[DAST] CRITICAL: Puppeteer could not find Chromium binary. Run "npx puppeteer install" or set CHROME_PATH.');
    }
  } finally {
    if (browser) {
        console.log(`[DAST] Closing browser session for ${targetUrl}`);
        await browser.close();
    }
  }

  return leakedSecrets;
}
