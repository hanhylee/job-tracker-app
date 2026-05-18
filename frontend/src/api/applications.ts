import type {
  Application,
  ApplicationInput,
  ApplicationUpdate,
} from '../types/application';
import { apiFetch } from './client';

type ListResponse = {
  success: true;
  applications: Application[];
  userId: string;
};

type OneResponse = { success: true; application: Application };

type DeleteResponse = { success: true; deleted: string };

export async function listApplications(): Promise<Application[]> {
  const data = await apiFetch<ListResponse>('/api/applications');
  return data.applications ?? [];
}

export async function getApplication(id: string): Promise<Application> {
  const data = await apiFetch<OneResponse>(`/api/applications/${id}`);
  return data.application;
}

export async function createApplication(
  input: ApplicationInput,
): Promise<Application> {
  const data = await apiFetch<OneResponse>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.application;
}

export async function updateApplication(
  id: string,
  input: ApplicationUpdate,
): Promise<Application> {
  const data = await apiFetch<OneResponse>(`/api/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.application;
}

export async function deleteApplication(id: string): Promise<void> {
  await apiFetch<DeleteResponse>(`/api/applications/${id}`, {
    method: 'DELETE',
  });
}
