import type { CloudflareBindings, AnalysisQueueMessage } from '../types';
import { runAnalysisPipeline } from '../lib/analysis-pipeline';
import {
  loadApplicationForAnalysis,
  setAnalysisStatus,
} from '../lib/analysis-store';

export async function processAnalysisJob(
  env: CloudflareBindings,
  message: AnalysisQueueMessage,
): Promise<void> {
  const { analysisId, applicationId, userId } = message;

  await setAnalysisStatus(env, analysisId, 'running');

  try {
    const app = await loadApplicationForAnalysis(env, applicationId, userId);
    if (!app?.resumeUrl || !app.jobDescription?.trim()) {
      throw new Error('Application missing resume or job description');
    }

    const object = await env.RESUMES.get(app.resumeUrl);
    if (!object) {
      throw new Error('Resume file not found in storage');
    }

    const pdfBytes = await object.arrayBuffer();
    const result = await runAnalysisPipeline(
      env,
      app.jobDescription,
      pdfBytes,
    );

    await setAnalysisStatus(env, analysisId, 'complete', {
      overallScore: result.overallScore,
      resultJson: JSON.stringify(result),
    });
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : 'Analysis failed';
    console.error(`[analysis ${analysisId}]`, messageText);
    await setAnalysisStatus(env, analysisId, 'failed', {
      errorMessage: messageText,
    });
    throw err;
  }
}
