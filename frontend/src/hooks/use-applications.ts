import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  updateApplication,
} from '../api/applications';
import type { ApplicationInput, ApplicationUpdate } from '../types/application';

export const applicationsKeys = {
  all: ['applications'] as const,
  detail: (id: string) => ['applications', id] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: applicationsKeys.all,
    queryFn: listApplications,
    staleTime: 30_000,
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: applicationsKeys.detail(id ?? ''),
    queryFn: () => getApplication(id!),
    enabled: Boolean(id),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApplicationInput) => createApplication(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: applicationsKeys.all });
      const previous = queryClient.getQueryData(applicationsKeys.all);
      const optimistic = {
        id: `temp-${Date.now()}`,
        userId: '',
        company: input.company,
        title: input.title,
        status: input.status ?? 'applied',
        jobUrl: input.jobUrl ?? null,
        resumeUrl: null,
        notes: input.notes ?? null,
        appliedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData(
        applicationsKeys.all,
        (old: typeof optimistic[] | undefined) => [...(old ?? []), optimistic],
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(applicationsKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApplicationUpdate }) =>
      updateApplication(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: applicationsKeys.all });
      const previous = queryClient.getQueryData(applicationsKeys.all);
      queryClient.setQueryData(
        applicationsKeys.all,
        (old: { id: string }[] | undefined) =>
          old?.map((app) => (app.id === id ? { ...app, ...data } : app)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(applicationsKeys.all, context.previous);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all });
      queryClient.invalidateQueries({ queryKey: applicationsKeys.detail(id) });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: applicationsKeys.all });
      const previous = queryClient.getQueryData(applicationsKeys.all);
      queryClient.setQueryData(
        applicationsKeys.all,
        (old: { id: string }[] | undefined) => old?.filter((app) => app.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(applicationsKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all });
    },
  });
}
