import { Resend } from 'resend';
import type { Env } from '../types.js';
import { invitationEmailHtml } from '../templates/invitation.js';
import { notificationEmailHtml } from '../templates/notification.js';
import { decryptInstructionsEmailHtml } from '../templates/decrypt-instructions.js';

const FROM_ADDRESS = 'CryptDrop <cryptdrop.app@nilushansilva.info>';

function getResend(env: Env): Resend {
  return new Resend(env.RESEND_API_KEY);
}

export async function sendInvitationEmail(
  env: Env,
  data: { recipientEmail: string; senderName: string; senderEmail: string; inviteUrl: string },
) {
  const resend = getResend(env);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.recipientEmail,
    subject: `${data.senderName} wants to send you an encrypted file`,
    html: invitationEmailHtml(data),
  });
}

export async function sendNotificationEmail(
  env: Env,
  data: { senderEmail: string; recipientEmail: string; recipientName: string },
) {
  const resend = getResend(env);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.senderEmail,
    subject: `${data.recipientName} is ready to receive encrypted files`,
    html: notificationEmailHtml({ ...data, siteUrl: env.SITE_URL }),
  });
}

export async function sendDecryptInstructionsEmail(
  env: Env,
  data: { recipientEmail: string; senderName: string; filename: string },
) {
  const resend = getResend(env);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.recipientEmail,
    subject: `${data.senderName} sent you an encrypted file`,
    html: decryptInstructionsEmailHtml({ ...data, siteUrl: env.SITE_URL }),
  });
}
