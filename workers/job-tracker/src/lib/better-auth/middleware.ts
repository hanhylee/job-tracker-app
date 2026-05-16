import { createMiddleware } from 'hono/factory';
import type { CloudflareBindings } from '../../bindings';
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
  const session = await auth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});
