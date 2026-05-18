import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/me';
import { authClient } from '../lib/auth-client';

export const meKeys = {
  all: ['me'] as const,
};

export function useMe() {
  const { data: session } = authClient.useSession();

  return useQuery({
    queryKey: meKeys.all,
    queryFn: getMe,
    enabled: Boolean(session),
    staleTime: 30_000,
    retry: false,
  });
}
