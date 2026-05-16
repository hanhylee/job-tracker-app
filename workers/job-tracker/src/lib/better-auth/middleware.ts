import { createMiddleware } from 'hono/factory';
import type { CloudflareBindings } from '../../types';
import { resolveEnv } from '../resolve-env';
import { auth } from './index';

export const authMiddleware = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: {
    user: NonNullable<
      Awaited<ReturnType<ReturnType<typeof auth>['api']['getSession']>>
    >['user'];
    session: NonNullable<
      Awaited<ReturnType<ReturnType<typeof auth>['api']['getSession']>>
    >['session'];
  };
}>(async (c, next) => {
  const env = await resolveEnv(c.env);
  const session = await auth(env).api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});
