import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema';

// Applications Table
export const applications = sqliteTable('applications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  title: text('title').notNull(),
  status: text('status', { enum: ['saved', 'applied', 'interviewing', 'offered', 'rejected'] })
    .notNull()
    .default('applied'),
  jobUrl: text('job_url'),
  resumeUrl: text('resume_url'), 
  notes: text('notes'),
  appliedAt: integer('applied_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  // Indexing for read performance
  userIdIdx: index('user_id_idx').on(table.userId),
  statusIdx: index('status_idx').on(table.status),
}));
