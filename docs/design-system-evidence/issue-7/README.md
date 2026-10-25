# Issue #7 — Security content design-system alignment

Base: `4ee6e1a99d0e92563e035d851bcc06b87701cb43` · branch `feat/portfolio-customer-improvements` · combined route `/security` · pending independent review. Clean checkout verified before work. No commit, staging, deployment or issue closure in this stage.

## Scope and section audit

Applied [the content baseline](../../design-system.md) to the entire page shell and security presentation. No crypto, key lifecycle, network, storage, backend or shared Layout implementation changed. `src/lib/key-security.ts` remains the authoritative, **unchanged** source of all four safeguards and six limitations. Privacy-copy reconciliation remains #8's responsibility on this same route; no `/privacy` route was introduced.

| Section | Audit findings → implementation | Intentional exceptions / preservation |
| --- | --- | --- |
| Dark hero | Keep one h1 and descriptive lead; token spacing, explicit display line-height, brighter indigo text. Shared skip/header/footer/focus already exist. | Dark slate/indigo gradient is the baseline's intentional Security identity, not a new global theme. Existing title, description and hero wording retained. |
| What stays on your device (six cards) | Shared `MarketingSection`, reading lead, `.marketing-card` and grid; card text 13→14px, titles 15→16px; decorative emoji hidden from accessibility tree. | Green category tint/borders remain decorative. Heading states the category without color. All six local-item data objects are byte-for-byte unchanged for #8. |
| Private keys: protections and limits | Named section retains **both** `#private-key-security` and `#private-key-security-title`. Shared container/heading/card foundations. All shared list entries remain verbatim, in the original order. Lists and four guidance paragraphs increase to 16px / 1.7 line-height; 40rem guidance measure. Check/triangle icons, explicit h3s, solid-top vs dashed-outline borders distinguish safeguards from limits without relying on color. | Static disclosures, not live alerts, app controls or collapsed notices. All saved-vs-loaded, older-copy recovery, device/hardware and delivered-code/audit caveats remain visible and unchanged. Manual section markup preserves the existing heading ID rather than expanding the shared component API. |
| What reaches the cloud (six cards) | Named section and shared header/container/card shell; metadata increases 12→14px and uses stronger warning ink; long API destinations wrap; icons hidden. Link is natively underlined by shared marketing CSS. | Rich linked lead uses the existing shared CSS composition, not a new rich-text component API. Six cloud-item objects and lead copy unchanged for #8. This is presentation work, **not** privacy-accuracy sign-off. |
| What is never transmitted (seven items) | Named section, common reading shell; real `ul/li` instead of unrelated divs, 14px text, decorative SVGs hidden. The link to private-key caveats remains. | Red tint retained as a category treatment, not an error state. Text heading and list communicate the category without color. Seven strings and qualified lead unchanged. |
| How CryptDrop hardens your security (eight measures) | Shared `MarketingSection`/cards/grid, 16px h3 and 14px body, stronger information ink, consistent section rhythm. Every measure remains, including its caveats. One overclaim corrected with supervisor approval (below). | Flat information tint preserves the existing category. Decorative pale borders are not controls and need not meet control-boundary contrast. No certification claim added. |
| Source/app/guide supporting links | Shared section and native `MarketingCTA` links replace all inline styles. One primary app CTA and two secondary CTAs. Source link purpose names CryptDrop/GitHub; same three destination URLs. | Source now uses ordinary same-tab navigation, matching shared native CTA behavior; no new external-link API, hydration, forced new tab or unnecessary GitHub icon. Existing library/source prose retained. |
| Header/footer and route metadata | Existing shared marketing shell reused without edits. Current-route state, bypass link, link purpose and app/content separation regression-tested; collateral checks cover all routes. | No shared Layout/component/CSS changes. App and marketing remain separate surface catalogs. |

The full page has six named content sections and a hero header. Removed duplicated badge/card/header/action CSS and redundant category badges; category headings remain explicit. Security-specific grid uses `auto-fit` with `min(100%, 18rem)` minimum: two columns when sufficient reading width exists (including 640px default-text layout), one column at mobile or enlarged text. This avoids the narrow two-column disclosures seen during initial 200% text review. Long words wrap without truncation. No new reusable component or API was necessary; local noncolor disclosure treatment is intentionally domain-specific.

## Approved security accuracy correction

Original measure said matching-email validation “prevents the keyserver from returning a wrong or malicious key.” Audit found [validateKey](../../../code/frontend/src/lib/openpgp-helpers.ts#L178) checks the first user ID only, returns warnings and does not reject the key; missing email may not warn. [KeyLookupCard](../../../code/frontend/src/components/shared/KeyLookupCard.tsx#L74) displays warnings and still calls `onKeyFound`.

Supervisor approved renaming the measure **Public-key lookup warnings** and this exact bounded copy:

> Public-key lookup compares the first user ID with the searched email and can show an email-mismatch warning. A missing user ID may not trigger a warning. This check does not reject a mismatched key, prove its owner’s identity, or rule out a malicious key. Verify the fingerprint through a trusted channel.

This is a copy-only correction, not a runtime validation change. Regression assertions require warning-only, missing-user-ID and nonidentity limitations and reject the original prevention guarantee. Other privacy-focused claims—including broad local-only introduction language, registry success vs attempted registration, third-party destinations and invitation metadata—are retained for #8's source/owner review; they are not endorsed by this visual audit. No new retention, legal or security promises were invented.

## Screenshot evidence

[manifest.json](manifest.json) indexes **11 PNGs** with route/state, CSS viewport, actual image dimensions and SHA-256. BEFORE images were captured on unchanged base source via an isolated local dev server (4328), before source edits. AFTER images use local production preview (4329). Each image was opened for visual inspection. No keys, identities, files, emails or live service actions were needed.

| `/security` | BEFORE | AFTER |
| --- | --- | --- |
| Mobile 375×812 | [Full page](before-security-mobile.png) | [Full page](after-security-mobile.png) |
| Tablet 768×1024 | [Full page](before-security-tablet.png) | [Full page](after-security-tablet.png) |
| Desktop 1280×720 | [Full page](before-security-desktop.png) | [Full page](after-security-desktop.png) |

Additional AFTER evidence: [320px reflow](after-security-reflow.png), [200% root text at 768px](after-security-text-200.png), [visible keyboard focus](after-security-focus.png), [mobile private-key disclosure](after-security-disclosure-mobile.png), [desktop private-key disclosure](after-security-disclosure-desktop.png).

Full-page PNG height is not viewport height. Dev toolbar was removed from capture DOM only, after startup. For the two **isolated disclosure crops only**, sticky header/fixed skip link are hidden by Playwright screenshot styling to avoid screenshot stitching occlusion; they are present in full-page/focus views and all actual keyboard/anchor tests. No runtime source hides them. Native browser zoom is not claimed: 320px equivalent reflow and 200% root-font enlargement are tested substitutes, not OS/browser zoom.

## Browser coverage actually exercised

Initial live inspection used installed gstack browse CLI. Reproducible QA/captures use its installed Playwright/headless Chromium. Final results: [Security production checks](production-browser-results.json), [collateral shell checks](shared-shell-browser-results.json).

- `/security` at **320/375/768/1280px**: one h1, six named sections/h2s; every card/list item present; no document overflow; one/two-column layout as expected; current Security navigation state.
- Keyboard: Tab/Shift+Tab, skip-link Enter into main, header link order, then keyserver link → private-key caveat link → app/source/guide CTAs. Each visited link has 3px focus, clear of sticky header. Header navigation targets are at least 44px tall.
- Actual caveat-link click lands at preserved `#private-key-security`, below sticky header. Actual app/guide/logo clicks reach `/app`, `/how-it-works`, `/`.
- 200% root-font enlargement at 768px: one-column cards, no document or paragraph/list/h3 overflow. Separate line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph margin 2em overrides retain reflow.
- **26 representative rendered color pairs** pass AA normal/large text or 3:1 boundary/focus thresholds; conservative hero/gradient endpoint used. Includes limitations text/background, pale-category metadata, primary/secondary CTA and keyboard-focused outline, dashed limitation boundary. Shared script adds 23 header/footer/hover/control pairs.
- Reduced-motion emulation disables CTA transitions. No new automatic animation or hover transform.
- **Zero runtime page errors.** External source/keyserver hrefs checked, not remotely navigated or exercised. No key generation, lookup, registration, invitation or email operations.
- Collateral script exercises `/`, `/how-it-works`, `/security`, `/invite` (missing token), `/app?tab=encrypt` (empty), all four widths, with **40 checks / 23 color pairs**. Shared shell did not change.

Reproduce after `npm run build`:

```sh
npm run preview -- --host 127.0.0.1 --port 4329
BASE_URL=http://127.0.0.1:4329 node docs/design-system-evidence/issue-7/browser-checks.mjs
BASE_URL=http://127.0.0.1:4329 node docs/design-system-evidence/issue-7/capture-views.mjs after
BASE_URL=http://127.0.0.1:4329 node docs/design-system-evidence/issue-5/browser-checks.mjs
```

Scripts use installed `~/.agents/skills/gstack/node_modules/playwright/index.mjs`; `PLAYWRIGHT_MODULE` overrides it. Temporary results/manifests go to `/tmp/issue7-*` (collateral `/tmp/issue5-*`). The combined reviewed manifest is not automatically overwritten. Only run `before` against base source.

## Validation and limits

- `npm test`: **PASS — 12 files / 134 tests**, including six added regressions in `tests/marketing-patterns.test.ts` using actual built Astro output and the existing single-build harness: complete named sections/metadata, anchors, verbatim shared safeguards/limitations, all guidance caveats, list/icon semantics, all eight measures, approved warning-only correction, native CTA purposes/destinations, and responsive evidence hashes.
- `npm run typecheck`: **FAIL — same four demonstrably pre-existing errors**, reproduced before source edits and after: `functions/api/[[catchall]].ts:2` missing `Fetcher`; line 5 missing `PagesFunction` and implicit-any `context`; `tests/decrypt-signed.test.ts:12` passes `null` where optional `PrivateKey` is expected. Baseline: 119 files, 4 errors, 0 warnings, 91 hints; final: 121 files, 4 errors, 0 warnings, 92 hints. No new errors/warnings. Temporary logs `/tmp/issue7-before-typecheck.log` and `/tmp/issue7-typecheck.log`.
- `npm run build`: **PASS — five static pages**. Temporary log `/tmp/issue7-build.log`.
- Security browser checks: **PASS — 25 checks / 26 contrast pairs / zero page errors**. Collateral browser checks: **PASS — 40 checks / 23 pairs / zero page errors**.
- Source comparison: `localItems`, `cloudItems`, `neverSent` arrays byte-for-byte unchanged; `key-security.ts` unchanged. All four private-key guidance paragraphs retained. `git diff --check`: **PASS**. No staged files.

Initial QA harness assertions were corrected before final runs: focus color must be sampled on a keyboard-focused element, and three CTA elements require a specific locator. Initial isolated section captures exposed fixed-header stitching artifacts; recaptured with the documented screenshot-only style. These were harness/capture issues, not hidden runtime failures. Initial 200% two-column readability was improved with the rem-sensitive grid before final capture/checks.

Not an accessibility or security certification. No screen reader, OS high-contrast, Safari/Firefox, native browser zoom, external-service delivery, all app states or deployed security-header verification claimed. Pre-existing typecheck debt remains. Privacy claims remain for #8. Independent review is the next gate; no commit/close yet.
