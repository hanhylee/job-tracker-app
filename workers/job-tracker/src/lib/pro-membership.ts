import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import type { CloudflareBindings } from '../types';
import { user } from '../db/auth-schema';
import { getDb } from '../db/client';

export const PRO_REQUIRED_CODE = 'PRO_REQUIRED';

export function proRequiredResponse() {
  return {
    error: 'Pro membership required',
    code: PRO_REQUIRED_CODE,
  };
}

export async function getUserIsPro(
  db: ReturnType<typeof getDb>,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ isPro: user.isPro })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.isPro === true;
}

export async function requireProMembership<V extends { user: { id: string } }>(
  c: Context<{ Bindings: CloudflareBindings; Variables: V }>,
) {
  const db = getDb(c.env);
  const isPro = await getUserIsPro(db, c.get('user').id);
  if (!isPro) {
    return c.json(proRequiredResponse(), 403);
  }
  return null;
}
