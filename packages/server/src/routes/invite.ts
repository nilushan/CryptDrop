import { Hono } from 'hono';
import type { Env } from '../types.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { generateToken } from '../services/tokens.js';
import { createInvitation, findInvitationByToken } from '../db/schema.js';
import { sendInvitationEmail } from '../services/email.js';

export const inviteRoutes = new Hono<{ Bindings: Env }>();

inviteRoutes.post(
  '/invite',
  rateLimit({ action: 'invite', maxRequests: 20, windowSeconds: 3600 }),
  async (c) => {
    const body = await c.req.json<{
      senderEmail: string;
      senderName: string;
      recipientEmail: string;
    }>();

    if (!body.senderEmail || !body.senderName || !body.recipientEmail) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const senderEmail = body.senderEmail.toLowerCase().trim();
    const recipientEmail = body.recipientEmail.toLowerCase().trim();

    if (senderEmail === recipientEmail) {
      return c.json({ error: 'Cannot invite yourself' }, 400);
    }

    const token = generateToken();
    const inviteUrl = `${c.env.SITE_URL}/invite?token=${token}`;

    await createInvitation(c.env.DB, {
      token,
      senderEmail,
      senderName: body.senderName.trim(),
      recipientEmail,
    });

    let emailSent = false;
    try {
      await sendInvitationEmail(c.env, {
        recipientEmail,
        senderName: body.senderName.trim(),
        senderEmail,
        inviteUrl,
      });
      emailSent = true;
    } catch {
      // Invitation is saved in D1 regardless — email delivery is best-effort
    }

    return c.json({ ok: true, token, emailSent });
  }
);

inviteRoutes.get('/invite/:token', async (c) => {
  const token = c.req.param('token');
  const invitation = await findInvitationByToken(c.env.DB, token);

  if (!invitation) {
    return c.json({ valid: false, error: 'Invitation not found' }, 404);
  }

  // Check if invitation is older than 7 days
  const createdAt = new Date(invitation.created_at + 'Z').getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - createdAt > sevenDays && invitation.status === 'pending') {
    return c.json({ valid: false, error: 'Invitation has expired' }, 410);
  }

  return c.json({
    valid: invitation.status === 'pending',
    status: invitation.status,
    token: invitation.token,
    senderName: invitation.sender_name,
    senderEmail: invitation.sender_email,
    recipientEmail: invitation.recipient_email,
  });
});
