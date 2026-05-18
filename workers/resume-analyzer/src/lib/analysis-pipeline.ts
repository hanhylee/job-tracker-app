import type { CloudflareBindings } from '../types';
import { normalizeText, sha256Hex } from './hash';
import { extractPdfText } from './pdf-text';
import { extractJobRequirements } from './jd-extract';
import { scoreAllCategories, synthesizeOverallScore } from './score';
import { synthesizeAnalysis } from './synthesize';
import { checkResumeFormatting } from './format-check';
import type { AnalysisResult } from './analysis-types';

export async function runAnalysisPipeline(
  env: CloudflareBindings,
  jobDescription: string,
  pdfBytes: ArrayBuffer,
): Promise<AnalysisResult> {
  const resumeText = normalizeText(await extractPdfText(pdfBytes));
  const jdText = normalizeText(jobDescription);
  const [resumeTextHash, jobDescriptionHash] = await Promise.all([
    sha256Hex(resumeText),
    sha256Hex(jdText),
  ]);

  const jd = await extractJobRequirements(env, jdText);
  const categoryScores = await scoreAllCategories(env, jd, resumeText);
  const { overallScore, scoreBreakdown } = synthesizeOverallScore(categoryScores);
  const format = checkResumeFormatting(resumeText);

  return synthesizeAnalysis(env, {
    jobDescription: jdText,
    resumeText,
    resumeTextHash,
    jobDescriptionHash,
    jd,
    categoryScores,
    overallScore,
    scoreBreakdown,
    format,
  });
}

/** Run scoring without PDF/coaching LLM — for tests */
export async function runAnalysisFromText(
  env: Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>,
  params: {
    jobDescription: string;
    resumeText: string;
    jd: import('./analysis-types').JdRequirements;
    skipCoaching?: boolean;
  },
): Promise<AnalysisResult> {
  const jdText = normalizeText(params.jobDescription);
  const resumeText = normalizeText(params.resumeText);
  const [resumeTextHash, jobDescriptionHash] = await Promise.all([
    sha256Hex(resumeText),
    sha256Hex(jdText),
  ]);

  const categoryScores = await scoreAllCategories(env, params.jd, resumeText);
  const { overallScore, scoreBreakdown } = synthesizeOverallScore(categoryScores);
  const format = checkResumeFormatting(resumeText);

  if (params.skipCoaching) {
    const { buildAnalysisResult } = await import('./score');
    return buildAnalysisResult({
      categories: categoryScores,
      coaching: {
        categories: {
          skills: {
            summary: '',
            matched: [],
            missing: [],
          },
          experience: {
            summary: '',
            matched: [],
            missing: [],
          },
          titleAlignment: {
            summary: '',
            matched: [],
            missing: [],
          },
        },
        actions: [],
      },
      format,
      overallScore,
      scoreBreakdown,
      model: 'test',
      resumeTextHash,
      jobDescriptionHash,
    });
  }

  return synthesizeAnalysis(env, {
    jobDescription: jdText,
    resumeText,
    resumeTextHash,
    jobDescriptionHash,
    jd: params.jd,
    categoryScores,
    overallScore,
    scoreBreakdown,
    format,
  });
}
