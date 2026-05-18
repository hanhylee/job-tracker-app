// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/db/auth-schema.ts',
    './src/db/application-schema.ts',
    './src/db/r2-usage-schema.ts',
    './src/db/analysis-schema.ts',
  ],
  out: './migrations',
  dialect: 'sqlite',
});