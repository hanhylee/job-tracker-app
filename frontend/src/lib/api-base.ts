/** API base URL. Empty string uses same-origin (Vite dev proxy to :8787). */
export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  if (url) return url.replace(/\/$/, '');
  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path}`;
}
