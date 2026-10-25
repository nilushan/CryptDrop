import { Hono } from 'hono';
import type { Env } from '../types.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { findUserByEmail } from '../db/schema.js';

export const lookupRoutes = new Hono<{ Bindings: Env }>();

lookupRoutes.get(
  '/lookup/:email',
  rateLimit({ action: 'lookup', maxRequests: 60, windowSeconds: 60 }),
  async (c) => {
    const email = (c.req.param('email') ?? '').toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    // Check local D1 registry first
    const user = await findUserByEmail(c.env.DB, email);
    if (user) {
      return c.json({
        found: true,
        source: 'registry',
        name: user.name,
        email: user.email,
        publicKey: user.public_key,
        fingerprint: user.fingerprint,
      });
    }

    // Fall back to keys.openpgp.org
    try {
      const res = await fetch(
        `https://keys.openpgp.org/vks/v1/by-email/${encodeURIComponent(email)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const armoredKey = await res.text();
        return c.json({
          found: true,
          source: 'keyserver',
          email,
          publicKey: armoredKey,
        });
      }
    } catch {
      // Keyserver unreachable — fall through to not-found
    }

    return c.json({ found: false }, 404);
  }
);
