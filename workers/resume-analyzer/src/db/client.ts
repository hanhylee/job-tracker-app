import { drizzle } from 'drizzle-orm/d1';
import { schema } from './schema';
import type { CloudflareBindings } from '../types';

export function getDb(env: Pick<CloudflareBindings, 'db'>) {
  return drizzle(env.db, { schema });
}
