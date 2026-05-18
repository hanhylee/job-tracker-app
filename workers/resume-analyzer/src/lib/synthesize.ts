import type { CloudflareBindings } from '../types';
import { getLlmModel, runJsonCompletion } from './ai';
import {
  coachingOutputSchema,
  type CoachingOutput,
  type JdRequirements,
  type AllCategoryScores,
} from './analysis-types';

export async function synthesizeCoaching(
  env: Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>,
  params: {
    jobDescription: string;
    resumeText: string;
    jd: JdRequirements;
    categoryScores: AllCategoryScores;
    overallScore: number;
  },
): Promise<CoachingOutput> {
  return runJsonCompletion(
    env,
    [
      {
        role: 'system',
        content: `You are an ATS resume coach for internship and early-career applicants, aligned with 2026 screening (semantic/LLM matching, not keyword stuffing).

Priorities (reflect in summaries and actions):
1. Skills in context — listings in Skills or Education count as present; still recommend mirroring JD terms in project/internship bullets when possible.
2. Experience & impact — learning-oriented framing, coursework/projects/internships; quantify outcomes (%, users, time saved).
3. Parse-friendly layout — standard headings, single column; avoid tables, graphics, and hidden keyword blocks.
4. Role keywords — light touch only; do not push exact job-title rewrites for students/interns.

Do NOT assign numeric scores — scores are already computed.
Overall job-fit score: ${params.overallScore}.
Category scores — skills (semantic keyword match): ${params.categoryScores.skills.score}, experience & impact: ${params.categoryScores.experience.score}, role keywords: ${params.categoryScores.titleAlignment.score}.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          jdRequirements: params.jd,
          categoryScores: {
            skills: {
              score: params.categoryScores.skills.score,
              matched: params.categoryScores.skills.matched,
              missing: params.categoryScores.skills.missing,
            },
            experience: {
              score: params.categoryScores.experience.score,
              matched: params.categoryScores.experience.matched,
              missing: params.categoryScores.experience.missing,
            },
            titleAlignment: {
              score: params.categoryScores.titleAlignment.score,
              matched: params.categoryScores.titleAlignment.matched,
              missing: params.categoryScores.titleAlignment.missing,
            },
          },
          keywords: params.categoryScores.keywords,
          measurableImpact: params.categoryScores.measurableImpact,
          resumeText: params.resumeText.slice(0, 8000),
          jobDescriptionExcerpt: params.jobDescription.slice(0, 4000),
        }),
      },
    ],
    coachingOutputSchema,
    'coaching_output',
  );
}

export async function synthesizeAnalysis(
  env: Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>,
  params: {
    jobDescription: string;
    resumeText: string;
    resumeTextHash: string;
    jobDescriptionHash: string;
    jd: JdRequirements;
    categoryScores: AllCategoryScores;
    overallScore: number;
    scoreBreakdown: import('./analysis-types').ScoreBreakdown;
    format: import('./format-check').FormatCheckResult;
  },
): Promise<import('./analysis-types').AnalysisResult> {
  const coaching = await synthesizeCoaching(env, {
    jobDescription: params.jobDescription,
    resumeText: params.resumeText,
    jd: params.jd,
    categoryScores: params.categoryScores,
    overallScore: params.overallScore,
  });

  const { buildAnalysisResult } = await import('./score');
  return buildAnalysisResult({
    categories: params.categoryScores,
    coaching,
    format: params.format,
    overallScore: params.overallScore,
    scoreBreakdown: params.scoreBreakdown,
    model: getLlmModel(env),
    resumeTextHash: params.resumeTextHash,
    jobDescriptionHash: params.jobDescriptionHash,
  });
}
