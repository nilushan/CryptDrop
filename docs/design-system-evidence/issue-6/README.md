# Issue #6: How It Works marketing alignment

Base: `8fdcad0d47590eb52a0edf7f67d768050f60b3d6` on `feat/portfolio-customer-improvements`; checkout clean at start. Implementation only; independent review is required before commit/closure. [Live issue](https://github.com/nilushan/CryptDrop/issues/6).

## Complete section audit

| Section | Changes / checklist evidence | Intentional exceptions |
| --- | --- | --- |
| Hero | Original title/description metadata and h1 preserved. Shared 56rem container, readable ink/muted tokens, 36/44px display and 18px lead; 48/64px spacing. Intro now qualifies the exposure problem. | Warm problem gradient remains guide-specific, not homepage hero art. |
| Modern problem | Named `MarketingSection`, readable 16px narrative, shared card foundations, labelled risk list and decorative emoji. Existing illustration has descriptive alt and intrinsic dimensions. Transport-encryption qualification replaces inaccurate blanket claims. | Warm scene background retained; static cards are not app controls. |
| Old-world problem | Named section and lead, h3 under chapter h2, original scroll scene and narrative sequence. Threat cards use same catalog and list treatment. | Warm-to-cool transition and reversed desktop scene remain story-specific. |
| Padlock explanation / all nine steps | Named chapter, explicit simplified-analogy qualification, ordered list with explicit list role, step labels and h3s; each original illustration remains in original DOM sequence with a distinct scene alternative. 16px prose, token spacing, alternating desktop pairs and single-column mobile. | This is not app workflow progress. Existing story art stays; narrative text supplies explanations and caveats independently of baked-in text/imagery. Simple decorative separators replace connector lines; no information is lost. |
| OpenPGP explanation | Named chapter, library/standard distinction, local file crypto and network-service distinction, optional-signature/trusted-fingerprint explanation, purpose-named `/security` link. Existing summary illustration has a descriptive alt; adjacent prose and table explain its concepts. | Pale green chapter background signals a new chapter, not a verification status or certification. No new security/privacy policy or crypto behavior. |
| Analogy map | Existing shared table styles in a named, described, focusable local scroll region; visible arrow-key/scroll hint, caption, three column headers and six row headers. Removed local nowrap/min-content document overflow. | Table intentionally retains 42rem minimum width to preserve relationships; it scrolls **locally**, not at document level. |
| Final CTA | Named section and shared native `MarketingCTA` to `/app`; approved file-specific wording. | One primary CTA is sufficient here; no new route or app controls. |
| Header/footer/navigation | Existing #5 shell unchanged. Skip link, named main, route-current indicator, focus and mobile access inherited. | No shared component/API/layout edits were needed. Cross-route production checks still run below. |

No existing meaningful page anchors were removed: base guide had no local IDs. New stable chapter IDs are `problem`, `old-world`, `padlock-solution`, `openpgp`, `start-encrypting`. Page route, metadata, all original image URLs, nine-step order, logo/navigation and app destination remain. No hydration, new dependencies, framework changes, key handling or storage changes.

## Supervisor-approved accuracy reconciliation

The supervisor approved bounded, source-backed corrections before implementation. This is not authority for new policy commitments or universal security guarantees.

| Before | Implemented qualification / source |
| --- | --- |
| Every router/relay can read files; “Normal email and file sharing offer no protection” | Transport encryption can protect travel; providers with readable copies and compromised endpoints may expose them. No blanket assertion that email/cloud services lack E2EE. Approved wording from supervisor. |
| “Exactly”/“precisely” how encryption works | Padlocks and wax seals are explicitly a **simplified analogy** for the roles of keys and optional signatures, not exact OpenPGP mechanics. [Local crypto and signature implementation](../../../code/frontend/src/lib/openpgp-helpers.ts#L68). |
| Everyone always signs; signature proves certain identity; decrypting implies authenticity | Bob chooses to sign; signature checks use the chosen sender public key, may fail, and do not establish identity alone. Independently check fingerprints via a trusted channel. Unsigned and decrypted are not verified. [Optional signing UI](../../../code/frontend/src/components/encrypt/QuickEncryptPanel.tsx#L168), [verification owner](../../../code/frontend/src/components/shared/DecryptFilePanel.tsx#L74), [signature handling](../../../code/frontend/src/lib/openpgp-helpers.ts#L113). |
| Bob cannot access any copy after encrypting; hidden from everyone without caveats | Distinguish encrypted output from Bob's original copy; retain trusted-device/private-key responsibility. [File input/output](../../../code/frontend/src/lib/openpgp-helpers.ts#L68), [existing protection limits](../../../code/frontend/src/lib/key-security.ts). |
| Keyserver is the only directory; key lookup establishes identity | CryptDrop registry, keys.openpgp.org fallback; lookup by email is not identity proof. [Frontend lookup chain](../../../code/frontend/src/lib/openpgp-helpers.ts#L136), [server lookup](../../../code/backend/src/routes/lookup.ts#L10). |
| “Without anything ever leaving your device”; “No servers” | File crypto is local; generation asks name/email and attempts public-key/identity registration; lookup/invitations use network services. Links `/security` for limits/details. [Generation registration](../../../code/frontend/src/components/keys/KeyGenerateForm.tsx#L67), [API payloads](../../../code/frontend/src/lib/api.ts#L14), [register route](../../../code/backend/src/routes/register.ts#L9), [invitation route](../../../code/backend/src/routes/invite.ts#L10). |
| Entire-app-local closing claim | Approved CTA: “Encrypt files in your browser, then share the encrypted result using your preferred channel.” |

## Screenshot evidence

[manifest.json](manifest.json) indexes 10 PNGs with route, state, viewport, actual dimensions and SHA-256. All images were opened for visual review. No real keys, files, identities or live email requests were used. The people/documents shown are existing illustrative artwork.

| `/how-it-works` | BEFORE | AFTER |
| --- | --- | --- |
| Mobile 375×812 | [Full guide](before-guide-mobile.png) | [Full guide](after-guide-mobile.png) |
| Tablet 768×1024 | [Full guide](before-guide-tablet.png) | [Full guide](after-guide-tablet.png) |
| Desktop 1280×720 | [Full guide](before-guide-desktop.png) | [Full guide](after-guide-desktop.png) |

Additional AFTER evidence: [320px reflow](after-guide-reflow.png), [200% root text at 768px](after-guide-text-200.png), [table scrolled right with visible focus](after-guide-table-scrolled.png), [desktop keyboard focus](after-guide-focus.png).

Full-page image height is not viewport height. BEFORE mobile PNG is 443px wide despite 375px viewport (baseline document overflow); AFTER is exactly 375px. Every image is decoded before capture, including below-fold lazy images. BEFORE is captured against the unchanged base; final AFTER is local production preview. Dev toolbar removed from DOM only for unobstructed captures, not from source.

## Browser checks actually exercised

Installed gstack browse CLI used for initial live inspection, and its installed Playwright/headless Chromium for reproducible checks and captures. Final production guide results are in [production-browser-results.json](production-browser-results.json); collateral production results in [shared-shell-browser-results.json](shared-shell-browser-results.json).

- Guide at 320/375/768/1280: one h1, five h2 chapter headings, nine ordered steps, twelve successfully loaded meaningful images, six table row headers, correct current-route link; document width equals viewport.
- Keyboard: skip link Enter transfers focus into main; Tab through logo/Guide/Security/App in order with 3px focus and 44px header targets. From main, Tab reaches security disclosure, analogy region, app CTA and footer links. Focus is not hidden under sticky header. Local table ArrowRight scrolling exercised at mobile widths.
- Original step image/narrative DOM order preserved at all widths; reverse image order is presentation only above 768px. Screenshot review covers every chapter and every step at mobile/tablet/desktop.
- 200% root text enlargement and separate WCAG-style line/letter/word/paragraph spacing at 768px retain document reflow. Root font emulation and equivalent 320px layout are **not native browser 400% zoom**.
- Twenty rendered representative text contrasts meet normal 4.5:1 / large 3:1 thresholds. Conservative gradient endpoints used. Primary white/indigo is 6.29:1. Cross-route script additionally checks 23 contrast pairs including focus/table boundaries (3:1 minimum), header, footer and hover CTA colors.
- Reduced-motion emulation disables CTA transition. Image hover transforms have been removed entirely, for everyone; no automatic animation or animated connector remains.
- Actual clicks: guide CTA → `/app`, network disclosure → `/security`, logo → `/`. Collateral checks exercise homepage → guide/app/security and shell modes/navigation at all four widths on `/`, `/how-it-works`, `/security`, `/invite` (missing token), `/app?tab=encrypt` (empty). No shared shell source changed.
- Zero runtime page errors in successful final production checks. No real keyserver, registry, invitation-email, crypto or storage operations exercised.

Reproduce against an isolated local preview (build first):

```sh
npm run preview -- --host 127.0.0.1 --port 4327
BASE_URL=http://127.0.0.1:4327 node docs/design-system-evidence/issue-6/browser-checks.mjs
BASE_URL=http://127.0.0.1:4327 node docs/design-system-evidence/issue-6/capture-views.mjs after
BASE_URL=http://127.0.0.1:4327 node docs/design-system-evidence/issue-5/browser-checks.mjs
```

Scripts use installed `~/.agents/skills/gstack/node_modules/playwright/index.mjs` (`PLAYWRIGHT_MODULE` overrides). Temporary results/manifests go to `/tmp/issue6-*` (collateral `/tmp/issue5-*`). Only run `before` on the base source. Reviewed combined manifest is deliberately not overwritten automatically.

## Validation and limitations

- `npm test`: **PASS, 12 files / 128 tests**. Five added guide/evidence regressions in `tests/marketing-patterns.test.ts` exercise actual built Astro output: chapter/heading/link/metadata contracts, complete step/artwork sequence, table semantics, approved claim qualifications, responsive evidence hashes. They reuse the existing single temporary-build harness.
- `npm run typecheck`: **FAIL, demonstrably pre-existing four errors**, reproduced before source edits and unchanged after: `functions/api/[[catchall]].ts` missing `Fetcher` and `PagesFunction` and implicit-any `context`; `tests/decrypt-signed.test.ts:12` passes null to optional PrivateKey. Final 119 files, four errors, zero warnings, 91 hints; baseline 117 files, four errors, zero warnings, 90 hints. Logs `/tmp/issue6-before-typecheck.log`, `/tmp/issue6-typecheck.log`. No change-caused diagnostics.
- `npm run build`: **PASS**, all five static routes. Log `/tmp/issue6-build.log`.
- Guide browser checks: **PASS, 25 checks / 20 contrast pairs / zero page errors**, local production preview. Collateral script: **PASS, 40 checks / 23 pairs / zero page errors**, all five routes.
- `git diff --check`: **PASS**. `git diff --cached --name-only`: empty; no staged files, commit or closure.

During implementation, a second concurrent Astro build harness collided on `.astro` output; consolidated guide tests into the existing marketing build harness, not a global test-configuration change. A documentation-link test correctly failed while this README was not yet written. Initial dev checks against pre-existing shared port 4321 / active build cache encountered stale styles, and a later dev check during `.astro` regeneration was invalid; final evidence/checks use an isolated **production** preview on 4327, not those transient results.

Not an accessibility certification. No screen-reader, OS high-contrast, Safari/Firefox, native browser zoom, live network-service, offline reload or full app-state coverage is claimed. Existing illustrated text is not a guarantee; adjacent prose provides the accessible, qualified explanation. Cross-route Security/privacy content remains owned by #7/#8. Known baseline typecheck failures remain outside this bounded guide task.
