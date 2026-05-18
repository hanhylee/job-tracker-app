import type { CloudflareBindings } from '../types';
import { runJsonCompletion } from './ai';
import { resumeExtractSchema, type ResumeExtract } from './analysis-types';

export async function extractResume(
  env: Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>,
  resumeText: string,
): Promise<ResumeExtract> {
  return runJsonCompletion(
    env,
    [
      {
        role: 'system',
        content:
          'Extract structured resume data: skills, job titles, experience bullets with section labels, and education. Return JSON only.',
      },
      {
        role: 'user',
        content: resumeText.slice(0, 12000),
      },
    ],
    resumeExtractSchema,
    'resume_extract',
  );
}
