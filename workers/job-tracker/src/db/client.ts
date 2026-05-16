import { drizzle } from "drizzle-orm/d1";
import { schema } from "./index";
import type { CloudflareBindings } from "../types";

export function getDb(env: CloudflareBindings) {
  return drizzle(env.db, { schema });
}
