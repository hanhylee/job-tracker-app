import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { applications } from './application-schema';
import { user } from './auth-schema';

export const analysisStatuses = [
  'pending',
  'running',
  'complete',
  'failed',
] as const;

export type AnalysisStatus = (typeof analysisStatuses)[number];

export const applicationAnalyses = sqliteTable(
  'application_analyses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', { enum: analysisStatuses })
      .notNull()
      .default('pending'),
    overallScore: integer('overall_score'),
    resultJson: text('result_json'),
    errorMessage: text('error_message'),
    resumeHash: text('resume_hash'),
    jdHash: text('jd_hash'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    applicationIdIdx: index('application_analyses_application_id_idx').on(
      table.applicationId,
    ),
    userIdIdx: index('application_analyses_user_id_idx').on(table.userId),
    statusIdx: index('application_analyses_status_idx').on(table.status),
  }),
);
