import { Hono } from 'hono';
import type { Env } from '../types.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { sendDecryptInstructionsEmail } from '../services/email.js';

export const notifyRoutes = new Hono<{ Bindings: Env }>();

notifyRoutes.post(
  '/notify',
  rateLimit({ action: 'notify', maxRequests: 30, windowSeconds: 3600 }),
  async (c) => {
    const body = await c.req.json<{
      type: string;
      recipientEmail: string;
      senderName: string;
      filename: string;
    }>();

    if (body.type !== 'decrypt-instructions') {
      return c.json({ error: 'Unknown notification type' }, 400);
    }

    if (!body.recipientEmail || !body.senderName || !body.filename) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    await sendDecryptInstructionsEmail(c.env, {
      recipientEmail: body.recipientEmail.toLowerCase().trim(),
      senderName: body.senderName.trim(),
      filename: body.filename,
    });

    return c.json({ ok: true });
  }
);
