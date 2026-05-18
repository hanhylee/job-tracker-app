import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import type { CloudflareBindings, Variables } from '../types';
import { applications } from '../db/application-schema';
import { getDb } from '../db/client';
import { proxyAnalyzerJson } from '../lib/analyzer-proxy';
import { requireProMembership } from '../lib/pro-membership';

export const analysisRoutes = new Hono<{
  Bindings: CloudflareBindings;
  Variables: Variables;
}>()
  .post('/:id/analyze', async (c) => {
    const denied = await requireProMembership(c);
    if (denied) return denied;

    const user = c.get('user');
    const { id } = c.req.param();
    const db = getDb(c.env);

    const [row] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);

    if (!row) {
      return c.json({ error: 'Not found' }, 404);
    }

    if (!row.jobDescription?.trim()) {
      return c.json({ error: 'Job description is required' }, 400);
    }
    if (!row.resumeUrl) {
      return c.json({ error: 'Resume is required' }, 400);
    }

    const force = c.req.query('force') === 'true';
    const analyzerRequest = new Request('http://analyzer/internal/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: id,
        userId: user.id,
        force,
      }),
    });

    return proxyAnalyzerJson(c, analyzerRequest, [200, 202, 400, 403, 404]);
  })
  .get('/:id/analysis', async (c) => {
    const denied = await requireProMembership(c);
    if (denied) return denied;

    const user = c.get('user');
    const { id } = c.req.param();

    const db = getDb(c.env);
    const [row] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);

    if (!row) {
      return c.json({ error: 'Not found' }, 404);
    }

    const analyzerRequest = new Request(
      `http://analyzer/internal/applications/${id}/analysis/latest?userId=${encodeURIComponent(user.id)}`,
      { method: 'GET' },
    );

    return proxyAnalyzerJson(c, analyzerRequest, [200, 404]);
  })
  .get('/analyses/:analysisId', async (c) => {
    const denied = await requireProMembership(c);
    if (denied) return denied;

    const user = c.get('user');
    const { analysisId } = c.req.param();

    const analyzerRequest = new Request(
      `http://analyzer/internal/analyses/${analysisId}?userId=${encodeURIComponent(user.id)}`,
      { method: 'GET' },
    );

    return proxyAnalyzerJson(c, analyzerRequest, [200, 403, 404]);
  });
