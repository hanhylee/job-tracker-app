import { Hono } from 'hono';
import type { CloudflareBindings } from './types';
import { internalRoutes } from './routes/internal';

export const app = new Hono<{ Bindings: CloudflareBindings }>();

app.route('/', internalRoutes);

app.get('/health', (c) => c.json({ ok: true, service: 'resume-analyzer' }));
