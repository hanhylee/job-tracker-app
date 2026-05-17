import type { Application } from '../types/application';
import { apiRequest } from './client';

type ResumeResponse = { success: true; application: Application };

export async function uploadResume(
  id: string,
  file: File,
): Promise<Application> {
  const res = await apiRequest(`/api/applications/${id}/resume`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: await file.arrayBuffer(),
  });
  const data = (await res.json()) as ResumeResponse;
  return data.application;
}

export async function deleteResume(id: string): Promise<Application> {
  const res = await apiRequest(`/api/applications/${id}/resume`, {
    method: 'DELETE',
  });
  const data = (await res.json()) as ResumeResponse;
  return data.application;
}

export async function fetchResumeBlob(id: string): Promise<Blob> {
  const res = await apiRequest(`/api/applications/${id}/resume`);
  return res.blob();
}
