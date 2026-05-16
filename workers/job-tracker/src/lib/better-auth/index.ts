import { drizzle } from 'drizzle-orm/d1';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import type { CloudflareBindings } from '../../bindings';
import { schema } from '../../db';
import { createBetterAuthOptions } from './options';

export const auth = (env: CloudflareBindings) => {
  const db = drizzle(env.db, { schema });

  return betterAuth({
    ...createBetterAuthOptions(env),
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
  });
};

export type Auth = ReturnType<typeof auth>;
