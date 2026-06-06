import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseGithubUrl, scanStream } from './scanStream';
import type { Request, Response } from 'express';

// Mock the scanner services so they don't hit external networks or GitHub APIs
vi.mock('../../services/scanners/githubSastScanner', () => ({
  scanGithubSast: vi.fn().mockImplementation(async (owner, repo, token, emit) => {
    emit('scanner:start', { scanner: 'sast' });
    emit('finding', {
      id: 'sast-1',
      scanner: 'sast',
      title: 'SQL Injection',
      severity: 'HIGH',
      description: 'Found SQL Injection vulnerability',
      timestamp: new Date().toISOString()
    });
    emit('scanner:done', { scanner: 'sast', findingsCount: 1 });
    return [];
  })
}));

vi.mock('../../services/scanners/githubSecretScanner', () => ({
  scanGithubSecrets: vi.fn().mockImplementation(async (owner, repo, token, emit) => {
    emit('scanner:start', { scanner: 'secret' });
    emit('scanner:done', { scanner: 'secret', findingsCount: 0 });
    return [];
  })
}));

vi.mock('../../services/scanners/osvScanner', () => ({
  scanOsvSca: vi.fn().mockImplementation(async (owner, repo, token, emit) => {
    emit('scanner:start', { scanner: 'sca' });
    emit('scanner:done', { scanner: 'sca', findingsCount: 0 });
    return [];
  })
}));

vi.mock('../../services/scanners/iacScanner', () => ({
  scanIac: vi.fn().mockImplementation(async (owner, repo, token, emit) => {
    emit('scanner:start', { scanner: 'iac' });
    emit('scanner:done', { scanner: 'iac', findingsCount: 0 });
    return [];
  })
}));

// Mock the GitHub token resolver service
vi.mock('../github/service', () => ({
  getGithubToken: vi.fn().mockResolvedValue({ accessToken: 'mock-github-token' })
}));

describe('ScanStream Orchestrator Tests', () => {

  describe('parseGithubUrl', () => {
    it('should parse full github.com URLs', () => {
      const parsed1 = parseGithubUrl('https://github.com/owner/my-repo');
      expect(parsed1).toEqual({ owner: 'owner', repo: 'my-repo' });

      const parsed2 = parseGithubUrl('https://github.com/owner/my-repo.git');
      expect(parsed2).toEqual({ owner: 'owner', repo: 'my-repo' });
    });

    it('should parse owner/repo string shorthand formats', () => {
      const parsed = parseGithubUrl('owner/my-repo');
      expect(parsed).toEqual({ owner: 'owner', repo: 'my-repo' });
    });

    it('should return null for invalid URLs or formats', () => {
      expect(parseGithubUrl('not-a-repo')).toBeNull();
      expect(parseGithubUrl('https://other-site.com/owner/repo')).toBeNull();
      expect(parseGithubUrl('')).toBeNull();
    });
  });

  describe('scanStream Handler', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let writtenChunks: string[] = [];
    let responseEnded = false;
    let headers: Record<string, string> = {};

    beforeEach(() => {
      writtenChunks = [];
      responseEnded = false;
      headers = {};

      mockReq = {
        user: { id: 'user-123' },
        body: {
          target: 'owner/my-repo',
          type: 'repo',
          scanRepo: true,
          scanDast: false
        }
      };

      mockRes = {
        setHeader: vi.fn().mockImplementation((name, val) => {
          headers[name] = val;
          return mockRes;
        }),
        flushHeaders: vi.fn(),
        write: vi.fn().mockImplementation((chunk) => {
          writtenChunks.push(chunk.toString());
          return true;
        }),
        end: vi.fn().mockImplementation(() => {
          responseEnded = true;
          return mockRes;
        }),
        status: vi.fn().mockImplementation((code) => {
          return mockRes as Response;
        }),
        json: vi.fn().mockImplementation((data) => {
          writtenChunks.push(JSON.stringify(data));
          responseEnded = true;
          return mockRes;
        })
      };
    });

    it('should fail with 401 if user is not authenticated', async () => {
      mockReq.user = undefined;
      await scanStream(mockReq as Request, mockRes as Response, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(responseEnded).toBe(true);
    });

    it('should fail with 400 if target is missing', async () => {
      mockReq.body.target = undefined;
      await scanStream(mockReq as Request, mockRes as Response, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(responseEnded).toBe(true);
    });

    it('should set SSE headers and stream events correctly', async () => {
      await scanStream(mockReq as Request, mockRes as Response, vi.fn());

      expect(headers['Content-Type']).toBe('text/event-stream');
      expect(headers['Cache-Control']).toBe('no-cache');
      expect(headers['Connection']).toBe('keep-alive');

      expect(mockRes.flushHeaders).toHaveBeenCalled();

      // Check the output contains the scanner starting/done events and the finding
      const output = writtenChunks.join('');
      expect(output).toContain('event: scanner:start');
      expect(output).toContain('data: {"scanner":"sast"}');
      expect(output).toContain('event: finding');
      expect(output).toContain('"title":"SQL Injection"');
      expect(output).toContain('event: scanner:done');
      expect(output).toContain('"findingsCount":1');
      expect(output).toContain('event: scan:complete');
      expect(responseEnded).toBe(true);
    });
  });
});
