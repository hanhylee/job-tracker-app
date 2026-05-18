import type { CloudflareBindings } from '../types';
import { runJsonCompletion } from './ai';
import { jdExtractSchema, type JdExtract } from './analysis-types';

export async function extractJobDescription(
  env: Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>,
  jobDescription: string,
): Promise<JdExtract> {
  return runJsonCompletion(
    env,
    [
      {
        role: 'system',
        content:
          'Extract structured hiring requirements from a job description. Be exhaustive for required vs preferred skills. Return JSON only.',
      },
      {
        role: 'user',
        content: jobDescription.slice(0, 12000),
      },
    ],
    jdExtractSchema,
    'jd_extract',
  );
}
