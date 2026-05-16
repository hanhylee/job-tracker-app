// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/db/auth-schema.ts', './src/db/schema.ts'],
  out: './migrations',
  dialect: 'sqlite',
});