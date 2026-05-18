import { apiUrl } from '../lib/api-base';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function extractErrorMessage(data: unknown, statusText: string): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    return String((data as { error: string }).error);
  }
  return statusText || 'Request failed';
}

export async function apiRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, extractErrorMessage(data, res.statusText));
  }

  return res;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(data, res.statusText));
  }

  return data as T;
}
