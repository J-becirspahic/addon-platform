import type { ApiError } from '@addon-platform/shared';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export function useApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl;

  async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      credentials: 'include',
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);

    if (!response.ok) {
      const error = await response.json() as ApiError;
      throw new ApiRequestError(error.message, error.error, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    get: <T>(endpoint: string) => apiFetch<T>(endpoint),
    post: <T>(endpoint: string, body?: unknown) => apiFetch<T>(endpoint, { method: 'POST', body }),
    put: <T>(endpoint: string, body?: unknown) => apiFetch<T>(endpoint, { method: 'PUT', body }),
    patch: <T>(endpoint: string, body?: unknown) => apiFetch<T>(endpoint, { method: 'PATCH', body }),
    delete: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'DELETE' }),
  };
}

export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
