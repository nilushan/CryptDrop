# Issue #2: baseline visual and validation evidence

[Design system](../../design-system.md) · [capture manifest](manifest.json)

## Provenance and review gate

- Audited HEAD: `ee7e3085d7005cac68852c059286111cabdfdaaf`; branch `feat/portfolio-customer-improvements`; clean tracked/untracked status at stage start.
- Scope: documentation and documentation regression tests only. No runtime UI, crypto, storage, dependencies or security/privacy claims changed.
- Captures: local **production preview** at `http://127.0.0.1:4322`, gstack browse, HeadlessChrome 145.0.7632.6, scale 1. PNGs are viewport-only, not full-page coverage. Empty local state; no private keys, passphrases, real contacts or invitation tokens. Existing marketing illustration contains fictional data, not customer data.
- Before captures precede documentation edits; after captures follow the final documentation-stage production build. Six before/after pairs are **byte-identical** (SHA-256 in manifest), as expected for #2. After images were freshly captured, not copied from before files.
- Early dev-server exploratory captures were replaced with production-preview captures after noticing an in-flight fade/toolbar. Only settled production-preview screenshots are retained.
- Independent review must accept/amend the baseline before #3 starts. Nothing committed, staged, closed, pushed or deployed by this stage.

## Representative before / after references

| Route/state | Viewport | Before | After |
| --- | --- | --- | --- |
| `/app?tab=encrypt`, empty recipient, no private key | Mobile 375×812 | [Before](before-app-mobile.png) | [After](after-app-mobile.png) |
| Same | Tablet 768×1024 | [Before](before-app-tablet.png) | [After](after-app-tablet.png) |
| Same | Desktop 1280×720 | [Before](before-app-desktop.png) | [After](after-app-desktop.png) |
| `/`, homepage hero and CTAs | Mobile 375×812 | [Before](before-marketing-mobile.png) | [After](after-marketing-mobile.png) |
| Same | Tablet 768×1024 | [Before](before-marketing-tablet.png) | [After](after-marketing-tablet.png) |
| Same | Desktop 1280×720 | [Before](before-marketing-desktop.png) | [After](after-marketing-desktop.png) |

Additional audited-state references (not before/after pairs, since no UI implementation occurs):

| Reference | Route / state / viewport |
| --- | --- |
| [Keyring choices](reference-keyring-desktop.png) | `/app?tab=keyring`, no key, disclosure collapsed, 1280×720 |
| [Generation form desktop](reference-key-generation-desktop.png) | Same route, Generate clicked, empty fields, 1280×720 |
| [Generation form mobile](reference-key-generation-mobile.png) | Same route/state, form scrolled into view, 375×812; demonstrates clipped placeholder and narrow two-column inputs |
| [Guide hero](reference-how-it-works-desktop.png) | `/how-it-works`, hero and first chapter, 1280×720 |
| [Guide table mobile](reference-guide-table-mobile.png) | `/how-it-works`, analogy table scrolled below sticky header, 375×812; right column extends beyond viewport |
| [Security & Privacy](reference-security-desktop.png) | `/security`, combined content hero and local section, 1280×720 |
| [Invitation error](reference-invite-desktop.png) | `/invite`, no token, missing-link error with manual setup link, 1280×720 |

## Browser checks actually exercised

All three viewports above were measured with `innerWidth` and `document.documentElement.scrollWidth`:

| Route/state | 375px | 768px | 1280px |
| --- | --- | --- | --- |
| `/`, hero and document dimensions | 375 | 768 | 1280 |
| `/how-it-works`, hero and analogy table dimensions | **443** | 768 | 1280 |
| `/security`, combined page | 375 | 768 | 1280 |
| `/invite`, missing token | 375 | 768 | 1280 |
| `/app?tab=encrypt`, empty | 375 | 768 | 1280 |
| `/app?tab=decrypt`, no key/file | 375 | 768 | 1280 |
| `/app?tab=addressbook`, empty contacts | 375 | 768 | 1280 |
| `/app?tab=wizard`, branch choices | 375 | 768 | 1280 |
| `/app?tab=keyring`, no key/choices | 375 | 768 | 1280 |

- All five app views: exactly one non-hidden panel. Tablist orientation horizontal at 375px, vertical at 768/1280px.
- Desktop: focus Encrypt tab, ArrowDown selects/focuses Decrypt, End goes to Guided setup, Home returns to Encrypt. Mobile: ArrowRight selects/focuses Decrypt. Clicking **Load matching key** in the visible Decrypt panel transfers focus to `tab-keyring` and leaves one visible panel.
- Generate was opened by its existing button; DOM inspection confirmed all three inputs have zero associated labels and no aria-label. At 375px name/email input client widths are 143px each; generation form document width remains 375px.
- Informational site links disappear on mobile as described in the gap register. Invitation's missing-token screen contains no h1. These are documented existing gaps, not fixed in #2.
- Cleared the persistent browser console buffer, then revisited all five routes and repeated final captures: **no console errors**. An older dev-session hydration warning in the initial shared buffer was not attributed to these preview routes.
- Computed opaque sRGB contrast for documented foreground/background pairs using the WCAG relative-luminance formula. Ratios in the design document are reference calculations, not an exhaustive rendered contrast audit.

### Intentional differences and limits

App uses a light workspace/sidebar and smaller controls; marketing uses gradient heroes, bigger headings, art and spacious sections. Keyring's blue-teal private material and green public material remain distinct. Security's dark hero and explicit local/network/never categories are intentional. Invitation retains its compact neutral card. Missing-key warnings remain actionable, not navigation blockers.

The guide's mobile document overflow, unlabeled inputs, low-contrast legacy colors and hidden mobile informational links are **known baseline defects** assigned to follow-up issues. Before/after equality does not imply those defects are acceptable in the later implementation.

Not exercised here: live key lookup/registration/invitation/email services, valid/expired/used invitation rendering, loaded/saved keys, backup verification, encrypt/decrypt end-to-end browser flows, full story-page visual inspection at every scroll position, screen readers, high-contrast mode, zoom/text-spacing overrides, reduced-motion emulation, Firefox, Safari or physical devices. Those states are inventoried from source, not represented as browser-tested. This documentation-only issue does not claim full accessibility conformance.

## Reproduce representative captures

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4322
# Separate terminal; gstack browse was already installed:
B="$HOME/.Codex/skills/gstack/browse/dist/browse"
"$B" goto 'http://127.0.0.1:4322/app?tab=encrypt'
"$B" viewport 375x812
# Let hydration and entry fade settle (at least one second).
sleep 1
"$B" js 'window.scrollTo(0,0)'
"$B" screenshot --viewport /tmp/cryptdrop-app-mobile.png
# Repeat at 768x1024 and 1280x720; repeat for http://127.0.0.1:4322/.
"$B" js 'JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})'
```

Manifest records route/state, viewport and SHA-256 per retained file. `tests/design-system.test.ts` checks README discoverability, local Markdown source/evidence links, the required before/after viewport matrix, PNG dimensions and hashes. It does not assert that future UI must remain visually unchanged.

## Command validation

Before documentation/test edits, while tracked source was still exactly HEAD:

| Command | Result |
| --- | --- |
| `npm test` | PASS: 6 files, 72 tests |
| `npm run typecheck` | FAIL: 4 errors, 0 warnings, 0 hints (73 files); exact diagnostics below |
| `npm run build` | PASS: 5 static routes |

Final-stage validation:

| Command | Result |
| --- | --- |
| `npm test` | PASS: 7 files, **75 tests**; includes 3 new documentation/evidence regression tests |
| `npm run typecheck` | FAIL: the **same 4 pre-existing errors**, 0 warnings, 0 hints (74 source files, including the new test) |
| `npm run build` | PASS: **5 static routes**, no runtime bundle changes |
| `git diff --check` | PASS |
| `git diff --exit-code -- src packages functions public package.json package-lock.json` | PASS: no runtime/dependency diff |
| `test -z "$(git diff --cached --name-only)"` | PASS: no staged files |

The first new documentation-test attempt failed because Vitest's default jsdom environment rewrote the filesystem URL. The test now explicitly uses the Node environment; the full suite then passed. No failing test was skipped. A typecheck run with generated `dist/` present reported the same four errors plus 90 generated-JavaScript hints. To compare source-only diagnostics with the pre-build baseline, `dist/` was temporarily moved to `/tmp`, the **same `npm run typecheck`** was rerun, then the build was restored; result: four errors, zero warnings/hints. No tsconfig or runtime file was changed to hide diagnostics.

Pre-existing typecheck diagnostics reproduced **before any documentation or test changes**, also listed in the older [workspace refresh notes](../../APP-UX-REFRESH.md):

```text
functions/api/[[catchall]].ts:2:18  ts(2304) Cannot find name 'Fetcher'.
functions/api/[[catchall]].ts:5:25  ts(2304) Cannot find name 'PagesFunction'.
functions/api/[[catchall]].ts:5:53  ts(7006) Parameter 'context' implicitly has an 'any' type.
tests/decrypt-signed.test.ts:12:79 ts(2345) Argument of type 'null' is not assignable to parameter of type 'PrivateKey | undefined'.
```

No unrelated type/crypto/server fix is included. Temporary stdout logs are outside the repository (`/tmp/cryptdrop-issue2-*`); the durable results and diagnostic details are recorded here.
