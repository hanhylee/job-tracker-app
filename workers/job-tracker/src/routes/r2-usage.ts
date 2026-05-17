import { Hono } from "hono";
import type { CloudflareBindings, Variables } from "../types";
import { getDb } from "../db/client";
import { getR2Usage } from "../lib/r2-usage";

export const r2UsageRoutes = new Hono<{
  Bindings: CloudflareBindings;
  Variables: Variables;
}>().get("/", async (c) => {
  const db = getDb(c.env);
  const snapshot = await getR2Usage(db);
  return c.json({
    success: true,
    month: snapshot.month,
    usage: {
      classA: snapshot.classA,
      classB: snapshot.classB,
      storageBytes: snapshot.storageBytes,
    },
  });
});
