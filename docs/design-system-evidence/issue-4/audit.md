# Exhaustive app inventory and intentional exceptions

Every checkbox means **source audited and disposition implemented**, not that every possible state was browser-tested. Browser and automated coverage are distinguished below. There are 42 component/hook source files, plus the page/layout/style owners. The starting comment estimated 44; the final filesystem inventory is authoritative.

## Shell and ownership

| Audited owner | Disposition | Evidence |
| --- | --- | --- |
| [x] `src/layouts/Layout.astro` | Import shared semantic tokens once; retain separate marketing/app shells. No marketing CSS migration. | Before/after shell views; app focus checks |
| [x] `src/pages/app/index.astro` | Import scoped catalog before workspace overrides; remove 680+ lines of page-global presentation. All islands and navigation initializer retained. | Navigation tests; six route views |
| [x] `src/styles/app-workspace.css` | Alias shared action/status/line roles; stronger focus/control boundaries; minimum 12px instructions; wrapping labels, header, key identity and reflow-aware sidebar. | Mobile/tablet/desktop, 320px and 200% text captures |
| [x] `src/styles/app-components.css` | App-only catalog for buttons, fields, cards, files, contacts, results, history, key lifecycle and wizard. Existing 10px workspace control-radius exception retained. | Contrast check, all app snapshots |
| [x] `src/styles/tokens.css`, `src/styles/feedback.css` | Source-named color/spacing/radius/motion roles. Small NoticeBox catalog shared with invitation, scoped to its consumers. | Contrast check; no app catalog on marketing/invite |
| [x] `src/pages/invite.astro` | Retain marketing bridge; tokenized local card/text/focus, remove unused success CSS; no stretched empty card. | Missing/valid/used/expired/API-failure views |

Consumer removal audit: obsolete `.app-tab-bar*`, `.app-tab-identity`, `.app-tab-inner`, `.privacy-badge`, old key-status avatar/info/name/email, `.contact-list`, `.success-*`, `.file-info`, `.code-block`, `.local-assurance-bar`, unused private section-badge variants and public-key empty variants had no source consumers. Removed them rather than moving dead rules. Removed `.fp-tooltip-anchor` after its sole consumer moved to keyboard-operable native details. Dynamic drop-zone/notice/lock classes retained. Remaining page-independent Layout utilities still serve marketing and were not deleted.

## Every component / hook

Paths below are relative to `src/components/`.

| Audited file | States / alignment | Exercised evidence |
| --- | --- | --- |
| [x] `encrypt/EncryptTab.tsx` | Empty/saved recipient, search, add/cancel, shared lookup; remove duplicate online-services help now owned by lookup. | Before/after, contacts → recipient browser flow, existing workspace tests |
| [x] `encrypt/QuickEncryptPanel.tsx` | Selected file, signing unavailable/available, busy, durable error, shared result, instructions status. Unique signing IDs in direct/guided instances; native fingerprint details replaces hover-only help. | Direct unsigned + guided signed browser round trips; error test |
| [x] `decrypt/DecryptTab.tsx` | Key absence/loaded, existing security limitations, folder and history composition. | Browser key gate; workspace tests; verified/unsigned results |
| [x] `keys/KeyRingTab.tsx` | Existing task hierarchy and shared private-key panel. | Keyring before/after |
| [x] `keys/PrivateKeyPanel.tsx` | No-key/saved/generate/import/loaded; restore visible label/help/error associations; existing ActionButton. | Browser reload and wrong/correct restore; backup tests |
| [x] `keys/KeyGenerateForm.tsx` | Reuse #3 labels, IDs, passphrase help and stacking; stronger semantic strength colors and durable validation/operation error. Preserve exact validation, generation, registration and backup gate. | #3 tests unchanged; real synthetic generation/download/backup browser flow |
| [x] `keys/KeyImportForm.tsx` | Shared FormField/ActionButton, optional protected-key passphrase label; file-read and import errors retained locally. | Browser wrong/correct import, multi-instance/help/error regression tests |
| [x] `keys/KeyLoadedView.tsx` | Loaded vs remembered vs unsafe distinct; wrap full identity/fingerprint; shared saving busy control, durable save/forget errors. | Browser Remember/reload/Forget; existing unsafe-key/save tests |
| [x] `keys/KeyBackupGuide.tsx` | Collapsed/protection-check/unsafe/verifying/error/verified; shared verification button and associated descriptions; no gate or passphrase-clearing changes. | Real backup mismatch/retry; full backup-component suite |
| [x] `keys/YourPublicKey.tsx` | Download/copy/email/publish; shared busy and NoticeBox publication/copy-error feedback; public green remains distinct. | Loaded screenshots, clipboard-error regression test, source audit of publish branches; no live publishing |
| [x] `keys/KeySecurityDisclosure.tsx` | Native details, safeguards and limitations retained verbatim; scoped typography. | Existing expansion/limits tests; Keyring captures |
| [x] `keys/AddressBookTab.tsx` | Task heading/subtitle and shared AddressBook. | Contacts before/after |
| [x] `keys/AddressBook.tsx` | Empty/populated, lookup/import and optional-name prompt; visible optional label with FormField; shared actions/notice. | Browser public-file import; source audit optional-name branch |
| [x] `keys/ContactKeyList.tsx` | Full fingerprint, named refresh/remove, 36px targets; shared refreshing state and durable refresh failures. | Browser populated/refresh; named removal and full fingerprint tests |
| [x] `keys/useKeyProtection.ts` | Behavioral owner, no edits. Protection-check/unsafe/protected remains authoritative. | Existing backup tests |
| [x] `shared/ActionButton.tsx` | Explicit non-submit type, native disabled/busy, decorative spinner, caller-owned action text. Reused by import/lookup/backup/remember/publish/invite/results. | Busy/repeat-click regression test |
| [x] `shared/FormField.tsx` | Extend #3 wrapper only with optional associated error; caller owns IDs/descriptions/validation. No alternate field abstraction. | Generation/import/lookup tests |
| [x] `shared/NoticeBox.tsx` | One shared visual catalog; add error plus opt-in status/alert. Static guidance is not announced. | Quiet-vs-alert regression test; contrast fixture |
| [x] `shared/Toast.tsx` | Always-mounted polite live region, semantic opaque readable pairs; supplements durable task errors. | Mounted-region regression test; browser notifications |
| [x] `shared/ResultState.tsx` | Shared download ActionButton, full filename/size comparison, wrapping/stacked cards, textual status and reset; remove inline palette/mouse mutations. | Real encryption/decryption downloads, full-name/actions test |
| [x] `shared/SignatureResult.tsx` | Existing classification and all three displayed meanings unchanged; use NoticeBox. Empty/unknown text still renders nothing. | Four outcome regression cases; real signed/unsigned decrypt |
| [x] `shared/LockIllustration.tsx` | Decorative SVG; adjacent outcome/owner explanation retained. Reduced-motion treatment shared. | Result captures; reduced-motion browser CSS assertion |
| [x] `shared/FileDropZone.tsx` | Native picker, keyboard focus-within, same-file reset and drag/drop preserved; stronger boundary; decorative upload icon. | Existing picker/drop/focus tests; browser uploads |
| [x] `shared/FileSelectedCard.tsx` | Full wrapped filename, named remove with 36px target; remove inline hover palette. | Existing remove/refocus test; browser long filename |
| [x] `shared/FolderBar.tsx` | Existing progressive enhancement and download fallback; readable control boundary/targets and durable picker failure. | Download fallback and picker-error retry tests; Chromium folder button visible, downloads used |
| [x] `shared/ContactAvatar.tsx` | Initials and existing indigo identity; shared styles, no identity verification inference. | Contact/result flows |
| [x] `shared/ContactListPicker.tsx` | Visible search label, shared row styles, full name/email access, distinct filtered-empty status. Search clearing/sorting unchanged. | Browser recipient/sender picks; filtered-empty regression test |
| [x] `shared/KeyLookupCard.tsx` | Shared label/help/button, searching, found/warn/miss/error states and full fingerprint; durable failure; Enter cannot submit while searching. | Browser public import/miss; lookup miss/error tests |
| [x] `shared/KeyLookupWithInvite.tsx` | Existing lookup+invite composition remains behavioral owner; no duplicated API state. | Browser miss → invitation fixture |
| [x] `shared/InviteBox.tsx` | Shared NoticeBox/ActionButton and wrapping actions; sending/sent/setup-required/fallback/clipboard-error textual status. | Browser fixture sent branch; clipboard-error regression test; source audit fallback |
| [x] `shared/KeyCapabilityNotice.tsx` | Existing icon/text status, never equate missing signing key with missing recipient. Token aliases only. | Existing capability tests; key gate browser flow |
| [x] `shared/KeyChoiceGrid.tsx` | Existing accessible choice buttons, filled-generate/outlined-import vault hierarchy; responsive stacked cards. | Existing choice tests, Keyring captures |
| [x] `shared/KeyStatusPill.tsx` | Separate Keyring navigation and session status retained; wrapping loaded copy, decorative icon unchanged. No store/navigation changes. | Existing named control tests; browser key lifecycle |
| [x] `shared/ActivityHistory.tsx` | Shared typography/status hues, named keyboard-scrollable list, full filenames, labeled auto-clear checkbox; remove inline palette/hover changes. Existing storage behavior unchanged. | Browser round trips/history clear; list/clear regression test |
| [x] `shared/DecryptFilePanel.tsx` | File/sender/disabled/busy/error/result/expiry; durable errors and visible disabled reason. Keep exact verification and five-minute expiry behavior. | Real signed/unsigned decrypt/download; durable error test |
| [x] `wizard/WizardTab.tsx` | Existing compositions and local state; h1 for each step, focus after forward/back transitions without initial hidden-island focus theft. | Step/focus regression test; guided encrypt/decrypt browser paths |
| [x] `wizard/WizardHome.tsx` | Existing shared choice cards; heading can receive returned focus. | Before/after; both branch clicks |
| [x] `wizard/WizardProgress.tsx` | Ordered current/completed steps and responsive wrapping, remove inline palette. | Step semantics test; mobile wizard capture |
| [x] `wizard/WizardEncryptRecipient.tsx` | Existing shared lookup/contact controls, no separate crypto path. | Browser guided recipient selection |
| [x] `wizard/WizardDecryptKeys.tsx` | Reuse generation/import/loaded/choice components; existing Continue gate. | Existing wizard generation/backup test; browser Continue |
| [x] `wizard/WizardDecryptFile.tsx` | Reuse DecryptFilePanel and cross-tab action; shared result-action spacing. | Browser composition/reflow; navigation tests |
| [x] `invite/InviteAcceptPage.tsx` | h1 across loading/missing/invalid/used/failure/valid; shared error NoticeBox and live updates; token forwarding unchanged. | Six invitation tests and all fixture browser states |

## Intentional exceptions and limits

- App and vault backgrounds/ink retain #2 scoped aliases. Public-key green and private-key blue-teal are identities, not interchangeable generic success. Loaded/remembered/downloaded/verified remain textually separate.
- Workspace controls retain 10px radius; other catalog controls use the 8px role. Four-column mobile tool badges remain supplementary 10px text to fit fixed navigation; full status is available in the tab name and 12px capability notice. Other instructions/metadata are at least 12px.
- Invitation keeps the existing neutral dark CTA in the marketing shell. It gets scoped tokens/focus/status, not app sidebar CSS. Marketing header/footer mobile navigation and contrast are owned by #5–#8 and unchanged here.
- Native backup file input remains explicit beside its existing backup-specific label rather than being replaced with a drop zone; retrieved-file selection and clearing behavior are unchanged. Folder picking remains browser-specific progressive enhancement, with downloads as the tested path.
- Signature classification is deliberately not rewritten. In particular an unknown/empty result is not upgraded to verified, and successful decryption alone never creates a verification label.
- Existing security/registration/invitation claims remain unchanged pending the source/content decisions for #5–#8. #4 adds no recovery, identity-trust, email-delivery, offline, or legal promises.
- Wizard retains existing local state/unmount semantics when backing out of a file step; no new retention of plaintext, files, passphrases or keys. Direct tool tab switching still keeps islands mounted. Nano Stores, OpenPGP helpers, backup/storage routines, navigation controller and API client were not edited.
- No screen-reader, OS high-contrast, native zoom, Safari/Firefox, real remote directory/keyserver/email, real password-manager sync, or OS folder-picker certification. 320px reflow and CSS 200% text emulation are explicitly not native zoom tests.
- The pre-existing direct-Keyring `aria-current` hydration warning noted in #3 may still occur in development; no runtime page errors occurred in the recorded flow script. No unrelated navigation/store rearchitecture was attempted.
