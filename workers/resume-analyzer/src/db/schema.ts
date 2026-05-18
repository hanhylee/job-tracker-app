import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  isPro: integer('is_pro', { mode: 'boolean' }).notNull().default(false),
});

export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobDescription: text('job_description'),
  resumeUrl: text('resume_url'),
});

export const analysisStatuses = [
  'pending',
  'running',
  'complete',
  'failed',
] as const;

export const applicationAnalyses = sqliteTable(
  'application_analyses',
  {
    id: text('id').primaryKey(),
    applicationId: text('application_id').notNull(),
    userId: text('user_id').notNull(),
    status: text('status', { enum: analysisStatuses }).notNull(),
    overallScore: integer('overall_score'),
    resultJson: text('result_json'),
    errorMessage: text('error_message'),
    resumeHash: text('resume_hash'),
    jdHash: text('jd_hash'),
    createdAt: integer('created_at', { mode: 'timestamp' }),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    applicationIdIdx: index('application_analyses_application_id_idx').on(
      table.applicationId,
    ),
  }),
);

export const schema = { user, applications, applicationAnalyses };
