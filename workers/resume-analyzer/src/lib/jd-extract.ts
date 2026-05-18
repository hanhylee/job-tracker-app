import type { CloudflareBindings } from '../types';
import { runJsonCompletion } from './ai';
import { jdRequirementsSchema, type JdRequirements } from './analysis-types';

export async function extractJobRequirements(
  env: Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>,
  jobDescription: string,
): Promise<JdRequirements> {
  return runJsonCompletion(
    env,
    [
      {
        role: 'system',
        content: `Extract hiring requirements the way ATS software and recruiters scan postings.

Use the job description's EXACT wording for phrases (what candidates should mirror on their resume):
- skills.requiredPhrases: must-have tools, technologies, certifications (max 25)
- skills.preferredPhrases: nice-to-have skills (max 25)
- experience.minYears: minimum years if stated, else null
- experience.seniority: junior, mid, senior, staff, or lead if stated, else null
- experience.requiredPhrases: domain, responsibilities, and outcomes as written in the JD (max 25)
- title.targetPhrases: job title strings exactly as written (max 15)

Do not paraphrase ("React.js" stays "React.js", not "frontend framework").
Return JSON only.`,
      },
      {
        role: 'user',
        content: jobDescription.slice(0, 12000),
      },
    ],
    jdRequirementsSchema,
    'jd_requirements',
  );
}
