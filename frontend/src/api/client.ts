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

async function parseErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data === 'object' && data && 'error' in data) {
    return String((data as { error: string }).error);
  }
  return res.statusText;
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
    throw new ApiError(res.status, await parseErrorMessage(res));
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
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  return data as T;
}
