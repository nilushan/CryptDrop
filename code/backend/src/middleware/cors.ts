import { cors } from 'hono/cors';
import type { Env } from '../types.js';

export function corsMiddleware() {
  return cors({
    origin: (origin, c) => {
      const siteUrl = (c.env as Env).SITE_URL;
      const allowed = [siteUrl, 'http://localhost:4321', 'http://localhost:3000'];
      return allowed.includes(origin) ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  });
}
