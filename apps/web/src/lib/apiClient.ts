import axios from 'axios';
import { getAuth } from "firebase/auth";

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    skipAuthErrorLog?: boolean;
  }
  interface AxiosRequestConfig {
    skipAuthErrorLog?: boolean;
  }
}

/**
 * Custom Axios instance for ServX API with automatic Firebase Auth injection
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

// Request Interceptor: Attach Firebase ID Token
apiClient.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Failed to get Firebase ID token:', error);
      }
    } else {
      console.warn('[apiClient] No user detected, sending unauthenticated request to:', config.url);
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
