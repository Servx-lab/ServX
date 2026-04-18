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
  
  // Launch headless browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 1. Console Interceptor
    page.on('console', msg => {
      const text = msg.text();
      Object.entries(SECRET_PATTERNS).forEach(([name, regex]) => {
        if (regex.test(text)) {
          leakedSecrets.push({
            type: 'Console Leak',
            pattern: name,
            context: text.substring(0, 100), // Limit context length
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
        
        // Only scan text-based responses
        if (contentType.includes('application/json') || contentType.includes('text/') || contentType.includes('javascript')) {
          const body = await response.text();
          Object.entries(SECRET_PATTERNS).forEach(([name, regex]) => {
            if (regex.test(body)) {
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
    console.log(`[DAST] Scanning ${targetUrl}...`);
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    // Wait a bit more for late-loading scripts
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (err: any) {
    console.error(`[DAST] Scan failed for ${targetUrl}:`, err.message);
  } finally {
    await browser.close();
  }

  return leakedSecrets;
}
