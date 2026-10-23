# Issue #4 app component alignment

Base HEAD: `3f08386d7e7c8de49067e94088a06fa95e50dfcc`; clean `feat/portfolio-customer-improvements` at start. **Implementation ready for independent review, not committed or closed.**

## Checklist

- [x] Read live issue/comments and #2 baseline. [Exhaustive audit](audit.md): all 42 component/hook files and shell/style owners, intentional exceptions, consumer checks. Starting estimate of 44 corrected to actual filesystem inventory.
- [x] Extract semantic tokens and scoped app catalog; share feedback with invitation without importing app layout; remove unused legacy styling.
- [x] Reuse #3 FormField and existing actions/notices/results/files/key/contact controls. Align typography, targets, boundaries, status and durable error patterns without changing stores/crypto/storage/API behavior.
- [x] Exercise representative flows and keyboard/reflow/contrast checks using local synthetic data.
- [x] Retain representative before/after screenshots at mobile/tablet/desktop plus populated, recovery, error and result states.
- [x] Run full tests, typecheck and production build; record demonstrably pre-existing type errors separately.
- [ ] Independent review gate (no staging, commit, push, deployment or issue closure here).

## Reviewable visual evidence

66 full-page PNGs indexed in [manifest.json](manifest.json): 18 BEFORE at base HEAD, 18 matching AFTER empty-state views, and 30 AFTER flow/state views. Manifest records route/state, viewport, actual image dimensions and SHA-256. Viewport is not PNG height: full pages expand with content.

| Surface/state | Mobile 375×812 | Tablet 768×1024 | Desktop 1280×720 |
| --- | --- | --- | --- |
| Encrypt, before | [Mobile](before-encrypt-mobile.png) | [Tablet](before-encrypt-tablet.png) | [Desktop](before-encrypt-desktop.png) |
| Encrypt, after | [Mobile](after-encrypt-mobile.png) | [Tablet](after-encrypt-tablet.png) | [Desktop](after-encrypt-desktop.png) |
| Decrypt, before | [Mobile](before-decrypt-mobile.png) | [Tablet](before-decrypt-tablet.png) | [Desktop](before-decrypt-desktop.png) |
| Decrypt, after | [Mobile](after-decrypt-mobile.png) | [Tablet](after-decrypt-tablet.png) | [Desktop](after-decrypt-desktop.png) |
| Keyring choices, before | [Mobile](before-keyring-mobile.png) | [Tablet](before-keyring-tablet.png) | [Desktop](before-keyring-desktop.png) |
| Keyring choices, after | [Mobile](after-keyring-mobile.png) | [Tablet](after-keyring-tablet.png) | [Desktop](after-keyring-desktop.png) |
| Contacts empty, before | [Mobile](before-contacts-mobile.png) | [Tablet](before-contacts-tablet.png) | [Desktop](before-contacts-desktop.png) |
| Contacts empty, after | [Mobile](after-contacts-mobile.png) | [Tablet](after-contacts-tablet.png) | [Desktop](after-contacts-desktop.png) |
| Wizard home, before | [Mobile](before-wizard-mobile.png) | [Tablet](before-wizard-tablet.png) | [Desktop](before-wizard-desktop.png) |
| Wizard home, after | [Mobile](after-wizard-mobile.png) | [Tablet](after-wizard-tablet.png) | [Desktop](after-wizard-desktop.png) |
| Missing invitation, before | [Mobile](before-invite-mobile.png) | [Tablet](before-invite-tablet.png) | [Desktop](before-invite-desktop.png) |
| Missing invitation, after | [Mobile](after-invite-mobile.png) | [Tablet](after-invite-tablet.png) | [Desktop](after-invite-desktop.png) |
| Backup verified, after | [Mobile](after-backup-verified-mobile.png) | [Tablet](after-backup-verified-tablet.png) | [Desktop](after-backup-verified-desktop.png) |
| Loaded Keyring, after | [Mobile](after-keyring-loaded-mobile.png) | [Tablet](after-keyring-loaded-tablet.png) | [Desktop](after-keyring-loaded-desktop.png) |
| Import error, after | [Mobile](after-import-error-mobile.png) | [Tablet](after-import-error-tablet.png) | [Desktop](after-import-error-desktop.png) |
| Contacts populated, after | [Mobile](after-contacts-populated-mobile.png) | [Tablet](after-contacts-populated-tablet.png) | [Desktop](after-contacts-populated-desktop.png) |
| Encrypt result, after | [Mobile](after-encrypt-result-mobile.png) | [Tablet](after-encrypt-result-tablet.png) | [Desktop](after-encrypt-result-desktop.png) |
| Verified decrypt, after | [Mobile](after-decrypt-verified-mobile.png) | [Tablet](after-decrypt-verified-tablet.png) | [Desktop](after-decrypt-verified-desktop.png) |
| Valid invitation, after | [Mobile](after-invite-valid-mobile.png) | [Tablet](after-invite-valid-tablet.png) | [Desktop](after-invite-valid-desktop.png) |

Additional captures: [filled generation mobile](after-generation-filled-mobile.png), [backup error](after-backup-error-desktop.png), [invitation sent](after-contact-invitation-sent-desktop.png), [guided encrypt result](after-wizard-encrypt-result-desktop.png), [guided decrypt mobile](after-wizard-decrypt-mobile.png), [200% root text emulation](after-keyring-text-200-tablet.png), and invitation [expired](after-invite-expired-desktop.png), [already used](after-invite-accepted-desktop.png), [API failure](after-invite-failure-desktop.png). Prior focused generation references remain in [#3 evidence](../issue-3/README.md).

All screenshots use local Astro at `http://127.0.0.1:4321`. The development-only `astro-dev-toolbar` was removed from the DOM, not source, for unobstructed captures. Flow captures scroll to top and wait for toasts to expire; no app UI is hidden. The generated identity is `Synthetic Example <synthetic@example.test>`; all files and passphrases are synthetic. No private key armor or real user data is captured or stored here. Private downloads stay in temporary browser paths; only public fingerprints and masked example passphrases appear in images.

## Browser checks actually exercised

Tools: installed gstack browse CLI for initial inspection, installed gstack Playwright/headless Chromium for repeatable interactions/screenshots. [browser-results.json](browser-results.json) records assertions and zero runtime page errors. [browser-flows.mjs](browser-flows.mjs), [capture-views.mjs](capture-views.mjs) and [check-contrast.mjs](check-contrast.mjs) are reviewable QA scripts, not runtime dependencies.

- `/app?tab=encrypt|decrypt|keyring|addressbook|wizard`: one visible panel; desktop Down/End/Home and mobile Right select the expected tab. Cross-panel Load matching key action moves focus out of the hidden panel. Existing navigation tests also cover other arrows/roving tabindex/popstate.
- Keyring: generation label click focuses passphrase, Tab reaches Generate. Real local Curve25519 generation triggers both downloads. Done stays disabled until wrong/correct backup attempts resolve; verification clears the passphrase. Remember → reload → wrong/correct saved-passphrase restore → Forget works. Importing the synthetic key with wrong then correct passphrase retains error/help and succeeds on retry.
- Contacts: public-file import, full fingerprint, populated layout, fixture refresh, missing lookup → invitation sending/sent. Recipient/sender selection uses shared contact controls. Regression tests cover removal and filtered-empty state.
- Direct unsigned encryption and guided signed encryption use the same native upload/result controls. Signed decrypt with sender key reports verified; downloaded plaintext bytes match the synthetic original exactly. Unsigned decrypt has no verified label. History list and Clear work. Guided decrypt Continue and shared panel render correctly. Wizard step headings receive focus after transitions.
- `/invite` missing, and `/invite?token=synthetic|expired|accepted|failure`: correct heading/status/error/setup fallback. Valid invitation forwards its encoded token to Keyring. API/directory/email requests are intercepted with local fixtures; real remote-service success is not claimed. Actual PGP work runs in the browser; no helper or storage routine is mocked there.
- At 320 CSS px, generation, populated contacts, decrypted results, wizard decrypt and every invitation fixture have document width equal to viewport width. At 768px with root font size 200%, loaded Keyring has no document overflow; full fingerprint/identity/help/actions remain available. This is text-resize emulation and equivalent reflow width, not native 400% browser zoom.
- [contrast-results.json](contrast-results.json): computed token-backed app patterns measured in browser. Normal text pairs all ≥4.5:1; input/drop boundaries ≥3:1. Primary white/indigo 6.29:1; public white/green 5.48:1; vault white/teal 7.05:1; info/success/warning/error text 8.88/6.81/6.61/7.30:1; base input boundary 4.83:1. Focus measured 3px indigo with 4px offset; invitation fallback focus also 3px. Reduced-motion emulation returns `animation-name: none` on app panels. Measurements cover the named primitives, not an accessibility certification of all marketing or all transient browser/OS states.

Reproduction from repository root, with Astro dev running at port 4321:

```sh
node docs/design-system-evidence/issue-4/capture-views.mjs after
node docs/design-system-evidence/issue-4/browser-flows.mjs
node docs/design-system-evidence/issue-4/check-contrast.mjs
```

Uses `~/.agents/skills/gstack/node_modules/playwright/index.mjs` by default; set `PLAYWRIGHT_MODULE` to another installed Playwright ES module path. Scripts write temporary manifests/results to `/tmp/issue4-*.json` and captures to this directory. Only run `before` against the base source. Re-running synthetic key generation changes fingerprints/checksums; regenerate the combined manifest before running evidence-integrity tests.

## Automated validation

| Command | Exact result |
| --- | --- |
| `npm test` | PASS: 11 files, 116 tests (review follow-up) |
| `npx vitest run tests/app-patterns.test.tsx tests/invite-accept-page.test.tsx tests/key-backup-components.test.tsx` | PASS: 3 files, 42 tests (review follow-up) |
| `npm run typecheck` before any edits | FAIL: same 4 source errors as #3; generated dist added hints only |
| `npm run typecheck` after edits, with ignored generated dist temporarily moved outside repo | FAIL: 82 source/test/evidence-script files, 4 pre-existing errors, 0 warnings, 0 hints |
| `npm run build` | PASS: 5 static pages |
| Browser flows and contrast scripts | PASS; zero runtime page errors in recorded flows |
| Local `npm run preview -- --host 127.0.0.1 --port 4324` + Chromium smoke assertions | PASS: all five panels, mobile reflow, import label/theme and missing invitation; no runtime page errors |
| `git diff --check` | PASS |
| `git diff --cached --name-only` | Empty; no staged files |

Exact unchanged diagnostics: `functions/api/[[catchall]].ts:2:18` missing `Fetcher`; `:5:25` missing `PagesFunction`; `:5:53` implicit-any `context`; `tests/decrypt-signed.test.ts:12:79` null not assignable to optional PrivateKey. These were reproduced on the clean base before edits, and independently documented in #3. No new typecheck errors are accepted or hidden. Temporary logs are outside the repo at `/tmp/issue4-*.log`.

Tests added: `app-patterns.test.tsx` (22 cases), `invite-accept-page.test.tsx` (6), `app-design-evidence.test.ts` (3). Existing backup-component test now selects import by its visible label instead of placeholder. Existing generation, backup/security, navigation, signed-decrypt and utility tests remain in the full suite.

## Independent review follow-up

- Confirmed and fixed P1: `role="status"` on ResultState's h3 replaced its native heading role. The existing h3 now uses `aria-live="polite"` and `aria-atomic="true"`, preserving heading navigation and announcement intent without changing visible layout. Two regression cases assert level-three headings and live attributes for both encryption and decryption; the existing filename/action case also queries the heading.
- Browser flow assertions now discover direct and guided results by heading role. Re-ran the full synthetic flow sequence with zero runtime page errors; refreshed only the seven affected result PNGs (direct Encrypt and verified Decrypt at mobile/tablet/desktop, guided Encrypt desktop), and merged their dimensions/hashes into the existing 66-image manifest. Screenshots alone cannot demonstrate accessible roles; component/browser assertions provide that evidence. Synthetic keys were regenerated, so refreshed public fingerprints can differ from earlier captures.
- Follow-up validation: 116 full-suite tests, 42 focused tests and five-page build pass. Typecheck still reports exactly the four baseline errors listed above (82 files, zero warnings/hints with ignored generated `dist` temporarily moved and restored). Running with `dist` present additionally produces 90 generated-bundle hints, not new source diagnostics. Logs: `/tmp/issue4-fix1-*.log`. Updated browser evidence is in `browser-results.json`; the temporary capture-filtered runner is `/tmp/issue4-fix1-browser.mjs`, derived from the checked-in flow script solely to skip unrelated screenshots.
- Optional review polish (wizard focus outline near the sticky header) remains unchanged; this follow-up is limited to the result-heading blocker. No staged files, commit or closure; independent re-review is required.

See [audit.md](audit.md#intentional-exceptions-and-limits) for deliberate design/security boundaries and untested environments. No screen-reader, native zoom, OS high-contrast, Safari/Firefox, live keyserver/email or password-manager sync coverage is claimed.
