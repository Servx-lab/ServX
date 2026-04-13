import { useState, useCallback } from 'react';

export interface CachedData {
  connections: any[];
  githubRepos: any[];
  vercelStatus: any;
  renderStatus: any;
  lastUpdated: string;
}

const CACHE_KEY = 'servx_cached_data';

export function useLocalCache() {
  const [data, setData] = useState<CachedData | null>(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  });

  const updateCache = useCallback((newData: Partial<CachedData>) => {
    setData((prev) => {
      const updated = {
        ...(prev || {
          connections: [],
          githubRepos: [],
          vercelStatus: null,
          renderStatus: null,
          lastUpdated: '',
        }),
        ...newData,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setData(null);
  }, []);

  return { data, updateCache, clearCache };
}
