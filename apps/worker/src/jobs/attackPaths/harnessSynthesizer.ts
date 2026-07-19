import type { CPGAnalysisResult } from './cpgAnalyzer.js';

export interface ExploitHarness {
  id: string;
  category: string;
  intent: string;
  testType: 'integration' | 'e2e';
  targetFile?: string;
  targetLine?: number;
  pocScript: string;
  steps: string[];
  successCriteria: string;
}

/**
 * Synthesizes executable Proof-of-Concept (PoC) integration test scripts based on identified CPG dataflow candidates.
 */
export function synthesizeExploitHarnesses(params: {
  repoFullName: string;
  cpgResult: CPGAnalysisResult;
}): ExploitHarness[] {
  const { repoFullName, cpgResult } = params;
  const harnesses: ExploitHarness[] = [];

  const nodeMap = new Map(cpgResult.nodes.map((n) => [n.id, n]));

  for (const candidate of cpgResult.exploitCandidates) {
    const routeNode = nodeMap.get(candidate.routeNodeId);
    const sinkNode = nodeMap.get(candidate.sinkNodeId);

    if (!routeNode || !sinkNode) continue;

    const routeMethod = routeNode.metadata?.method || 'GET';
    const routePath = routeNode.metadata?.path || '/api/resource';
    const cleanPath = routePath.replace(/:([a-zA-Z0-9_]+)/g, '12345');
    const vulnType = candidate.vulnerabilityType;

    let pocScript = '';
    let intent = '';
    const steps: string[] = [];

    if (vulnType === 'SQLi') {
      intent = `Verify SQL Injection vulnerability on ${routeMethod} ${routePath}`;
      steps.push(`Dispatch request with union-based or time-based SQL payload.`);
      steps.push(`Assert unescaped string concatenation reaches database driver.`);
      pocScript = `// Synthesized PoC Harness for SQL Injection
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app'; // Assumed app entry point

describe('Exploit Verification: SQL Injection on ${routePath}', () => {
  it('detonates SQL injection via unvalidated query/param', async () => {
    const sqliPayload = "' OR '1'='1' --";
    const res = await request(app)
      .${routeMethod.toLowerCase()}('${cleanPath}')
      .query({ q: sqliPayload, id: sqliPayload })
      .send({ query: sqliPayload });

    // Exploit assertion: checks if database throws unhandled SQL syntax error or leaks complete table
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });
});`;
    } else if (vulnType === 'IDOR') {
      intent = `Verify Insecure Direct Object Reference (IDOR) on ${routeMethod} ${routePath}`;
      steps.push(`Seed two separate tenant users (User A and User B).`);
      steps.push(`Authenticate as User A and request resource owned exclusively by User B.`);
      steps.push(`Assert unauthorized mutation or data exfiltration succeeds.`);
      pocScript = `// Synthesized PoC Harness for IDOR / Missing Authorization Guard
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app';

describe('Exploit Verification: IDOR on ${routePath}', () => {
  it('allows User A to access or mutate User B resource without guard check', async () => {
    // 1. Create simulated auth headers for attacker (User A)
    const attackerToken = 'Bearer test_token_user_a';
    const victimResourceId = 'victim_resource_999';

    const res = await request(app)
      .${routeMethod.toLowerCase()}('${routePath.replace(/:id|\{id\}/, '${victimResourceId}')}')
      .set('Authorization', attackerToken)
      .send({ title: 'Hacked by User A' });

    // Exploit assertion: if endpoint lacks tenant validation, it returns 200 OK instead of 403 Forbidden
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});`;
    } else if (vulnType === 'RCE') {
      intent = `Verify Remote Code Execution (RCE) via OS Command Sink on ${routePath}`;
      steps.push(`Inject shell meta-characters into parameters forwarded to exec/spawn.`);
      steps.push(`Verify execution of injected command.`);
      pocScript = `// Synthesized PoC Harness for Remote Code Execution (RCE)
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app';

describe('Exploit Verification: RCE on ${routePath}', () => {
  it('executes arbitrary OS commands via unvalidated parameter', async () => {
    const rcePayload = "; echo '__SERVX_RCE_CONFIRMED__' #";
    const res = await request(app)
      .${routeMethod.toLowerCase()}('${cleanPath}')
      .query({ cmd: rcePayload, input: rcePayload });

    expect(JSON.stringify(res.body)).toContain('__SERVX_RCE_CONFIRMED__');
  });
});`;
    } else {
      intent = `Verify unprotected mutation flow on ${routeMethod} ${routePath}`;
      steps.push(`Invoke route without credentials.`);
      steps.push(`Assert mutation reaches database sink.`);
      pocScript = `// Synthesized PoC Harness for Unprotected Route
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app';

describe('Exploit Verification: Unprotected Sink on ${routePath}', () => {
  it('executes sensitive mutation sink without authorization barriers', async () => {
    const res = await request(app)
      .${routeMethod.toLowerCase()}('${cleanPath}')
      .send({ action: 'unauthorized_mutation' });

    expect(res.status).toBeLessThan(400);
  });
});`;
    }

    harnesses.push({
      id: `harness-${cpgResult.summary.repoFullName.replace('/', '-')}-${harnesses.length + 1}`,
      category: vulnType.toLowerCase(),
      intent,
      testType: 'integration',
      targetFile: routeNode.file,
      targetLine: routeNode.line,
      pocScript,
      steps,
      successCriteria: `Test harness must confirm that exploit payload reaches sink unblocked.`,
    });
  }

  return harnesses;
}
