import { Hono } from "hono";
import type { CloudflareBindings, Variables } from "../types";
import { applications } from "../db/application-schema";
import { getDb } from "../db/client";
import { eq, and } from "drizzle-orm";
import { isApplicationStatus } from "../lib/application-status";
import {
  deleteResumeObject,
  getResumeObject,
  handleR2Error,
  putResumeObject,
  resumeObjectKey,
  resolveResumeSizeBytes,
  setUsageWarningHeader,
  validatePdf,
} from "../lib/resume-storage";

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
  .put("/:id/resume", async (c) => {
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

    const body = await c.req.arrayBuffer();
    const pdfError = validatePdf(body, c.req.header("content-type") ?? undefined);
    if (pdfError) {
      return c.json({ error: pdfError }, 400);
    }

    const key = resumeObjectKey(user.id, id);
    let oldSize = 0;
    if (row.resumeUrl) {
      oldSize = await resolveResumeSizeBytes(c.env, row.resumeUrl, db);
    }

    try {
      const { warning } = await putResumeObject(c.env, db, key, body, oldSize);
      const [updated] = await db
        .update(applications)
        .set({ resumeUrl: key, updatedAt: new Date() })
        .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
        .returning();
      setUsageWarningHeader(c.res.headers, warning);
      return c.json({ success: true, application: updated });
    } catch (err) {
      const handled = handleR2Error(err);
      if (handled) return c.json(handled.body, handled.status as 429);
      throw err;
    }
  })
  .get("/:id/resume", async (c) => {
    const user = c.get("user");
    const { id } = c.req.param();
    const db = getDb(c.env);
    const [row] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);
    if (!row?.resumeUrl) {
      return c.json({ error: "Not found" }, 404);
    }

    try {
      const { object, warning } = await getResumeObject(c.env, db, row.resumeUrl);
      setUsageWarningHeader(c.res.headers, warning);
      const headers = new Headers();
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Disposition", 'inline; filename="resume.pdf"');
      setUsageWarningHeader(headers, warning);
      return new Response(object.body, { headers });
    } catch (err) {
      const handled = handleR2Error(err);
      if (handled) return c.json(handled.body, handled.status as 404 | 429);
      throw err;
    }
  })
  .delete("/:id/resume", async (c) => {
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
    if (!row.resumeUrl) {
      return c.json({ error: "No resume uploaded" }, 404);
    }

    try {
      const { warning } = await deleteResumeObject(c.env, db, row.resumeUrl, 0);
      const [updated] = await db
        .update(applications)
        .set({ resumeUrl: null, updatedAt: new Date() })
        .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
        .returning();
      setUsageWarningHeader(c.res.headers, warning);
      return c.json({ success: true, application: updated });
    } catch (err) {
      const handled = handleR2Error(err);
      if (handled) return c.json(handled.body, handled.status as 429);
      throw err;
    }
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
    const [existing] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);
    if (!existing) {
      return c.json({ error: "Not found" }, 404);
    }

    if (existing.resumeUrl) {
      try {
        await deleteResumeObject(c.env, db, existing.resumeUrl, 0);
      } catch (err) {
        const handled = handleR2Error(err);
        if (handled) return c.json(handled.body, handled.status as 429);
        console.error("[resume cleanup]", err);
      }
    }

    await db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .run();

    return c.json({ success: true, deleted: id });
  });
