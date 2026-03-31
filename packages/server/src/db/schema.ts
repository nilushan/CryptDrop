export interface UserRow {
  id: number;
  email: string;
  name: string;
  public_key: string;
  fingerprint: string;
  created_at: string;
  updated_at: string;
}

export interface InvitationRow {
  id: number;
  token: string;
  sender_email: string;
  sender_name: string;
  recipient_email: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  accepted_at: string | null;
}

export interface RateLimitRow {
  key: string;
  count: number;
  window_start: string;
}

export async function findUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
}

export async function upsertUser(
  db: D1Database,
  user: { email: string; name: string; publicKey: string; fingerprint: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (email, name, public_key, fingerprint)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         public_key = excluded.public_key,
         fingerprint = excluded.fingerprint,
         updated_at = datetime('now')`
    )
    .bind(user.email, user.name, user.publicKey, user.fingerprint)
    .run();
}

export async function findPendingInvitationsByRecipient(
  db: D1Database,
  recipientEmail: string
): Promise<InvitationRow[]> {
  const result = await db
    .prepare("SELECT * FROM invitations WHERE recipient_email = ? AND status = 'pending'")
    .bind(recipientEmail)
    .all<InvitationRow>();
  return result.results;
}

export async function markInvitationsAccepted(
  db: D1Database,
  recipientEmail: string
): Promise<InvitationRow[]> {
  const pending = await findPendingInvitationsByRecipient(db, recipientEmail);
  if (pending.length > 0) {
    await db
      .prepare(
        "UPDATE invitations SET status = 'accepted', accepted_at = datetime('now') WHERE recipient_email = ? AND status = 'pending'"
      )
      .bind(recipientEmail)
      .run();
  }
  return pending;
}

export async function createInvitation(
  db: D1Database,
  invitation: { token: string; senderEmail: string; senderName: string; recipientEmail: string }
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO invitations (token, sender_email, sender_name, recipient_email) VALUES (?, ?, ?, ?)'
    )
    .bind(invitation.token, invitation.senderEmail, invitation.senderName, invitation.recipientEmail)
    .run();
}

export async function findInvitationByToken(
  db: D1Database,
  token: string
): Promise<InvitationRow | null> {
  return db.prepare('SELECT * FROM invitations WHERE token = ?').bind(token).first<InvitationRow>();
}
