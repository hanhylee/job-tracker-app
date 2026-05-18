import type { CloudflareBindings } from '../types';
import { normalizeText, sha256Hex } from './hash';
import { extractPdfText } from './pdf-text';
import { extractJobDescription } from './jd-extract';
import { extractResume } from './resume-extract';
import { buildMatchContext } from './match';
import { synthesizeAnalysis } from './synthesize';
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

  const jd = await extractJobDescription(env, jdText);
  const resume = await extractResume(env, resumeText);
  const keywordMatches = await buildMatchContext(env, jd, resume);
  const matchContext = { jd, resume, ...keywordMatches };

  return synthesizeAnalysis(env, {
    jobDescription: jdText,
    resumeText,
    resumeTextHash,
    jobDescriptionHash,
    jd,
    resume,
    matchContext,
  });
}
