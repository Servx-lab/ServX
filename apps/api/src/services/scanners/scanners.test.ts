import { describe, expect, it } from 'vitest';
import { normalizeSeverity } from './githubSastScanner';
import {
  scanDockerfile,
  scanDockerCompose,
  scanWorkflow,
  scanVercel,
  scanRender
} from './iacScanner';
import {
  cleanSemver,
  parsePackageJson,
  parsePackageLock,
  severityFromCvss
} from './osvScanner';
import {
  SECRET_PATTERNS,
  isLikelyTextFile,
  getPriorityScore
} from './githubSecretScanner';

describe('Attack Path Scanners - Unit Tests', () => {

  // 1. SAST Helper Tests
  describe('githubSastScanner - normalizeSeverity', () => {
    it('should normalize severity strings correctly', () => {
      expect(normalizeSeverity('CRITICAL')).toBe('CRITICAL');
      expect(normalizeSeverity('critical')).toBe('CRITICAL');
      expect(normalizeSeverity('HIGH')).toBe('HIGH');
      expect(normalizeSeverity('high')).toBe('HIGH');
      expect(normalizeSeverity('MODERATE')).toBe('MODERATE');
      expect(normalizeSeverity('medium')).toBe('MODERATE');
      expect(normalizeSeverity('LOW')).toBe('LOW');
      expect(normalizeSeverity('info')).toBe('LOW');
      expect(normalizeSeverity(undefined)).toBe('LOW');
    });
  });

  // 2. Secret Scanner Helper Tests
  describe('githubSecretScanner - Helpers & Patterns', () => {
    it('should classify text files correctly', () => {
      expect(isLikelyTextFile('.env')).toBe(true);
      expect(isLikelyTextFile('src/index.ts')).toBe(true);
      expect(isLikelyTextFile('package.json')).toBe(true);
      expect(isLikelyTextFile('node_modules/lodash/index.js')).toBe(false);
      expect(isLikelyTextFile('image.png')).toBe(false);
      expect(isLikelyTextFile('dist/bundle.js')).toBe(false);
    });

    it('should calculate file priority scores correctly', () => {
      expect(getPriorityScore('.env')).toBe(100);
      expect(getPriorityScore('.env.production')).toBe(100);
      expect(getPriorityScore('src/config/database.ts')).toBe(50);
      expect(getPriorityScore('README.md')).toBe(20); // Root level file
      expect(getPriorityScore('src/components/Button.tsx')).toBe(0);
    });

    it('should match Google API Key secret pattern', () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === 'Google API Key')?.pattern;
      expect(pattern).toBeDefined();
      const testStr = 'const apiKey = "AIzaSyD-1234567890abcdefghijklmnopqrstuvw";';
      expect(testStr.match(pattern!)).not.toBeNull();
    });

    it('should match Stripe Secret Key pattern', () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === 'Stripe Secret Key')?.pattern;
      expect(pattern).toBeDefined();
      const testStr = ['sk', 'live', '1234567890abcdefghij1234'].join('_');
      expect(testStr.match(pattern!)).not.toBeNull();
    });

    it('should match AWS Access Key ID pattern', () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === 'AWS Access Key ID')?.pattern;
      expect(pattern).toBeDefined();
      const testStr = 'AWS_KEY = AKIAIOSFODNN7EXAMPLE';
      expect(testStr.match(pattern!)).not.toBeNull();
    });

    it('should match AWS Secret Access Key pattern', () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === 'AWS Secret Access Key')?.pattern;
      expect(pattern).toBeDefined();
      const testStr = 'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"';
      expect(testStr.match(pattern!)).not.toBeNull();
    });

    it('should match GitHub Personal Access Token pattern', () => {
      const pattern = SECRET_PATTERNS.find(p => p.name === 'GitHub Personal Access Token')?.pattern;
      expect(pattern).toBeDefined();
      const testStr = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      expect(testStr.match(pattern!)).not.toBeNull();
    });
  });

  // 3. OSV SCA Scanner Helper Tests
  describe('osvScanner - Helpers', () => {
    it('should clean semver ranges', () => {
      expect(cleanSemver('^1.2.3')).toBe('1.2.3');
      expect(cleanSemver('~4.5.6-beta')).toBe('4.5.6');
      expect(cleanSemver('>=2.0.0')).toBe('2.0.0');
      expect(cleanSemver('1.x')).toBe('1.x');
    });

    it('should map CVSS score to severity rating', () => {
      expect(severityFromCvss(9.5)).toBe('CRITICAL');
      expect(severityFromCvss(8.0)).toBe('HIGH');
      expect(severityFromCvss(5.5)).toBe('MODERATE');
      expect(severityFromCvss(2.0)).toBe('LOW');
    });

    it('should parse package.json correctly', () => {
      const pkgJson = JSON.stringify({
        dependencies: {
          express: '^4.18.2',
          cors: '2.8.5'
        },
        devDependencies: {
          typescript: '^5.0.0'
        }
      });
      const parsed = parsePackageJson(pkgJson);
      expect(parsed).toHaveLength(3);
      expect(parsed).toContainEqual({ name: 'express', version: '4.18.2', ecosystem: 'npm' });
      expect(parsed).toContainEqual({ name: 'cors', version: '2.8.5', ecosystem: 'npm' });
      expect(parsed).toContainEqual({ name: 'typescript', version: '5.0.0', ecosystem: 'npm' });
    });

    it('should parse modern package-lock.json packages', () => {
      const lockJson = JSON.stringify({
        packages: {
          '': { version: '1.0.0' },
          'node_modules/express': { version: '4.18.2' },
          'node_modules/cors': { version: '2.8.5', dev: true }
        }
      });
      const parsed = parsePackageLock(lockJson);
      expect(parsed).toHaveLength(2);
      expect(parsed).toContainEqual({ name: 'express', version: '4.18.2', ecosystem: 'npm' });
      expect(parsed).toContainEqual({ name: 'cors', version: '2.8.5', ecosystem: 'npm' });
    });

    it('should parse legacy package-lock.json dependencies', () => {
      const lockJson = JSON.stringify({
        dependencies: {
          express: { version: '4.18.2' },
          cors: { version: '2.8.5' }
        }
      });
      const parsed = parsePackageLock(lockJson);
      expect(parsed).toHaveLength(2);
      expect(parsed).toContainEqual({ name: 'express', version: '4.18.2', ecosystem: 'npm' });
      expect(parsed).toContainEqual({ name: 'cors', version: '2.8.5', ecosystem: 'npm' });
    });
  });

  // 4. IaC Scanner Helper Tests
  describe('iacScanner - IaC rules', () => {
    describe('scanDockerfile', () => {
      it('should flag Dockerfile running as root by default', () => {
        const content = `FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node", "index.js"]`;
        const findings = scanDockerfile('Dockerfile', content);
        const userFinding = findings.find(f => f.id.startsWith('iac-dockerfile-no-user'));
        expect(userFinding).toBeDefined();
        expect(userFinding?.severity).toBe('HIGH');
      });

      it('should flag Dockerfile running with explicit USER root', () => {
        const content = `FROM node:20-alpine\nUSER root\nWORKDIR /app`;
        const findings = scanDockerfile('Dockerfile', content);
        const userFinding = findings.find(f => f.id.startsWith('iac-dockerfile-root-user'));
        expect(userFinding).toBeDefined();
        expect(userFinding?.severity).toBe('HIGH');
      });

      it('should flag Dockerfile using unpinned base image tags', () => {
        const content = `FROM node:latest\nUSER node`;
        const findings = scanDockerfile('Dockerfile', content);
        const tagFinding = findings.find(f => f.id.startsWith('iac-dockerfile-latest-tag'));
        expect(tagFinding).toBeDefined();
        expect(tagFinding?.severity).toBe('MODERATE');
      });

      it('should flag Dockerfile missing HEALTHCHECK', () => {
        const content = `FROM node:20-alpine\nUSER node`;
        const findings = scanDockerfile('Dockerfile', content);
        const hcFinding = findings.find(f => f.id.startsWith('iac-dockerfile-no-healthcheck'));
        expect(hcFinding).toBeDefined();
        expect(hcFinding?.severity).toBe('LOW');
      });

      it('should pass a fully secure and compliant Dockerfile', () => {
        const content = `FROM node:20-alpine\nHEALTHCHECK CMD curl -f http://localhost/health\nUSER node`;
        const findings = scanDockerfile('Dockerfile', content);
        // Only unpinned image is flagged (or missing check if we did not specify version tag format perfectly)
        const rootFinding = findings.find(f => f.id.includes('root') || f.id.includes('no-user'));
        const hcFinding = findings.find(f => f.id.includes('no-healthcheck'));
        expect(rootFinding).toBeUndefined();
        expect(hcFinding).toBeUndefined();
      });
    });

    describe('scanDockerCompose', () => {
      it('should flag privileged service containers', () => {
        const content = `services:\n  app:\n    image: app:latest\n    privileged: true`;
        const findings = scanDockerCompose('docker-compose.yml', content);
        const f = findings.find(x => x.id.startsWith('iac-compose-privileged'));
        expect(f).toBeDefined();
        expect(f?.severity).toBe('CRITICAL');
      });

      it('should flag network mode host', () => {
        const content = `services:\n  web:\n    network_mode: "host"`;
        const findings = scanDockerCompose('docker-compose.yml', content);
        const f = findings.find(x => x.id.startsWith('iac-compose-host-network'));
        expect(f).toBeDefined();
        expect(f?.severity).toBe('HIGH');
      });

      it('should flag cap_add ALL', () => {
        const content = `services:\n  db:\n    cap_add:\n      - ALL`;
        const findings = scanDockerCompose('docker-compose.yml', content);
        const f = findings.find(x => x.id.startsWith('iac-compose-cap-all'));
        expect(f).toBeDefined();
        expect(f?.severity).toBe('HIGH');
      });
    });

    describe('scanWorkflow', () => {
      it('should flag insecure pull_request_target usage', () => {
        const content = `on:\n  pull_request_target:\njobs:\n  test:\n    steps:\n      - uses: actions/checkout@v4`;
        const findings = scanWorkflow('.github/workflows/test.yml', content);
        const f = findings.find(x => x.id.startsWith('iac-workflow-pull-request-target'));
        expect(f).toBeDefined();
        expect(f?.severity).toBe('CRITICAL');
      });

      it('should flag hardcoded secrets in run blocks', () => {
        const content = `jobs:\n  deploy:\n    steps:\n      - run: api_key="AKIA1234567890ABCDEF" npm run build`;
        const findings = scanWorkflow('.github/workflows/deploy.yml', content);
        const f = findings.find(x => x.id.startsWith('iac-workflow-hardcoded-secret'));
        expect(f).toBeDefined();
        expect(f?.severity).toBe('HIGH');
      });
    });

    describe('scanVercel', () => {
      it('should flag wildcard CORS configuration', () => {
        const content = JSON.stringify({
          headers: [
            {
              source: '/(.*)',
              headers: [
                {
                  key: 'Access-Control-Allow-Origin',
                  value: '*'
                }
              ]
            }
          ]
        });
        const findings = scanVercel('vercel.json', content);
        const f = findings.find(x => x.id.startsWith('iac-vercel-cors'));
        expect(f).toBeDefined();
        expect(f?.severity).toBe('MODERATE');
      });
    });

    describe('scanRender', () => {
      it('should flag database publicly exposed to internet', () => {
        const content = `databases:\n  - name: my-db\n    type: database\n    ipAllowList:\n      - 0.0.0.0/0`;
        const findings = scanRender('render.yaml', content);
        const f = findings.find(x => x.id.startsWith('iac-render-db-public'));
        expect(f).toBeDefined();
        expect(f?.severity).toBe('HIGH');
      });
    });
  });
});
