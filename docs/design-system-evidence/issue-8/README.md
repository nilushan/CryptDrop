# Issue #8 — Privacy content and entry points

Base: `a04d0f9bb01557faf4c6c2b88dedb1897126e994` · branch `feat/portfolio-customer-improvements` · clean checkout verified at start · pending independent review. No staging, commit, closure, deployment or crypto/key-storage changes.

## Scope and complete section audit

Privacy remains on **`/security`**. No other privacy route was found (`src/pages` contains homepage, guide, security, app and invite only). Reuses #7's six-section shell, `MarketingSection`, `MarketingCTA`, shared marketing cards, tokens, focus and responsive grid. No new reusable component/API or legal policy. Static content stays static; no hydration added.

| Section / entry point | Checklist audit and implementation | Intentional exception / preservation |
| --- | --- | --- |
| Hero | One h1, explicit local-vs-network lead, four named topic links. Underlined links wrap, have 44px height, and white keyboard outlines against the dark background. | Existing dark identity, metadata and route retained. Topic navigation is local to this page, not a new shared navigation primitive. |
| What stays on your device | All six local cards reviewed. Generation is local but automatically attempts public-identity registration; signature checking is local but fetching the key is separate. Contacts/history use unencrypted localStorage; collections are not uploaded but selected metadata can be sent. Page-exit auto-clear is not guaranteed. | Existing file-memory/download and remembered-key/offline-guessing caveats retained. Green tint is decorative, not the only category cue. 14px card prose follows the existing marketing catalog; no app control treatment. |
| Private keys: protections and limits | Existing named section, both meaningful IDs, four safeguards, six limitations and four guidance paragraphs preserved verbatim. | No change to `key-security.ts`, key safeguards, saved-vs-loaded distinction, recovery warnings, device/code/audit limits or security policy. |
| What reaches the cloud | Clear heading and qualified reading lead; nine noninteractive workflow cards give payload, destination, trigger and limitations. Adds invitation validation, acceptance notification and public-key email handoff; distinguishes browser→API/keyserver, backend→Resend and external mail client. Adds backend-record list with h3, real ul/li and readable 16px list prose. | Existing anchor `#network-requests` and heading ID retained. Manual shared section markup allows a linked lead without expanding the component API. This is an application-data summary, explicitly not exhaustive HTTP metadata or a retention policy. Pale amber borders are decorative, not controls. |
| What is never transmitted | Seven real list items retained; contact/history items now explicitly mean collections. Normal-workflow and malicious-code/device caveats retained; adjacent prose/link clarifies selected names/emails/filenames can be transmitted. | Red tint remains category emphasis, not an error/live alert. Private-key caveat link and `#never-transmitted` stay intact. |
| How CryptDrop hardens your security | Audited all eight measures, including no-analytics wording and its registry/network qualification. Existing #7 approved warning-only key-lookup correction retained. | All eight measures and security caveats unchanged. No new certification, auditing or tracking/hosting promise. |
| Source / app / guide CTAs | Native shared CTA links, meaningful names, one primary action, unchanged URLs. | Existing library/source text retained; not represented as an independent application audit. External destinations inspected as hrefs, not remotely exercised. |
| Shared Layout | Footer now explicitly names Security & privacy and links directly to network data disclosure. Header retains current-page semantics; links work on all four marketing pages. | No header redesign, token or marketing CSS change. App still has its own shell. |
| App footer / notices | Real footer with named security/privacy and network links; 14px underlined text, wrap and 44px link height. Existing guide/lookup disclosures reviewed and retained. Shared generation notice now separates local secrets from automatic public-identity registration and links to details. | App notice retains vault styling, not marketing cards. Notice is ordinary static information, not an alert. Same shared component covers Keyring and guided setup; generation/validation/download/registration/backup behavior untouched. |

## Approved source-to-claim reconciliation

Supervisor explicitly approved bounded copy corrections after source audit; this was not inferred from styling authority. No changes to any executable data flow were made.

| Source | Verified flow → disclosure |
| --- | --- |
| `src/components/keys/KeyGenerateForm.tsx`, `src/lib/api.ts`, `packages/server/src/routes/register.ts` | Generation automatically attempts nonblocking registration with name, email, armored public key, fingerprint and optional invitation token. Failure is caught; no guaranteed registration and no opt-in implication. Replaced contradictory “Never sent to any server” notice. Private key/passphrase are not in that request. |
| `src/lib/openpgp-helpers.ts`, `packages/server/src/routes/lookup.ts` | Email goes to API registry lookup, backend keyserver fallback; browser can also query keyserver directly when API path fails. Removed “only email/no other data” absolute: application payload is not all HTTP metadata. |
| `src/components/keys/YourPublicKey.tsx` | Optional armored public-key upload (which contains public identity), then returned token + unpublished addresses for verification requests. Delivery is not guaranteed. mailto action hands public key/identity draft to the user's email application, not API. |
| `src/lib/api.ts`, `src/components/invite/InviteAcceptPage.tsx`, `packages/server/src/routes/invite.ts` | Invite POST includes sender name **and email**, recipient email; stores invitation and attempts Resend delivery. Opening link sends token for validation; response includes party metadata/status. Token is forwarded through setup to registration. No secrets or live tokens used in QA. |
| `packages/server/src/routes/register.ts`, `services/email.ts`, `templates/notification.ts` | Registration can accept invitations by token or matching email; backend attempts inviter notification containing registrant name/email via Resend. No inbox-delivery guarantee. |
| `src/components/encrypt/QuickEncryptPanel.tsx`, `src/lib/openpgp-helpers.ts`, `src/lib/api.ts`, `packages/server/src/routes/notify.ts`, `services/email.ts`, `templates/decrypt-instructions.ts` | Optional notify sends recipient email, **complete loaded sender user ID** as `senderName`, **`result.originalFile.name`**, and notification type. Generated user IDs are `${name} <${email}>`; imported identities retain the key’s full user ID. With no loaded identity, `Someone` is sent instead. Resend receives those email details, and the recipient sees the sender user ID in the subject and body. Corrected both “encrypted filename” and review-identified “your name” understatement; sender email and original filenames can reveal information without file contents. |
| `src/stores/contacts.ts`, `history.ts` | Browser localStorage collections, no collection-upload code. Not encrypted by app; selected names/emails/filenames used separately by network workflows. History has original/result names/sizes, timestamp, parties and signed flag; pagehide auto-clear is best-effort. |
| `src/lib/key-storage.ts`, `src/lib/key-security.ts`, local file/PGP helpers | Local key/file behavior and limits retained, not expanded into a compromised-device guarantee. Source-named regression tests preserve shared safeguards/limitations and guidance. |
| `packages/server/src/db/schema.ts`, migrations | D1 users: name/email/public key/fingerprint, created/updated timestamps. Invitations: token/parties/status, created/accepted timestamps. No claim of no backend/database. |
| `packages/server/src/middleware/rate-limit.ts` | D1 key combines action and `cf-connecting-ip`, fallback `x-forwarded-for`, fallback `unknown`; count/window start also stored. **Not hashed or anonymous.** No expiry/deletion guarantee inferred from probabilistic cleanup. |

### Factual / operational questions intentionally left open

Source does **not** establish production access/error/request logging, CDN/hosting retention, database backup retention, who can access operational records, deletion processes/rights, jurisdiction, or third-party Resend/keyserver/email-provider policies. Owner/operator and legal review are needed before asserting any of these. This task makes no new commitments about them. A seven-day pending-invitation validity check is **not** a seven-day record-deletion policy; lazy probabilistic rate-record cleanup is **not** a retention guarantee. Deployment configuration was not verified against production. No such unknown is silently filled in with a promise.

## Reviewable screenshots

[manifest.json](manifest.json) indexes **39 PNGs** with route/state, CSS viewport, actual image dimensions and SHA-256. All 18 BEFORE captures use an isolated `git archive` of base at local port 4338 (initial clean-checkout captures were recaptured there to normalize scroll position). All 21 AFTER captures use production build preview at 4329. No real keys, credentials, identities, tokens or files. Each view was visually inspected, including overview contact sheets and detail crops; temporary sheets/crops are outside the repo.

For every surface below there are paired `before-{surface}-{mobile|tablet|desktop}.png` / `after-{surface}-{mobile|tablet|desktop}.png` views at **375×812 / 768×1024 / 1280×720**:

| Surface prefix | Route and actual state | Representative pair |
| --- | --- | --- |
| `security` | `/security`, full six-section page | [Before mobile](before-security-mobile.png) / [After mobile](after-security-mobile.png); [Before tablet](before-security-tablet.png) / [After tablet](after-security-tablet.png); [Before desktop](before-security-desktop.png) / [After desktop](after-security-desktop.png) |
| `home` | `/`, full page and shared footer | [Before](before-home-mobile.png) / [After](after-home-mobile.png) |
| `guide` | `/how-it-works`, full guide and shared footer | [Before](before-guide-tablet.png) / [After](after-guide-tablet.png) |
| `invite` | `/invite`, missing-token state and footer only | [Before](before-invite-mobile.png) / [After](after-invite-mobile.png) |
| `app` | `/app?tab=encrypt`, empty unsigned state/footer | [Before](before-app-mobile.png) / [After](after-app-mobile.png) |
| `generate` | `/app?tab=keyring`, generation form **before submission** and disclosure | [Before](before-generate-mobile.png) / [After](after-generate-mobile.png) |

Additional `/security` AFTER views: [320px reflow](after-security-reflow.png), [200% root text](after-security-text-200.png), [keyboard focus](after-security-focus.png). Full-page image height differs from viewport height. Browser dev toolbar removed from capture DOM only. Capture scroll reset avoids sticky-header full-page stitching artifacts; no shell elements hidden. Existing marketing illustrations are not evidence of actual security guarantees.

## Review correction — sender identity in decrypt instructions

Independent review identified that “your name” understated the notify payload. Confirmed `QuickEncryptPanel.tsx` sends the entire `$userInfo` (or `Someone`), `openpgp-helpers.ts` supplies generated name/email or an imported full user ID, and the email service/template place it in the recipient’s subject/body. The workflow card now explicitly discloses the loaded sender user ID, possible name/email, no-identity fallback, Resend handoff and recipient visibility. Runtime code is unchanged.

Added a dedicated built-Astro-output regression in `tests/marketing-patterns.test.ts` for this card. Refreshed only the six `/security` AFTER captures (mobile/tablet/desktop/reflow/text-200/focus) and their manifest entries; all BEFORE and other-route captures remain unchanged. Inspected the changed card at mobile, desktop, 320px and 200% root text; no horizontal clipping. Re-ran the production browser suite: **53 checks / 33 contrast pairs / zero page errors**. Browser results remain linked below.

Correction validation logs: `/tmp/issue8-fix1-test.log` (**141 tests pass**), `/tmp/issue8-fix1-build.log` (**five pages pass**), `/tmp/issue8-fix1-typecheck.log` (**same four baseline errors**, 93 files / 0 warnings / 3 hints in this run). Baseline error identities match `/tmp/issue8-before-typecheck.log`; file/hint counts differ with temporary/generated files in the workspace. `git diff --check` passes; no staged files, commit or issue closure. Independent acceptance review remains required.

## Validation actually performed

- `npm test`: **PASS — 12 files / 141 tests**. Six new content/generation tests plus one screenshot-manifest regression, and updated #7 category expectations. Actual built Astro output checks all named sections, privacy jump targets, metadata/anchors, nine workflows, local/network collection distinction, original filename, best-effort registration/email, backend record caveats and all shell footer consumers. React test covers shared notice in two mounted flows; existing behavior test still verifies downloads/registration/backup gate.
- `npm run typecheck`: **FAIL — same four pre-existing errors reproduced before edits and after**. `functions/api/[[catchall]].ts:2` missing `Fetcher`; `:5` missing `PagesFunction` and implicit-any `context`; `tests/decrypt-signed.test.ts:12` null vs optional PrivateKey. Baseline 121 files / 4 errors / 0 warnings / 92 hints; after 123 files / 4 errors / 0 warnings / 93 hints. Extra hint is generated output suggestion, not a new source error. Logs `/tmp/issue8-before-typecheck.log`, `/tmp/issue8-typecheck.log`.
- `npm run build`: **PASS — five static pages**. Log `/tmp/issue8-build.log`.
- [Privacy production browser results](production-browser-results.json): **PASS — 53 checks, 33 contrast pairs, zero runtime errors**. Chromium via installed gstack Playwright. At 320/375/768/1280px: six named sections, one h1, all cards/lists, no document overflow; keyboard skip/header/content traversal, Tab/Shift+Tab/Enter, visible 3px outlines; four actual jump-link clicks clear sticky header; shared CTA/logo clicks preserve routes. Every changed footer link exercised by keyboard navigation across home/guide/invite/app at every width. Both Keyring and guided decrypt setup generation notices exercised and their links followed, without generating keys or submitting network actions.
- 200% root-font at 768px and line/letter/word/paragraph spacing overrides reflow without loss. 320px equivalent reflow tested; **native browser zoom not claimed**. Reduced-motion emulation retains text and disables transitions.
- 33 measured privacy pairs cover normal/large text, dark hero, category metadata, storage/list qualifications, CTA/boundary/focus, white topic focus, vault notice/link and app footer. [Shared-shell results](shared-shell-browser-results.json): existing collateral script **PASS — 40 checks / 23 rendered contrast pairs / zero page errors** across all five routes/four widths. Changed notice/footer links are underlined; static notices are not live alerts.
- `git diff --check`: **PASS**; staged diff empty. Private-key safeguard source and four guidance paragraphs unchanged; no crypto, API, storage or backend implementation changes. No new route.

Initial QA harness adaptation needed a specific caveat-link selector after adding the qualification link, and waiting for URL navigation after keyboard Enter. Final runs pass; these were harness assumptions, not suppressed UI failures.

Reproduce after `npm run build` and local preview:

```sh
npm run preview -- --host 127.0.0.1 --port 4329
BASE_URL=http://127.0.0.1:4329 node docs/design-system-evidence/issue-8/browser-checks.mjs
BASE_URL=http://127.0.0.1:4329 node docs/design-system-evidence/issue-8/capture-views.mjs after
BASE_URL=http://127.0.0.1:4329 node docs/design-system-evidence/issue-5/browser-checks.mjs
```

Scripts use installed `~/.agents/skills/gstack/node_modules/playwright/index.mjs`; override with `PLAYWRIGHT_MODULE`. Temporary JSON outputs are `/tmp/issue8-*` and `/tmp/issue5-browser-results.json`. Only run capture `before` against unchanged base. Manifest is deliberately not overwritten by capture scripts; regenerate hashes only when reviewing intentional recaptures.

Not an accessibility/security certification. No screen-reader, OS high-contrast, Safari/Firefox, native browser zoom, deployed headers/logs, real API/keyserver, delivery/inbox, valid-token invitation or complete app-workflow testing claimed. Those are not replaced by screenshots. Pre-existing typecheck debt and operational policy questions remain separate owner follow-ups. **Independent acceptance review is the next gate; no commit or closure yet.**
