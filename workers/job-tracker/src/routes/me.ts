import { Hono } from 'hono';
import type { CloudflareBindings, Variables } from '../types';
import { getUserIsPro } from '../lib/pro-membership';
import { getDb } from '../db/client';

export const meRoutes = new Hono<{
  Bindings: CloudflareBindings;
  Variables: Variables;
}>().get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env);
  const isPro = await getUserIsPro(db, user.id);

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isPro,
    },
  });
});
