import { and, desc, eq } from 'drizzle-orm';
import { applicationAnalyses, applications } from '../db/schema';
import { getDb } from '../db/client';
import type { CloudflareBindings } from '../types';
import type { AnalysisResult } from './analysis-types';

export async function loadApplicationForAnalysis(
  env: Pick<CloudflareBindings, 'db'>,
  applicationId: string,
  userId: string,
) {
  const db = getDb(env);
  const [row] = await db
    .select()
    .from(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.userId, userId)),
    )
    .limit(1);
  return row ?? null;
}

export async function findCachedAnalysis(
  env: Pick<CloudflareBindings, 'db'>,
  applicationId: string,
  userId: string,
  resumeHash: string,
  jdHash: string,
) {
  const db = getDb(env);
  const [row] = await db
    .select()
    .from(applicationAnalyses)
    .where(
      and(
        eq(applicationAnalyses.applicationId, applicationId),
        eq(applicationAnalyses.userId, userId),
        eq(applicationAnalyses.status, 'complete'),
        eq(applicationAnalyses.resumeHash, resumeHash),
        eq(applicationAnalyses.jdHash, jdHash),
      ),
    )
    .orderBy(desc(applicationAnalyses.createdAt))
    .limit(1);
  return row ?? null;
}

export async function createPendingAnalysis(
  env: Pick<CloudflareBindings, 'db'>,
  params: {
    applicationId: string;
    userId: string;
    resumeHash: string;
    jdHash: string;
  },
) {
  const db = getDb(env);
  const id = crypto.randomUUID();
  await db.insert(applicationAnalyses).values({
    id,
    applicationId: params.applicationId,
    userId: params.userId,
    status: 'pending',
    resumeHash: params.resumeHash,
    jdHash: params.jdHash,
    createdAt: new Date(),
  });
  return id;
}

export async function setAnalysisStatus(
  env: Pick<CloudflareBindings, 'db'>,
  analysisId: string,
  status: 'running' | 'complete' | 'failed',
  extra?: {
    overallScore?: number;
    resultJson?: string;
    errorMessage?: string;
  },
) {
  const db = getDb(env);
  await db
    .update(applicationAnalyses)
    .set({
      status,
      overallScore: extra?.overallScore,
      resultJson: extra?.resultJson,
      errorMessage: extra?.errorMessage,
      completedAt:
        status === 'complete' || status === 'failed' ? new Date() : undefined,
    })
    .where(eq(applicationAnalyses.id, analysisId));
}

export async function getAnalysisById(
  env: Pick<CloudflareBindings, 'db'>,
  analysisId: string,
  userId: string,
) {
  const db = getDb(env);
  const [row] = await db
    .select()
    .from(applicationAnalyses)
    .where(
      and(
        eq(applicationAnalyses.id, analysisId),
        eq(applicationAnalyses.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getLatestAnalysis(
  env: Pick<CloudflareBindings, 'db'>,
  applicationId: string,
  userId: string,
) {
  const db = getDb(env);
  const [row] = await db
    .select()
    .from(applicationAnalyses)
    .where(
      and(
        eq(applicationAnalyses.applicationId, applicationId),
        eq(applicationAnalyses.userId, userId),
      ),
    )
    .orderBy(desc(applicationAnalyses.createdAt))
    .limit(1);
  return row ?? null;
}

export function serializeAnalysisRow(row: {
  id: string;
  status: string;
  overallScore: number | null;
  resultJson: string | null;
  errorMessage: string | null;
  resumeHash: string | null;
  jdHash: string | null;
  createdAt: Date | null;
  completedAt: Date | null;
}) {
  let result: AnalysisResult | undefined;
  if (row.resultJson) {
    try {
      result = JSON.parse(row.resultJson) as AnalysisResult;
    } catch {
      result = undefined;
    }
  }
  return {
    analysisId: row.id,
    status: row.status,
    overallScore: row.overallScore,
    result,
    error: row.errorMessage,
    resumeHash: row.resumeHash,
    jdHash: row.jdHash,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}
