import type { Context, Next } from 'hono';
import type { Env } from '../types.js';

interface RateLimitConfig {
  action: string;
  maxRequests: number;
  windowSeconds: number;
  keyFn?: (c: Context<{ Bindings: Env }>) => string;
}

export function rateLimit(config: RateLimitConfig) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const identifier = config.keyFn
      ? config.keyFn(c)
      : c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown';

    const key = `${config.action}:${identifier}`;
    const db = c.env.DB;
    const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

    // Clean expired entries lazily (1% chance per request)
    if (Math.random() < 0.01) {
      await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(windowStart).run();
    }

    const row = await db
      .prepare('SELECT count, window_start FROM rate_limits WHERE key = ?')
      .bind(key)
      .first<{ count: number; window_start: string }>();

    if (row && row.window_start > windowStart) {
      if (row.count >= config.maxRequests) {
        return c.json({ error: 'Too many requests. Please try again later.' }, 429);
      }
      await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
    } else {
      await db
        .prepare(
          `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET count = 1, window_start = datetime('now')`
        )
        .bind(key)
        .run();
    }

    await next();
  };
}
