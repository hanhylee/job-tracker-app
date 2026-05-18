import { Hono } from 'hono';
import type { CloudflareBindings } from '../types';
import { assertUserIsPro, proRequiredBody } from '../lib/pro-check';
import { normalizeText, sha256Hex } from '../lib/hash';
import {
  createPendingAnalysis,
  findCachedAnalysis,
  getAnalysisById,
  getLatestAnalysis,
  loadApplicationForAnalysis,
  serializeAnalysisRow,
} from '../lib/analysis-store';
import { extractPdfText } from '../lib/pdf-text';

export const internalRoutes = new Hono<{ Bindings: CloudflareBindings }>()
  .post('/internal/analyze', async (c) => {
    const body = await c.req.json<{
      applicationId: string;
      userId: string;
      force?: boolean;
    }>();

    if (!body.applicationId || !body.userId) {
      return c.json({ error: 'applicationId and userId are required' }, 400);
    }

    const isPro = await assertUserIsPro(c.env, body.userId);
    if (!isPro) {
      return c.json(proRequiredBody(), 403);
    }

    const app = await loadApplicationForAnalysis(
      c.env,
      body.applicationId,
      body.userId,
    );
    if (!app) {
      return c.json({ error: 'Not found' }, 404);
    }
    if (!app.jobDescription?.trim()) {
      return c.json({ error: 'Job description is required' }, 400);
    }
    if (!app.resumeUrl) {
      return c.json({ error: 'Resume is required' }, 400);
    }

    const object = await c.env.RESUMES.get(app.resumeUrl);
    if (!object) {
      return c.json({ error: 'Resume file not found' }, 400);
    }

    const pdfBytes = await object.arrayBuffer();
    let resumeText: string;
    try {
      resumeText = normalizeText(await extractPdfText(pdfBytes));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid resume PDF';
      return c.json({ error: message }, 400);
    }

    const jdText = normalizeText(app.jobDescription);
    const [resumeHash, jdHash] = await Promise.all([
      sha256Hex(resumeText),
      sha256Hex(jdText),
    ]);

    if (!body.force) {
      const cached = await findCachedAnalysis(
        c.env,
        body.applicationId,
        body.userId,
        resumeHash,
        jdHash,
      );
      if (cached) {
        return c.json(
          {
            ...serializeAnalysisRow(cached),
            cached: true,
          },
          200,
        );
      }
    }

    const analysisId = await createPendingAnalysis(c.env, {
      applicationId: body.applicationId,
      userId: body.userId,
      resumeHash,
      jdHash,
    });

    await c.env.ANALYSIS_QUEUE.send({
      analysisId,
      applicationId: body.applicationId,
      userId: body.userId,
    });

    return c.json({ analysisId, status: 'pending' }, 202);
  })
  .get('/internal/analyses/:analysisId', async (c) => {
    const { analysisId } = c.req.param();
    const userId = c.req.query('userId');
    if (!userId) {
      return c.json({ error: 'userId query is required' }, 400);
    }

    const isPro = await assertUserIsPro(c.env, userId);
    if (!isPro) {
      return c.json(proRequiredBody(), 403);
    }

    const row = await getAnalysisById(c.env, analysisId, userId);
    if (!row) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json(serializeAnalysisRow(row));
  })
  .get('/internal/applications/:applicationId/analysis/latest', async (c) => {
    const { applicationId } = c.req.param();
    const userId = c.req.query('userId');
    if (!userId) {
      return c.json({ error: 'userId query is required' }, 400);
    }

    const isPro = await assertUserIsPro(c.env, userId);
    if (!isPro) {
      return c.json(proRequiredBody(), 403);
    }

    const row = await getLatestAnalysis(c.env, applicationId, userId);
    if (!row) {
      return c.json({ error: 'No analysis found' }, 404);
    }

    return c.json(serializeAnalysisRow(row));
  });
