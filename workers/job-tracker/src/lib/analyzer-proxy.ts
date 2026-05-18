import type { Context } from 'hono';
import type { CloudflareBindings, Variables } from '../types';

type ProxyContext = Context<{
  Bindings: CloudflareBindings;
  Variables: Variables;
}>;

export async function proxyAnalyzerJson(
  c: ProxyContext,
  analyzerRequest: Request,
  allowedStatuses: number[],
): Promise<Response> {
  let analyzerResponse: Response;
  try {
    analyzerResponse = await c.env.ANALYZER.fetch(analyzerRequest);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analyzer fetch failed';
    console.error('[analyzer] binding error', message);
    return c.json(
      { error: 'Analysis service unavailable', code: 'ANALYZER_UNAVAILABLE' },
      503,
    );
  }

  const text = await analyzerResponse.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      console.error(
        '[analyzer] non-json response',
        text.slice(0, 200),
        analyzerResponse.status,
      );
      return c.json(
        { error: 'Analysis service unavailable', code: 'ANALYZER_UNAVAILABLE' },
        503,
      );
    }
  }

  const status = analyzerResponse.status;
  if (!allowedStatuses.includes(status)) {
    return c.json(
      typeof body === 'object' && body && 'error' in body
        ? body
        : { error: 'Analysis request failed' },
      status as 400 | 403 | 404 | 500 | 503,
    );
  }

  return c.json(body, status as 200);
}
