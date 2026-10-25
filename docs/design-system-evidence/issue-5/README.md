# Issue #5: homepage marketing alignment

Base HEAD: `197845bc59830230553feaf461fb18219b3828c2`. Branch `feat/portfolio-customer-improvements`, clean at start. Implementation is **pending independent review**; no staging, commit, push, deployment or issue closure in this stage.

## Section-by-section audit and disposition

| Surface | Baseline gap | Implemented / retained |
| --- | --- | --- |
| Shared header | Information links hidden on mobile; tiny tagline/actions; no current-page semantics | Marketing-only wrapping navigation keeps Guide, Security and Open App visible at 320/375/768/1280px. 44px link targets, readable tagline, `aria-current`, decorative logo SVG, white offset focus on gradient. Retains brand, gradient, destinations and sticky shell. App mode retains its own header/navigation/workspace skip link. |
| Hero / metadata | Duplicated `.btn-*`, small gray trust copy, no landmark; inaccurate blanket no-server claim | Named section with the original h1/title, shared static link CTAs, 18px lead, 14px trust/qualification text. Original palette and intent retained; approved factual corrections below. Description remains useful but is not preserved verbatim because its claim was false. |
| Illustration | Existing useful narrative and meaningful alt | Original image, alt, eager loading, proportional scaling, 56rem outer measure and illustration shadow retained. Artwork is illustrative, not evidence of a security guarantee. |
| Problem | Repeated header/width/spacing rules, inline icon fills and grid sizing, small copy | MarketingSection, shared neutral MarketingCard CSS, 16px headings / 14px card prose, decorative emoji, named landmark. Original three concerns and wording retained. No hover elevation suggesting clickable cards. |
| Solution | Same pattern duplication, unsupported no-backend/no-database claims and discovery description | Same Section/card roles; six features retained. Local processing is distinguished from registry/invitation services. Linked Security details; automatic registration and registry-first lookup described. |
| Three-step explanation | Generic div sequence, duplicated number/copy styles, mandatory-signing implication | Ordered list, decorative visible numbers, 16px headings / 14px prose, shared secondary CTA. Original order and intent retained; signing/verification now explicitly optional, not promised successful. |
| Comparison | No caption/header scopes, symbolic-only cells, tiny pale footnote, unnamed scroller | Caption, five scoped column headers / seven row headers, textual Yes/No, readable note. Named/described keyboard-focusable local scroller with visible instruction; document does not overflow. File storage/offline labels narrowly qualified. Competitor assertions retained by explicit supervisor direction, not newly validated. |
| Closing CTA | Duplicate button/heading/spacing styles | Shared Section gradient tone and both CTA variants; original headline and destinations. Local file-encryption wording replaces an overbroad entire-app-is-local implication. |
| Shared footer | 12px low-contrast copy, overly broad file/device absolute | 14px token-backed muted text, underlined attribution, security/network-details link; narrowed to CryptDrop not uploading file contents. Applies to all marketing consumers, not app footer. |
| Interaction / responsive | Marketing bypass, focus, reduced-motion and consistent widths absent | Skip to focusable main, 3px/4px offset focus, immediate focus (removed header CTA's outline animation), reduced-motion override. 56rem container/24px gutters, 40rem prose and 44rem hero; fluid rem-minimum grids adapt to text enlargement. |

### Bounded reusable patterns

- `src/components/marketing/MarketingSection.astro`: required unique `id` + heading, optional lead, `plain|muted|gradient` tone; owns named section, h2 and container. Used five times here, no client hydration.
- `src/components/marketing/MarketingCTA.astro`: required href, primary/secondary variant and text slot; always a native link. Used five times here. It has no crypto/domain/action-button responsibilities.
- `src/styles/marketing.css`: token-backed container/section/type, CTA group/variants, neutral card, accessible table CSS, marketing focus/motion and shell treatments. Imported by Layout; marketing shell selectors are scoped to `.marketing-layout`. No global app `.btn-*`/`.card` definitions. Homepage art/icons/grids/step numbers stay local.
- Table markup remains caller-owned: CSS alone does **not** supply caption, scopes, tabindex, accessible region name or scroll instruction. These are tested on the actual built homepage.

Intentional refinements: feature/step grids use rem minimum widths rather than fixed viewport-only column counts so 200% root-text emulation stacks them instead of creating very narrow words. They still render one/two/three feature columns and one/three/three step columns at the representative mobile/tablet/desktop widths. Header informational links wrap without JavaScript instead of introducing a hamburger menu. Cards are static, not app choice controls. No framework, icon library, font, new route or new hydration added.

## Approved claim reconciliation

The supervisor explicitly approved the bounded corrections below after source review; these are not new legal/retention or security-certification claims. Existing workflows, API payloads, crypto and storage are unchanged. Existing `/security` remains the destination for trusted browser/device/code caveats and network details.

| Existing claim | Shipped wording / qualification | Source anchors |
| --- | --- | --- |
| Description/hero “No servers”; browser feature “Nothing is uploaded to any server” | File crypto runs in browser; CryptDrop does not upload **file contents**. The browser feature separately names public-key registration, lookup and invitation network services. | [encryptFileData/decryptFileData](../../../code/frontend/src/lib/openpgp-helpers.ts#L68), [API payloads](../../../code/frontend/src/lib/api.ts#L14) |
| “Zero-knowledge architecture”, no backend/database/we store nothing | “Private keys stay local”; registry/invitation services receive public keys and identity/contact details, not private keys. | [register route](../../../code/backend/src/routes/register.ts#L9), [stored user/invitation fields](../../../code/backend/src/db/schema.ts#L1), [invite route](../../../code/backend/src/routes/invite.ts#L10) |
| Public discovery names only keyserver | CryptDrop registry first, keys.openpgp.org fallback | [frontend lookup chain](../../../code/frontend/src/lib/openpgp-helpers.ts#L136), [server lookup](../../../code/backend/src/routes/lookup.ts#L10) |
| “No account” also implied no identity information | No account/login, but generation asks name/email and attempts to register public key and identity | [generation registration](../../../code/frontend/src/components/keys/KeyGenerateForm.tsx#L67), [registerUser](../../../code/frontend/src/lib/api.ts#L14) |
| Unqualified offline trust badge/row | Local file encryption after app is loaded and required keys available; discovery/invitations need network. No offline reload/install promise. | [local file crypto](../../../code/frontend/src/lib/openpgp-helpers.ts#L68), [network lookup](../../../code/frontend/src/lib/openpgp-helpers.ts#L136), [API](../../../code/frontend/src/lib/api.ts#L1) |
| “No server storage” | “No file storage on service servers”; CryptDrop's Yes is file-specific, not a claim of zero stored public identity/contact data. The generic service label keeps each comparison column about its own provider. | [API](../../../code/frontend/src/lib/api.ts#L14), [D1 schema helpers](../../../code/backend/src/db/schema.ts#L1) |
| Always signed / automatically verified three-step wording | “Optionally sign with your private key so the recipient can check the signature”; signed files need sender public key to check signature. No guaranteed verification/identity trust. | [optional signing checkbox](../../../code/frontend/src/components/encrypt/QuickEncryptPanel.tsx#L168), [decrypt verification owner](../../../code/frontend/src/components/shared/DecryptFilePanel.tsx#L74), [verification success/failure branches](../../../code/frontend/src/lib/openpgp-helpers.ts#L113) |
| Shared footer “Files never leave your device”; closing entire-app-local wording | CryptDrop does not upload file contents; file encryption runs locally. Sharing encrypted output is still possible. | [API payloads](../../../code/frontend/src/lib/api.ts#L1), [file crypto](../../../code/frontend/src/lib/openpgp-helpers.ts#L68) |

Handoff to #8: audit consistency across the combined Security/Privacy route and other source wording. Known false homepage absolutes above are fixed now, not deferred. Broad claims about other email/cloud/messaging services, the comparison footnote, illustration text and absolute identity-proof phrasing elsewhere are retained for owner/content review, not endorsed by this visual issue. No competitor research or new competitor claims were introduced.

## Reviewable screenshots

[manifest.json](manifest.json) indexes **34 PNGs** with route, state, viewport, actual PNG dimensions and SHA-256. There are 15 BEFORE views at the base source, 15 matching AFTER views, and four AFTER edge-state views. All local, empty/synthetic UI; no real keys, identities, files or email requests.

| Route / state | BEFORE mobile / tablet / desktop | AFTER mobile / tablet / desktop |
| --- | --- | --- |
| `/` | [375](before-home-mobile.png) · [768](before-home-tablet.png) · [1280](before-home-desktop.png) | [375](after-home-mobile.png) · [768](after-home-tablet.png) · [1280](after-home-desktop.png) |
| `/how-it-works` | [375](before-guide-mobile.png) · [768](before-guide-tablet.png) · [1280](before-guide-desktop.png) | [375](after-guide-mobile.png) · [768](after-guide-tablet.png) · [1280](after-guide-desktop.png) |
| `/security` | [375](before-security-mobile.png) · [768](before-security-tablet.png) · [1280](before-security-desktop.png) | [375](after-security-mobile.png) · [768](after-security-tablet.png) · [1280](after-security-desktop.png) |
| `/invite`, missing token | [375](before-invite-mobile.png) · [768](before-invite-tablet.png) · [1280](before-invite-desktop.png) | [375](after-invite-mobile.png) · [768](after-invite-tablet.png) · [1280](after-invite-desktop.png) |
| `/app?tab=encrypt`, empty | [375](before-app-mobile.png) · [768](before-app-tablet.png) · [1280](before-app-desktop.png) | [375](after-app-mobile.png) · [768](after-app-tablet.png) · [1280](after-app-desktop.png) |

Edge views: [320px reflow](after-home-reflow.png), [200% root text at 768px](after-home-text-200.png), [table scrolled to right with focus](after-home-table-scrolled.png), [desktop header keyboard focus](after-home-focus.png). Full-page PNG height is not viewport height; guide mobile captures include its **pre-existing** document overflow (443px PNG width at 375px viewport), owned by #6. App tablet/desktop PNGs are pixel-identical before/after; mobile differs in only a 2×4px raster area within existing content, not layout or workflow. No pixel-identical claim is made for all app states.

## Browser checks actually exercised

Installed gstack browse CLI used for initial live inspection; installed gstack Playwright/headless Chromium for reproducible checks/captures. [browser-results.json](browser-results.json) records assertions and contrast. Dev-only Astro toolbar was removed from DOM after load solely for unobstructed captures, never from source.

- Header/footer modes and marketing navigation targets at 320, 375, 768 and 1280px on **all five routes**. Both information links and Open App stay visible; current route is named on Guide/Security. App marketing footer/bypass are absent; workspace skip link remains.
- Homepage: one h1, five h2s, six named sections, original image source/alt, three ordered steps, caption/header associations, Yes/No cell text. All primary/secondary/disclosure links retain destinations; representative app/guide/security links actually clicked and loaded successfully.
- Keyboard: Tab through logo, Guide, Security and App with immediate white 3px focus; skip link Enter transfers focus into main. From main, Tab traverses all CTA/disclosure/attribution links and table region; 3px solid outlines/4px offset, content focus not obscured by sticky header. ArrowRight scrolls the table region at mobile widths; rightmost columns shown in capture.
- Homepage has document width equal to viewport at 320/375/768/1280px; table overflow stays local. At 768px, 200% root text enlargement and separate WCAG-style text-spacing overrides retain document reflow. Root text emulation and equivalent 320px layout are **not native browser 400% zoom**.
- Normal text contrasts meet ≥4.5:1, large display ≥3:1, measured representative control/table boundaries and focus ≥3:1. Browser computes actual colors; gradient endpoints use conservative adjacent backgrounds. Primary white/indigo 6.29:1; hero muted 6.76:1; footer muted 7.23:1; Yes green 7.13:1; No red 8.02:1; header tagline 6.66:1 at its lightest gradient endpoint. Hover CTAs and boundary/focus measurements are included in results.
- Reduced-motion emulation removes marketing transitions; no new animation introduced. Zero runtime page errors in the checks.

Reproduce with local Astro running:

```sh
node docs/design-system-evidence/issue-5/capture-views.mjs after
node docs/design-system-evidence/issue-5/browser-checks.mjs
```

Set `BASE_URL` to use a local production preview. Uses installed `~/.agents/skills/gstack/node_modules/playwright/index.mjs`; `PLAYWRIGHT_MODULE` overrides that tooling path. Scripts emit temporary manifests/results under `/tmp/issue5-*`; checked-in combined evidence is intentionally not overwritten without review. Only run `before` against the base source. Tests validate real Astro output using a temporary production build and validate the checked-in image manifest.

## Validation and limitations

Exact final command results are recorded below; transient test-harness failures during implementation were corrected (Node URL vs jsdom URL; focus outline was initially animated by legacy `transition: all` on header CTA and is now immediate). No change-caused failing checks remain.

- `npm test`: **PASS**, 12 files / 123 tests, including seven new built-markup/evidence regressions in `tests/marketing-patterns.test.ts`.
- `npm run typecheck`: **FAIL, pre-existing only**. Baseline before edits and after edits both have exactly four errors: `functions/api/[[catchall]].ts:2:18` missing `Fetcher`; `:5:25` missing `PagesFunction`; `:5:53` implicit-any `context`; `tests/decrypt-signed.test.ts:12:79` null passed to optional PrivateKey. No new source/test diagnostics. Baseline checked 113 files; final checked 117 files. Generated `dist` contributes 90 hints, zero warnings. Logs `/tmp/issue5-before-typecheck.log` and `/tmp/issue5-typecheck.log`.
- `npm run build`: **PASS**, five static pages. No marketing islands/hydration.
- Browser checks: **PASS**, 40 checks / 23 contrast pairs / zero runtime page errors on local dev. Repeated the same complete script against `npm run preview -- --host 127.0.0.1 --port 4325`: **PASS**, 40 checks / 23 pairs / zero runtime page errors, recorded in [production-browser-results.json](production-browser-results.json).
- `git diff --check`: **PASS**. `git diff --cached --name-only`: empty. No staged files.

Not an accessibility certification. No screen-reader, OS high-contrast, native zoom, Safari/Firefox, live registry/keyserver/email, installed/offline reload, or all app workflow-state coverage is claimed. Guide/Security page bodies and invitation workflows remain owned by their existing issues; only their shared-shell regressions are checked here. The known guide overflow is unchanged and documented for #6. Existing baseline type errors and retained third-party/content assertions need their owning follow-ups. Independent review is required before any commit/closure.
