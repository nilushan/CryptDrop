# CryptDrop Product Roadmap

## Deployment Architecture

- **Frontend**: Cloudflare Pages (static Astro site)
- **Backend**: Cloudflare Workers (thin API layer)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Email**: SendGrid API
- **Key Server**: keys.openpgp.org (public keyserver, proxied via Workers)

## Trust Model

All encryption, decryption, signing, verification, private key storage, and file handling stays client-side. The server never sees unencrypted files or private keys.

---

## Phase 1: Reframe & Guided UX (Frontend Only)

**Goal**: Improve UX with wizard-style flow, no infrastructure needed.

See [PHASE-1-PLAN.md](./PHASE-1-PLAN.md) for detailed specification.

**Key Changes**:
- Wizard flow replacing tab layout
- Two explicit paths: "Encrypt a file" / "Decrypt a file"
- Simplified key generation as primary action
- Progress indicators and inline education
- Language shift from "send" to "encrypt/decrypt"

**Deploys to**: Cloudflare Pages (static)

---

## Phase 2: Backend Server for Key Registration

**Goal**: User registry + key proxy for faster lookups and user tracking.

**Infrastructure**:
- Cloudflare Worker with 3 endpoints
- Cloudflare D1 database

**API Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/register` | Store public key + user info, proxy to keyserver |
| GET | `/api/lookup/:email` | Find user's public key (local first, keyserver fallback) |
| GET | `/api/health` | Health check |

**D1 Schema**:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_fingerprint ON users(fingerprint);
```

**App Changes**:
- Key generation calls `/api/register` after keyserver publish
- Recipient lookup hits `/api/lookup/:email` first, falls back to keyserver

---

## Phase 3: SendGrid Email Integration & Invitations

**Goal**: Invitation loop that makes CryptDrop practical for real use.

**New API Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/invite` | Send invitation email via SendGrid |
| POST | `/api/notify` | Notify sender when invitee completes registration |
| GET | `/api/invite/:token` | Validate invitation token |

**D1 Schema Addition**:

```sql
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending | accepted | expired
  created_at TEXT DEFAULT (datetime('now')),
  accepted_at TEXT,
  FOREIGN KEY (sender_email) REFERENCES users(email)
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_recipient ON invitations(recipient_email);
```

**Email Templates**:
1. **Invitation**: "[Name] wants to send you an encrypted file"
2. **Notification**: "[Name] has set up their keys — you can now encrypt files for them"

**App Changes**:
- "Recipient not found" → offer to send invitation email
- Invitation link lands on `/app?invite=TOKEN` with contextual onboarding
- After key creation via invite, trigger notification to sender

---

## Phase 4: Polish & Edge Cases

**Goal**: Handle returning users, edge cases, and quality-of-life features.

**Features**:
- localStorage persistence for key fingerprints (offer to re-import)
- "My Keys" dashboard showing fingerprint, creation date
- Key expiry/rotation guidance
- Multiple device support hints
- Error recovery flows
- Locally tracked encryption history (who you've exchanged with)
- Rate limiting on Worker endpoints
- CORS configuration for production domain

---

## Build Order

1. **Phase 1** — Immediate UX improvement, zero infrastructure
2. **Phase 2** — Simple Worker + D1, unlocks Phase 3
3. **Phase 3** — Big value-add: invitation loop for real-world usage
4. **Phase 4** — Ongoing polish and hardening
