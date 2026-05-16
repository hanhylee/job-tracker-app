import { Hono } from "hono";
import type { CloudflareBindings, Variables } from "../types";
import { applications } from "../db/application-schema";
import { getDb } from "../db/client";
import { eq, and } from "drizzle-orm";
import { isApplicationStatus } from "../lib/application-status";

export const applicationsRoutes = new Hono<{
  Bindings: CloudflareBindings;
  Variables: Variables;
}>()
  .get("/", async (c) => {
    const user = c.get("user");
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, user.id));
    return c.json({ success: true, applications: rows, userId: user.id });
  })
  .post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();
    const db = getDb(c.env);
    const [created] = await db
      .insert(applications)
      .values({
        userId: user.id,
        company: body.company,
        title: body.title,
        status: body.status ?? "applied",
        jobUrl: body.jobUrl,
        notes: body.notes,
      })
      .returning();
    return c.json({ success: true, application: created }, 201);
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const { id } = c.req.param();
    const db = getDb(c.env);
    const [row] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);
    if (!row) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json({ success: true, application: row });
  })
  .patch("/:id", async (c) => {
    const user = c.get("user");
    const { id } = c.req.param();
    const body = await c.req.json<{
      company?: string;
      title?: string;
      status?: string;
      jobUrl?: string | null;
      notes?: string | null;
    }>();

    if (body.status !== undefined && !isApplicationStatus(body.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.company !== undefined) updates.company = body.company;
    if (body.title !== undefined) updates.title = body.title;
    if (body.status !== undefined) updates.status = body.status;
    if (body.jobUrl !== undefined) updates.jobUrl = body.jobUrl;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 1) {
      return c.json({ error: "No fields to update" }, 400);
    }

    const db = getDb(c.env);
    const [updated] = await db
      .update(applications)
      .set(updates)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .returning();

    if (!updated) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json({ success: true, application: updated });
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const { id } = c.req.param();
    const db = getDb(c.env);
    const [deleted] = await db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .returning();
    if (!deleted) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json({ success: true, deleted: id });
  });
