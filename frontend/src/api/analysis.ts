import { apiUrl } from '../lib/api-base';
import { ApiError, apiFetch } from './client';
import type { AnalysisRecord, StartAnalysisResponse } from '../types/analysis';

export const PRO_REQUIRED_CODE = 'PRO_REQUIRED';

async function parseJsonBody(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

export async function getLatestAnalysis(
  applicationId: string,
): Promise<AnalysisRecord | null> {
  const res = await fetch(apiUrl(`/api/applications/${applicationId}/analysis`), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (
    res.status === 404 ||
    res.status === 403 ||
    res.status === 503 ||
    res.status === 500
  ) {
    return null;
  }

  const data = await parseJsonBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(data));
  }

  return data as AnalysisRecord;
}

export async function getAnalysisById(
  analysisId: string,
): Promise<AnalysisRecord> {
  return apiFetch<AnalysisRecord>(
    `/api/applications/analyses/${analysisId}`,
  );
}

export async function startAnalysis(
  applicationId: string,
  force = false,
): Promise<StartAnalysisResponse> {
  const path = force
    ? `/api/applications/${applicationId}/analyze?force=true`
    : `/api/applications/${applicationId}/analyze`;

  const res = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await parseJsonBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(data));
  }

  const body = data as StartAnalysisResponse;
  if (!body.analysisId && body.status) {
    return { ...body, analysisId: (body as { analysisId?: string }).analysisId ?? '' };
  }
  return body;
}

export async function pollUntilAnalysisSettled(
  applicationId: string,
  opts: { maxMs?: number; intervalMs?: number } = {},
): Promise<AnalysisRecord> {
  const maxMs = opts.maxMs ?? 180_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    const record = await getLatestAnalysis(applicationId);
    if (!record) {
      await sleep(intervalMs);
      continue;
    }
    if (record.status === 'complete' || record.status === 'failed') {
      return record;
    }
    await sleep(intervalMs);
  }

  throw new Error('Analysis timed out. Try again in a moment.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(data: unknown): string {
  if (typeof data === 'object' && data && 'error' in data) {
    return String((data as { error: string }).error);
  }
  return 'Request failed';
}

export function isProRequiredError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 403) return false;
  return err.message.includes('Pro') || err.message.includes(PRO_REQUIRED_CODE);
}
