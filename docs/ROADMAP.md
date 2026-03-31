# CryptDrop Product Roadmap

## Deployment Architecture

- **Frontend**: Cloudflare Pages (static Astro site)
- **Backend**: Cloudflare Workers (thin API layer)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Email**: Resend API
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

## Phase 2+3: Backend Server, User Registry & Invitations ✅

**Status**: Implemented — `packages/server/` (Hono.js + D1 + Resend)

**Infrastructure**:
- Cloudflare Worker (Hono.js) in `packages/server/`
- Cloudflare D1 database with 3 tables (users, invitations, rate_limits)
- Resend for transactional emails
- npm workspaces monorepo

**API Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/register` | Store public key, auto-accept pending invitations, notify senders |
| GET | `/api/lookup/:email` | D1 registry first, keyserver fallback |
| POST | `/api/invite` | Create invitation + send email via Resend |
| GET | `/api/invite/:token` | Validate invitation token |
| POST | `/api/notify` | Send decrypt instructions email |

**App Changes**:
- `lookupKeyByEmail()` routes through `/api/lookup` first, falls back to direct keyserver
- Key generation auto-registers via `POST /api/register`
- InviteBox sends real invitation emails (mailto fallback if API unavailable)
- `/invite?token=...` dedicated landing page for invited recipients
- "Email decrypt instructions" button on post-encrypt result
- D1-backed rate limiting on all endpoints

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

1. **Phase 1** — Immediate UX improvement, zero infrastructure ✅
2. **Phase 2+3** — Worker + D1 + Resend: user registry, lookup, invitations ✅
3. **Phase 4** — Ongoing polish and hardening
