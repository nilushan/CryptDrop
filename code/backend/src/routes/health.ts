import { Hono } from 'hono';
import type { Env } from '../types.js';

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
