import { describe, expect, it } from 'vitest';

import { buildApiBaseUrl } from './apiClient';

describe('buildApiBaseUrl', () => {
  it('falls back to /api for empty input', () => {
    expect(buildApiBaseUrl('')).toBe('/api');
    expect(buildApiBaseUrl('   ')).toBe('/api');
  });

  it('appends /api when base URL does not include it', () => {
    expect(buildApiBaseUrl('http://localhost:5000')).toBe('http://localhost:5000/api');
    expect(buildApiBaseUrl('http://localhost:5000/')).toBe('http://localhost:5000/api');
  });

  it('does not duplicate /api when already present', () => {
    expect(buildApiBaseUrl('http://localhost:5000/api')).toBe('http://localhost:5000/api');
    expect(buildApiBaseUrl('http://localhost:5000/api/')).toBe('http://localhost:5000/api');
  });
});
