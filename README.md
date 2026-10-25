# CryptDrop

**End-to-end PGP encryption in your browser. No accounts, no file uploads.**

CryptDrop lets you encrypt and decrypt files using PGP — entirely in your browser tab. Your private key and file contents never leave your device.

[![CryptDrop](docs/screenshot.png)](https://cryptdrop-site.pages.dev/)

### 🔗 [Try the live demo →](https://cryptdrop-site.pages.dev/)

---

## What it does

- **Encrypt files** for one or more recipients using their public PGP key
- **Decrypt files** using your private key and passphrase
- **Generate a key pair** (Curve25519 / Ed25519 + X25519) with passphrase protection
- **Sign and verify** files with digital signatures
- **Look up public keys** by email via the CryptDrop registry or keys.openpgp.org
- **Invite contacts** to CryptDrop and notify recipients when a file is ready to decrypt

All cryptographic operations use [OpenPGP.js 6.x](https://openpgpjs.org/). Encryption and decryption are AES-256. No plaintext file data is ever written to disk or sent over the network.

---

## Security model

Everything sensitive happens locally:

| Operation | Where |
|-----------|-------|
| Key generation | Browser (Curve25519 via OpenPGP.js) |
| Encryption / decryption | Browser (AES-256) |
| Private key storage | Browser IndexedDB (passphrase-encrypted) |
| Contact list | Browser localStorage |

The only network requests are:
- **`GET /api/lookup/:email`** — public key lookup (CryptDrop registry → keys.openpgp.org fallback)
- **`POST /api/register`** — publish your public key to the CryptDrop registry
- **`POST /api/invite`** — send an invitation email
- **`POST /api/notify`** — notify a recipient that a file is ready

Private keys and file contents are never transmitted. See [cryptdrop.app/security](https://cryptdrop.app/security) for a full breakdown.

---

## Workspace key status

- **My key ring** has one entry above the workspace tools, visible on desktop and mobile. It is amber when no private key is loaded and becomes a compact green bar when a key is loaded. Green indicates session availability, not a verified backup.
- Encrypt and Decrypt show compact warning badges in navigation and warning banners on their pages: **amber** allows unsigned encryption but not signing; **rose** means decryption needs a private key. When a key is loaded, these warnings disappear and the navigation descriptions return; the key ring remains the session-status indicator. Decryption still requires the matching key, and signing stays opt-in.
- Missing keys never disable navigation or file selection. The four mobile tools use a fixed icon grid without horizontal scrolling. Keyboard arrows navigate the tools; the separate key-ring button stays reachable with Tab.

## Private key backup and recovery

- **Remember on this device** saves only a fully passphrase-protected OpenPGP private key in IndexedDB. The passphrase and unlocked key are not persisted. Unprotected or partially protected imports remain usable for the current session, but cannot be remembered. Protect them in a trusted PGP tool and re-import them first.
- **Browser storage is not a backup.** Clearing site data, private browsing, or losing a device can remove the saved key. CryptDrop cannot recover a lost private key or forgotten passphrase.
- **Back up your secret** appears only after successful generation on the **Generate a New Key Pair** screen (including guided setup), not in the loaded-key view. It opens a collapsed-by-default password-manager backup guide. It explains how to store the encrypted `.asc` file as an attachment or secure note and retain a recoverable passphrase. Keeping both in one vault is convenient but exposes both if that vault is compromised. A second encrypted copy on a separate drive is recommended.
- **Verify backup** checks a file retrieved from the backup: it must be protected, match the current key and contain its subkeys, and unlock with the supplied passphrase. The check runs locally without replacing the active key or saving the passphrase. It cannot verify the password manager's durability or sync status. A download or checkbox alone does not count as a verified backup.
- Older unprotected browser copies are not automatically deleted: users can load them to preserve their only copy, then remove the unsafe saved copy. They are no longer described as encrypted.

These measures protect stored copies, not secrets in an unlocked browser session. Malicious same-origin JavaScript or a compromised device remains a risk. No native keystore, passkey vault, or cloud private-key backup is implemented.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Astro 5.x + React 19 (island architecture) |
| State | Nano Stores |
| Crypto | OpenPGP.js 6.x |
| Backend | Cloudflare Workers + Hono.js |
| Database | Cloudflare D1 (SQLite) |
| Email | Resend |

---

## Running locally

```bash
# All application commands run from code/
cd code

# Install locked dependencies; prepare local environment and database
npm ci
npm run setup:local

# Optional: add local-only demo keys/invitation states
# npm run db:seed:local

# Start both: API Worker (localhost:8787) + Astro HMR (localhost:4321)
npm run dev
# Ctrl+C stops both; if either process exits, the other is stopped too.

# For separate terminals: npm run dev:backend and npm run dev:frontend.
# To test real Pages forwarding instead, use dev:backend + dev:pages.

# Run all validation (tests, typechecks, bundles and isolated local smoke tests)
npm run check
```

See [local development and script reference](docs/DEVELOPMENT.md) for repeat runs, optional seed data, adding migrations and the full command list. Local setup does not require Cloudflare login and never changes production.

---

## Deployment

The frontend deploys to **Cloudflare Pages** using `code/frontend/wrangler.toml`. The API deploys independently to **Cloudflare Workers** using `code/backend/wrangler.toml`. A Pages Function forwards same-origin `/api/*` calls through a service binding; the API Worker needs no custom domain.

From `code/`, use `npm run deploy:backend` and `npm run deploy:frontend` separately. `npm run deploy:backend:dry-run` validates the backend bundle, and `npm run check:pages` compiles the Pages Function without deploying.

See [deployment and operations](docs/DEPLOYMENT.md) for separate guides to **updating the existing live system**, **provisioning a fresh Cloudflare account**, and **linking Git integrations**. Useful live operations include `db:status:remote`, `db:backup:remote`, `db:migrate:remote`, and `logs:backend`. Confirm the account/resource targets before running them. There is no production seed, automatic migration during deployment, or destructive reset script.

Nothing is deployed automatically by installing, building, checking or setting up locally.

## Design system

See the [shared design-system baseline](docs/design-system.md) for the UI inventory, app and marketing pattern catalogs, accessibility targets, ownership, and migration checklist. [Responsive visual references and validation](docs/design-system-evidence/issue-2/README.md) document the audited baseline; implementation follows independent review.

## Project structure

```
code/                  # Application/workspace root — run npm commands here
  frontend/            # @cryptdrop/frontend: static Astro + React application
    src/               # Components, layouts, pages, browser helpers, stores, styles
    public/            # Static files, security headers and Function route rules
    functions/         # /api/* forwarding to the Worker through a service binding
    wrangler.toml      # Pages project and CRYPTDROP_API binding
    tests/             # UI, crypto and design-evidence tests
    dist/              # Generated static assets (ignored)
  backend/             # @cryptdrop/backend: Cloudflare Worker API
    src/index.ts       # API-only Worker entry point
    src/app.ts         # Hono API and middleware
    src/routes/        # API route handlers
    src/services/      # Email + token services
    migrations/        # Versioned D1 SQL migrations
    seeds/             # Optional local-only demo fixtures (no private keys)
    wrangler.toml      # Worker, D1 and runtime variables (no static assets)
    tests/             # Worker/API routing tests
  package.json         # Workspace scripts and deployment tooling
  package-lock.json    # npm lockfile
  pnpm-lock.yaml       # pnpm lockfile
  pnpm-workspace.yaml  # pnpm workspace configuration
  scripts/             # Safe local setup/seed, remote SQL export and isolated smoke test
  vitest.config.ts     # Runs both workspaces' tests
docs/                  # Deployment guide, design system and retained evidence
CLAUDE.md              # Repository instructions
```

---

## Verifying the security claims

Because CryptDrop is a static site, you can verify every security claim yourself:

1. Open DevTools → Network tab while using the app
2. Confirm that no requests are made to unexpected destinations
3. Confirm that no file data appears in any request payload
4. Review the source code in this repository

The Content Security Policy header restricts outbound connections to only `keys.openpgp.org` and the CryptDrop backend — you can inspect it in the response headers.
