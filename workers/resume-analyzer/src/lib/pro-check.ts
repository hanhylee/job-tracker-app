import { eq } from 'drizzle-orm';
import { user } from '../db/schema';
import { getDb } from '../db/client';
import type { CloudflareBindings } from '../types';

export const PRO_REQUIRED_CODE = 'PRO_REQUIRED';

export function proRequiredBody() {
  return {
    error: 'Pro membership required',
    code: PRO_REQUIRED_CODE,
  };
}

export async function assertUserIsPro(
  env: Pick<CloudflareBindings, 'db'>,
  userId: string,
): Promise<boolean> {
  const db = getDb(env);
  const [row] = await db
    .select({ isPro: user.isPro })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) return false;
  const value = row.isPro as boolean | number;
  return value === true || value === 1;
}
