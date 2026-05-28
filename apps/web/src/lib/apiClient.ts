import axios from 'axios';
import { supabase } from './supabase';
import { getDeviceUUID } from './deviceUtils';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    skipAuthErrorLog?: boolean;
  }
  interface AxiosRequestConfig {
    skipAuthErrorLog?: boolean;
  }
}

/**
 * Custom Axios instance for ServX API with automatic Supabase Auth injection
 */
const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

export function buildApiBaseUrl(inputUrl: string): string {
  const trimmedUrl = inputUrl.trim().replace(/\/+$/, '');

  if (!trimmedUrl) {
    return '/api';
  }

  if (/\/api$/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `${trimmedUrl}/api`;
}

const baseURL = buildApiBaseUrl(rawUrl);

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Supabase JWT & Device Fingerprint
apiClient.interceptors.request.use(
  async (config) => {
    // Attach Device Fingerprint in headers
    try {
      const fingerprint = await getDeviceUUID();
      if (fingerprint) {
        config.headers['x-device-uuid'] = fingerprint;
      }
    } catch (fingerprintError) {
      console.error('[apiClient] Failed to resolve device fingerprint:', fingerprintError);
    }

    let { data: { session } } = await supabase.auth.getSession();
    
    // Micro-retry: If no session, wait 50ms and try once more.
    // This catches the edge case where Supabase is just finishing _recoverAndRefresh.
    if (!session) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const retry = await supabase.auth.getSession();
      session = retry.data.session;
    }
    
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Axios] Token attached for: ${config.url}`);
        }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Axios] No session found for: ${config.url}. Proceeding unauthenticated.`);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthErrorLog) {
      console.error('Unauthorized API Call:', {
        url: error.config?.url,
        message: error.response?.data?.message || error.response?.data?.error || 'No message',
        data: error.response?.data
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
