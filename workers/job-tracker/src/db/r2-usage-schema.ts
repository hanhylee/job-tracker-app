import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const r2UsageMonthly = sqliteTable('r2_usage_monthly', {
  month: text('month').primaryKey(),
  classACount: integer('class_a_count').notNull().default(0),
  classBCount: integer('class_b_count').notNull().default(0),
  storedBytes: integer('stored_bytes').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`),
});
