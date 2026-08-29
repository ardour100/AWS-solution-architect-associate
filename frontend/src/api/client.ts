import type { ApiErrorBody } from './types';

const TOKEN_KEY = 'auth.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: Array<{ path: string; message: string }>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.details = body.details;
  }
}

/** Human-readable message for any thrown error (ApiError, TypeError, ...). */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.details?.find((d) => d.message)?.message ?? error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

/**
 * Thin fetch wrapper: JSON in/out, Bearer token injection, typed errors.
 * All paths are relative to /api (proxied by Vite in dev, nginx in prod).
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!response.ok) {
    // A rejected token (expired/revoked) is no longer usable — drop it so
    // the auth guard redirects to the login page. Anonymous endpoints that
    // legitimately 401 (e.g. wrong credentials) have no token to drop.
    if (response.status === 401 && token) {
      setToken(null);
    }
    throw new ApiError(response.status, (data as ApiErrorBody) ?? {});
  }
  return data as T;
}
