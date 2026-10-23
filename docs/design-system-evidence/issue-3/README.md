# Issue #3: generation labels and passphrase responsibility

Base: `5700aeca284c3ff04008cd8426dff5333c73a640`, branch `feat/portfolio-customer-improvements`. Scope: KeyGenerateForm presentation/accessibility only; no cryptography, registration, key persistence, validation policy, or backup-gate changes.

## Visual evidence

All captures are full-page PNGs. Names identify the viewport, not the PNG height (the page grows to fit content). [manifest.json](manifest.json) records viewport, actual image dimensions, routes/states and SHA-256 checksums.

| State, `/app?tab=keyring` → Generate a New Key Pair | Mobile 375×812 | Tablet 768×1024 | Desktop 1280×720 |
| --- | --- | --- | --- |
| Before: empty, placeholder-only fields | [Before mobile](before-keyring-mobile.png) | [Before tablet](before-keyring-tablet.png) | [Before desktop](before-keyring-desktop.png) |
| After: empty, persistent labels and guidance | [After mobile](after-keyring-empty-mobile.png) | [After tablet](after-keyring-empty-tablet.png) | [After desktop](after-keyring-empty-desktop.png) |
| After: filled, labels/guidance/strength remain visible | [Filled mobile](after-keyring-filled-mobile.png) | [Filled tablet](after-keyring-filled-tablet.png) | [Filled desktop](after-keyring-filled-desktop.png) |

Additional reflow evidence: [320px filled form and focused Generate button](after-keyring-320.png); [200% root text-size emulation at 768px](after-keyring-text-200.png). Text resizing is an emulation, not a claim of native browser zoom or OS text scaling.

Before captures: local Astro dev server `http://localhost:4321`; removed the development-only `astro-dev-toolbar` element in the browser for unobscured evidence, without editing source. After captures: local production build served at `http://127.0.0.1:4322`. Before captures retain incidental Keyring navigation focus; filled after captures retain passphrase keyboard focus. No other UI was hidden. Filled data is synthetic (`Synthetic Example`, `synthetic@example.test`, a masked example-only passphrase). No keys were generated or sent to a server in browser QA.

## Browser checks actually exercised

Tool: installed gstack browse CLI, headless Chromium.

- Keyring: clicked each of the visible Name, Email address and Passphrase labels. `document.activeElement.labels[0].textContent` returned the corresponding field name each time.
- Keyboard: Name → Tab → Email address → Tab → Passphrase → Tab → Generate Keys & Download; Shift+Tab returned to Passphrase. Repeated forward traversal at 320px. Focus remained visible and controls scrolled into view.
- Accessibility snapshot named the inputs exactly Name, Email address, Passphrase. Filled-state DOM description combined the persistent help and `Strong` feedback. Clearing the passphrase with keyboard select-all/backspace left the help visible and `aria-describedby` pointing to the help alone.
- Widths 375, 768 and 1280: inspected full-page empty/filled screenshots. Identity fields stack when their available space is narrow, including tablet workspace; two columns remain at desktop. Labels and guidance wrap without clipping.
- At 320px: document width = viewport width = 320; all three fields were 246px wide with left edge 37px. No document horizontal overflow. This also exercises the equivalent reflow width of 1280px at 400%, not native zoom.
- At 768px with root font size 200%: document width remained 768px, help width 370px; generation labels/help/action remained available. Existing fixed sidebar/header text becomes cramped; broader shell text-resize remediation belongs to #4, not this field change.
- Guided setup: `/app?tab=wizard` → Decrypt a File → Generate a New Key Pair. Keyring and wizard forms were simultaneously mounted in separate islands; six field IDs were all unique (`_r10r_0_...` and `_r12r_2_...`). Each passphrase description referenced its own help. Visible wizard Name-label click then Tab focused Email address. No console errors during these form interactions after clearing the buffer.
- Console buffer also contained a KeyStatusPill `aria-current` hydration warning on direct Keyring-route loading, in the unchanged navigation component. No key-generation warning was observed. This task does not remediate navigation hydration.

## Automated validation

| Command | Result |
| --- | --- |
| `npx vitest run tests/key-generate-form.test.tsx tests/key-backup-components.test.tsx` | PASS: 2 files, 24 tests |
| `npm test` | PASS: 8 files, 85 tests |
| `npm run build` | PASS: 5 static pages |
| `npm run typecheck` | FAIL: 4 pre-existing errors, 0 warnings/hints; 76 files checked |
| `npm run typecheck` in an isolated archive of base HEAD | Same 4 errors, 0 warnings/hints; 74 files checked |
| `git diff --check` | PASS |
| `git diff --cached --name-only` | Empty; no staged files |

Base reproduction used `git archive 5700aeca284c3ff04008cd8426dff5333c73a640` extracted to `/tmp/cryptdrop-issue3-base.RpCTTV`, with a symlink to the existing node_modules, then `npm run typecheck`. No branch switch or edits to the worktree were needed. Logs remain outside the repo in `/tmp/cryptdrop-issue3-{focused,test,typecheck,base-typecheck,build}.log`.

Exact existing diagnostics:

- `functions/api/[[catchall]].ts:2:18` TS2304: Cannot find name `Fetcher`.
- `functions/api/[[catchall]].ts:5:25` TS2304: Cannot find name `PagesFunction`.
- `functions/api/[[catchall]].ts:5:53` TS7006: Parameter `context` implicitly has an `any` type.
- `tests/decrypt-signed.test.ts:12:79` TS2345: `null` is not assignable to `PrivateKey | undefined`.

New `tests/key-generate-form.test.tsx` adds 10 cases covering persistent labels/names/IDs, empty/filled/cleared descriptions and strength, multiple mounted forms, all existing validation branches, loading, trimmed generation arguments, both downloads, registration, backup gate, failure/retry and Back. Existing real backup-component integration now queries generation fields by label and still verifies the complete generate → backup verification → Done flow.

## Intentional exceptions and review limits

- Preserved the existing strength meter, colors, validation toasts, generation/download/registration behavior and post-generation backup verification. Strength/focus/input-boundary contrast debt is cataloged for #4; this is not a whole-form WCAG certification.
- Existing “Never sent to any server” copy is unchanged. The design-system baseline flags its public-registration discrepancy for the later claims/content review; this issue adds only the requested passphrase responsibility text.
- No manual screen-reader, Safari/Firefox, native zoom, real download/key-generation, network registration, or OS password-manager testing is claimed. Mocked component tests exercise generation/loading/download/registration behavior; existing integration tests exercise the backup gate.
- Independent review remains required. No commit, push, deployment, staging, or issue closure in this implementation stage.
