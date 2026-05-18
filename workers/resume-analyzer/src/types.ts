export type CloudflareBindings = {
  AI: Ai;
  db: D1Database;
  RESUMES: R2Bucket;
  ANALYSIS_QUEUE: Queue<AnalysisQueueMessage>;
  ANALYSIS_LLM_MODEL: string;
};

export type AnalysisQueueMessage = {
  analysisId: string;
  applicationId: string;
  userId: string;
};
