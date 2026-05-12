// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts', // Update this to wherever you put the schema
  out: './migrations',          // Where the SQL files will be saved
  dialect: 'sqlite',            // D1 uses SQLite under the hood
});