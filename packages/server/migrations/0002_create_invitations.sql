CREATE TABLE invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_recipient ON invitations(recipient_email);
CREATE INDEX idx_invitations_status ON invitations(status);
