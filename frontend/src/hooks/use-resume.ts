import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteResume, uploadResume } from '../api/resume';
import { applicationsKeys } from './use-applications';

export function useUploadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadResume(id, file),
    onSuccess: (application) => {
      queryClient.setQueryData(
        applicationsKeys.detail(application.id),
        application,
      );
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteResume(id),
    onSuccess: (application) => {
      queryClient.setQueryData(
        applicationsKeys.detail(application.id),
        application,
      );
      queryClient.invalidateQueries({ queryKey: applicationsKeys.all });
    },
  });
}
