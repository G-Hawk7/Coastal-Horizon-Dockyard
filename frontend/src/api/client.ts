import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthTokenResponse } from '../types';

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<AuthTokenResponse> | null = null;
let onAuthFailure: ((reason?: string) => void) | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function setAuthFailureHandler(handler: ((reason?: string) => void) | null): void {
  onAuthFailure = handler;
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; message?: string } | undefined;
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
    if (error.message) {
      return error.message;
    }
  } else if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

/**
 * Deduplicated silent token refresh using the httpOnly refresh cookie.
 * Multiple parallel callers share the exact same in-flight request.
 */
export async function refreshSessionRequest(): Promise<AuthTokenResponse> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<AuthTokenResponse>(
        '/api/v1/auth/refresh',
        {},
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        }
      )
      .then((res) => {
        setAccessToken(res.data.access_token);
        return res.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Attach in-memory JWT access token to every outgoing API request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const AUTH_SKIP_REFRESH_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/refresh',
  '/auth/logout',
];

// Automatically refresh once on 401 and replay the original request
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';

    // If the user was banned, force immediate logout
    if (
      status === 403 &&
      typeof error.response?.data?.detail === 'string' &&
      error.response.data.detail.toLowerCase().includes('banned')
    ) {
      setAccessToken(null);
      onAuthFailure?.(error.response.data.detail);
      return Promise.reject(error);
    }

    const shouldSkipRefresh = AUTH_SKIP_REFRESH_PATHS.some((path) => url.includes(path));

    if (status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;
      try {
        const refreshed = await refreshSessionRequest();
        originalRequest.headers.Authorization = `Bearer ${refreshed.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        onAuthFailure?.('Your session has expired. Please sign in again.');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;