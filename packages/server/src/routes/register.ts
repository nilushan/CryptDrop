import { Hono } from 'hono';
import type { Env } from '../types.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { upsertUser, markInvitationsAccepted, markInvitationAcceptedByToken } from '../db/schema.js';
import { sendNotificationEmail } from '../services/email.js';

export const registerRoutes = new Hono<{ Bindings: Env }>();

registerRoutes.post(
  '/register',
  rateLimit({ action: 'register', maxRequests: 10, windowSeconds: 3600 }),
  async (c) => {
    const body = await c.req.json<{
      email: string;
      name: string;
      publicKey: string;
      fingerprint: string;
      inviteToken?: string;
    }>();

    if (!body.email || !body.name || !body.publicKey || !body.fingerprint) {
      return c.json({ error: 'Missing required fields: email, name, publicKey, fingerprint' }, 400);
    }

    const email = body.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    await upsertUser(c.env.DB, {
      email,
      name: body.name.trim(),
      publicKey: body.publicKey,
      fingerprint: body.fingerprint,
    });

    // Accept invitations: by token first (handles email mismatch), then by email for any others
    const acceptedInvitations: Array<{ sender_email: string }> = [];

    if (body.inviteToken) {
      const inv = await markInvitationAcceptedByToken(c.env.DB, body.inviteToken.trim());
      if (inv) acceptedInvitations.push(inv);
    }

    // Also accept any pending invitations matching the registered email
    const byEmail = await markInvitationsAccepted(c.env.DB, email);
    acceptedInvitations.push(...byEmail);

    for (const inv of acceptedInvitations) {
      try {
        await sendNotificationEmail(c.env, {
          senderEmail: inv.sender_email,
          recipientEmail: email,
          recipientName: body.name.trim(),
        });
      } catch {
        // Non-critical — don't fail registration if notification email fails
      }
    }

    return c.json({
      ok: true,
      invitationsAccepted: acceptedInvitations.length,
    });
  }
);
