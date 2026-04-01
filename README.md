# CryptDrop

**End-to-end PGP encryption in your browser. No accounts, no servers, no tracking.**

CryptDrop lets you encrypt and decrypt files using PGP — entirely in your browser tab. Your private key and file contents never leave your device.

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
# Install dependencies
npm install

# Start the frontend dev server (localhost:4321)
npm run dev

# Start the backend Worker locally (localhost:8787)
npm run dev -w packages/server

# Run tests
npm test

# Type-check
npm run typecheck
```

---

## Project structure

```
src/
  components/        # React islands (encrypt, decrypt, keys, wizard tabs)
  layouts/           # Astro layout
  lib/               # Shared helpers (openpgp-helpers.ts, api.ts, file-helpers.ts)
  pages/             # Astro pages (app, security, how-it-works, etc.)
  stores/            # Nano Stores (keys, contacts, toast, activeTab)
packages/
  server/            # Cloudflare Worker backend
    src/routes/      # API route handlers
    src/services/    # Email + token services
    migrations/      # D1 SQL migrations
tests/               # Vitest unit tests
```

---

## Verifying the security claims

Because CryptDrop is a static site, you can verify every security claim yourself:

1. Open DevTools → Network tab while using the app
2. Confirm that no requests are made to unexpected destinations
3. Confirm that no file data appears in any request payload
4. Review the source code in this repository

The Content Security Policy header restricts outbound connections to only `keys.openpgp.org` and the CryptDrop backend — you can inspect it in the response headers.
