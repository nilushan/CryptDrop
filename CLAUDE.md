# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Astro dev server
npm run build        # Production build → dist/
npm test             # Run all tests (vitest, one-shot)
npm run test:watch   # Vitest in watch mode
npm run typecheck    # Type-check app.js + tests via tsconfig.checkjs.json
```

Run a single test file:
```bash
npx vitest run tests/encrypt-flow.test.ts
```

Run tests matching a name pattern:
```bash
npx vitest run --reporter=verbose -t "should save contact"
```

## Architecture

CryptDrop is a **fully client-side PGP encryption tool** deployed as a static Astro 5.x site. All encryption, decryption, key generation, and file handling happens in the browser — the server never sees private keys or unencrypted files.

### Key structural constraint

`public/js/app.js` is loaded via `<script is:inline src="/js/app.js">` in `src/pages/app/index.astro`. It **must stay in `public/js/`** because the test suite loads it with `vm.runInNewContext(appJs, window)` to inject the entire app into the jsdom context. Moving it to `src/` would break all tests without a major test infrastructure rewrite.

### How the app works

- `public/js/app.js` — the entire application (~800 lines). Exposes all functions as globals on `window`. Manages a single `state` object (`AppState`) tracking keys, files, current flow, and step.
- `public/js/openpgp.min.js` — vendored OpenPGP.js v6 CDN bundle. Never modify.
- `src/pages/app/index.astro` — the app shell. All screens are `<section>` elements with `id="screen-*"` toggled with `.hidden` class. Screen IDs are defined by the `FLOW_SCREENS` constant in `app.js`.
- Wizard flow: two paths (`encrypt` / `decrypt`) driven by `startFlow()` → `advanceStep()` → `navigateBack()`. Each path has its own ordered screen list in `FLOW_SCREENS`.

### TypeScript setup (non-standard)

`tsconfig.json` (Astro's config, do not modify) handles `.astro` files. A separate `tsconfig.checkjs.json` type-checks `app.js` using `checkJs: true` without emitting. Types for the app are in `src/types/app.d.ts` (ambient, globally available — no import needed). The CDN `openpgp` global is declared in `src/types/openpgp-global.d.ts`.

### Test setup pattern

`tests/setup.ts` exports `setupDOM()` which:
1. Sets `document.body.innerHTML` to a static HTML mirror of the app's screen structure
2. Mocks `localStorage`
3. Injects a mock `openpgp` object (all key operations return predictable mock values)
4. Runs `app.js` via `vm.runInNewContext` so all its globals are on `window`

When adding new DOM elements to `app.js`, add matching elements to `STATIC_TEST_HTML` in `tests/setup.ts` and add new globals to the `Window` interface augmentation.

### Planned backend (not yet built)

Per `docs/ROADMAP.md`: Cloudflare Pages (frontend) + Cloudflare Workers (API) + Cloudflare D1 (SQLite). The app currently looks up recipient keys directly from `keys.openpgp.org`. Future phases add `/api/register`, `/api/lookup/:email`, and an invitation email flow via SendGrid.
