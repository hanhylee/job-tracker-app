import { apiFetch } from './client';

export type MeResponse = {
  success: true;
  user: {
    id: string;
    email: string;
    name: string;
    isPro: boolean;
  };
};

export async function getMe(): Promise<MeResponse['user']> {
  const data = await apiFetch<MeResponse>('/api/me');
  return data.user;
}
