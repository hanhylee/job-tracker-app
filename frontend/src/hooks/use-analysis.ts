import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getLatestAnalysis,
  pollUntilAnalysisSettled,
  startAnalysis,
} from '../api/analysis';
import { updateApplication } from '../api/applications';
import { uploadResume } from '../api/resume';
import { applicationsKeys } from './use-applications';
import type { AnalysisRecord } from '../types/analysis';
import type { Application } from '../types/application';

export const analysisKeys = {
  latest: (applicationId: string) => ['analysis', 'latest', applicationId] as const,
};

export function useLatestAnalysis(applicationId: string | undefined) {
  return useQuery({
    queryKey: analysisKeys.latest(applicationId ?? ''),
    queryFn: () => getLatestAnalysis(applicationId!),
    enabled: Boolean(applicationId),
    staleTime: 60_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending' || status === 'running') return 2_000;
      return false;
    },
  });
}

export function useApplicationsAnalysisMap(applicationIds: string[]) {
  const queries = useQueries({
    queries: applicationIds.map((id) => ({
      queryKey: analysisKeys.latest(id),
      queryFn: async () => {
        try {
          return await getLatestAnalysis(id);
        } catch {
          return null;
        }
      },
      staleTime: 60_000,
      retry: false,
    })),
  });

  const map = new Map<string, AnalysisRecord | null>();
  applicationIds.forEach((id, index) => {
    map.set(id, queries[index]?.data ?? null);
  });

  const isLoading = queries.some((q) => q.isLoading);
  const refetchAll = () => {
    queries.forEach((q) => void q.refetch());
  };

  return { map, isLoading, refetchAll };
}

export type RunAnalysisInput = {
  applicationId: string;
  jobDescription: string;
  resumeFile?: File | null;
  hasResume: boolean;
};

export async function runAnalysisPipeline(
  input: RunAnalysisInput,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<AnalysisRecord> {
  const { applicationId, jobDescription, resumeFile, hasResume } = input;

  await updateApplication(applicationId, { jobDescription });

  if (!hasResume && resumeFile) {
    await uploadResume(applicationId, resumeFile);
  } else if (!hasResume && !resumeFile) {
    throw new Error('Resume is required');
  } else if (resumeFile) {
    await uploadResume(applicationId, resumeFile);
  }

  const start = await startAnalysis(applicationId);

  let final: AnalysisRecord;
  if (start.status === 'complete') {
    final = start;
  } else {
    final = await pollUntilAnalysisSettled(applicationId);
  }

  await queryClient.invalidateQueries({ queryKey: applicationsKeys.all });
  await queryClient.invalidateQueries({
    queryKey: applicationsKeys.detail(applicationId),
  });
  await queryClient.invalidateQueries({
    queryKey: analysisKeys.latest(applicationId),
  });

  return final;
}

export function getRowAnalysisState(record: AnalysisRecord | null | undefined) {
  if (!record) {
    return { showScore: false, showAnalyze: true, overallScore: null as number | null };
  }
  if (record.status === 'complete' && record.overallScore != null) {
    return {
      showScore: true,
      showAnalyze: false,
      overallScore: record.overallScore,
    };
  }
  return { showScore: false, showAnalyze: true, overallScore: null as number | null };
}

export type AnalysisRowContext = {
  application: Application;
  analysis: AnalysisRecord | null;
};
