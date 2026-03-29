# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Astro dev server
npm run build        # Production build → dist/
npm test             # Run all tests (vitest, one-shot)
npm run test:watch   # Vitest in watch mode
npm run typecheck    # Type-check via astro check
```

Run a single test file:
```bash
npx vitest run tests/utility-functions.test.ts
```

Run tests matching a name pattern:
```bash
npx vitest run --reporter=verbose -t "should format bytes"
```

## Architecture

CryptDrop is a **fully client-side PGP encryption tool** deployed as a static Astro 5.x site with React islands. All encryption, decryption, key generation, and file handling happens in the browser — the server never sees private keys or unencrypted files.

### Tech stack

- **Astro 5.x** — static site generator with `@astrojs/react` integration
- **React 19** — UI components rendered as Astro islands (`client:load`)
- **Nano Stores** (`nanostores` + `@nanostores/react`) — cross-island shared state
- **OpenPGP.js 6.x** — imported as ES module (not vendored)
- **TypeScript** — `.tsx` components, `.ts` stores/libs
- **Vitest + jsdom** — unit tests

### Island architecture

Each tab is an independent React island mounted in `src/pages/app/index.astro`:

| Island | Component | Stores subscribed |
|--------|-----------|-------------------|
| Encrypt | `src/components/encrypt/EncryptTab.tsx` | `$contacts`, `$privateKey`, `$activeTab` |
| Decrypt | `src/components/decrypt/DecryptTab.tsx` | `$privateKey`, `$publicKey`, `$userInfo`, `$contacts` |
| Keys | `src/components/keys/KeysTab.tsx` | Key stores, `$contacts` |
| Wizard | `src/components/wizard/WizardTab.tsx` | Key stores, `$contacts`, `$activeTab` |
| Toast | `src/components/shared/Toast.tsx` | `$toast` |
| KeyStatusPill | `src/components/shared/KeyStatusPill.tsx` | `$privateKey`, `$userInfo` |

Tab switching is handled by a Nano Store (`$activeTab`) with an Astro inline script that toggles `.hidden` on tab panels.

### Shared state (Nano Stores)

| Store file | Atoms | Purpose |
|------------|-------|---------|
| `src/stores/keys.ts` | `$privateKey`, `$publicKey`, `$armoredPublic`, `$armoredPrivate`, `$userInfo` | User's PGP key pair |
| `src/stores/contacts.ts` | `$contacts` | localStorage-backed contact directory |
| `src/stores/toast.ts` | `$toast` | Cross-island toast notifications |
| `src/stores/activeTab.ts` | `$activeTab` | Current visible tab |

### Shared libraries

| File | Purpose |
|------|---------|
| `src/lib/openpgp-helpers.ts` | `generateKeyPair()`, `importPrivateKey()`, `encryptFileData()`, `decryptFileData()`, `lookupKeyByEmail()`, `parseUserId()` |
| `src/lib/file-helpers.ts` | `formatSize()`, `downloadBlob()`, `saveToFolder()`, `sanitizeFolderName()`, `shortName()` |

### CSS

All styles are in `<style is:global>` in `src/pages/app/index.astro`. React components use the same CSS class names. Styles use custom utility classes (not Tailwind).

### Test setup

Tests use vitest + jsdom with `@testing-library/jest-dom` matchers. Test files are in `tests/` and can be `.test.ts` or `.test.tsx`. The setup file is `tests/rtl-setup.ts`.

### Planned backend (not yet built)

Per `docs/ROADMAP.md`: Cloudflare Pages (frontend) + Cloudflare Workers (API) + Cloudflare D1 (SQLite). The app currently looks up recipient keys directly from `keys.openpgp.org`. Future phases add `/api/register`, `/api/lookup/:email`, and an invitation email flow via SendGrid.
