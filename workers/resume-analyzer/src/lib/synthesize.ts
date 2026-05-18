import type { CloudflareBindings } from '../types';
import { getLlmModel, runJsonCompletion } from './ai';
import {
  analysisResultSchema,
  type AnalysisResult,
  type JdExtract,
  type ResumeExtract,
} from './analysis-types';
import type { MatchContext } from './analysis-types';
import { scoreFromMatches } from './match';

export async function synthesizeAnalysis(
  env: Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>,
  params: {
    jobDescription: string;
    resumeText: string;
    resumeTextHash: string;
    jobDescriptionHash: string;
    jd: JdExtract;
    resume: ResumeExtract;
    matchContext: MatchContext;
  },
): Promise<AnalysisResult> {
  const skillsScore = scoreFromMatches(params.matchContext.keywordMatches.required);
  const preferredScore = scoreFromMatches(
    params.matchContext.keywordMatches.preferred,
    0.8,
  );

  const base = await runJsonCompletion(
    env,
    [
      {
        role: 'system',
        content: `You are an ATS resume coach. Produce honest scores (0-100) and up to 8 prioritized, actionable fixes.
Do not encourage keyword stuffing. Use the provided match data.
Skills baseline score: ${skillsScore}. Preferred keywords baseline: ${preferredScore}.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          jd: params.jd,
          resume: params.resume,
          keywordMatches: params.matchContext.keywordMatches,
          semanticMatches: params.matchContext.semanticMatches,
          resumeExcerpt: params.resumeText.slice(0, 4000),
          jobDescriptionExcerpt: params.jobDescription.slice(0, 4000),
        }),
      },
    ],
    analysisResultSchema,
    'analysis_result',
  );

  return {
    ...base,
    meta: {
      model: getLlmModel(env),
      analyzedAt: new Date().toISOString(),
      resumeTextHash: params.resumeTextHash,
      jobDescriptionHash: params.jobDescriptionHash,
    },
  };
}
