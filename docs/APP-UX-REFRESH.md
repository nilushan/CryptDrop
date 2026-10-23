# App workspace refresh

## Scope

Refresh `/app` for everyday file sharing and portfolio presentation. Keep Astro/React islands, Nano Stores, OpenPGP.js, existing key storage and backend contracts. No new UI dependencies, no landing-page redesign, and no crypto algorithm changes.

## Research and design decisions

Official product pages reviewed through Exa search. The design lessons below are our interpretation, not security endorsements or interoperability claims.

| Tool | Observed product approach | Applied to CryptDrop |
| --- | --- | --- |
| [hat.sh](https://hat.sh/) | Browser-local file encryption with file selection and staged steps | Visible task progression, accessible native file picker, local-processing explanation |
| [Encrypto](https://macpaw.com/encrypto) | Drop files, protect them, then save/share | Keep the main action obvious and make the resulting download easy to use |
| [Cryptomator](https://cryptomator.org/) | Local encryption with a vault metaphor and plain-language ownership messaging | Explain public/private keys in human terms and emphasize backups |
| [Gpg4win / Kleopatra](https://gpg4win.org/doc/en/gpg4win-compendium_24.html) | Recipient selection, signing, encryption and decryption as explicit operations | Preserve recipient fingerprints and optional signatures rather than hiding security choices |
| [Proton Drive](https://proton.me/drive/security) | End-to-end encrypted cloud storage with accessible privacy explanations | Put the privacy model next to the work; do not imply CryptDrop provides hosted storage |

These products have different formats and security models. CryptDrop remains an OpenPGP tool; this refresh does not add password-only encryption or compatibility with their proprietary formats.

## What changed

- Dedicated app shell: desktop sidebar, horizontally scrollable mobile tabs, contextual key/privacy guidance.
- Task-first entry: Encrypt opens by default, with guided setup still one click away.
- Recipient lookup/import directly within Encrypt instead of requiring an Address Book detour.
- Clearer decryption prerequisite: an existing file needs its matching private key, not a newly generated key.
- Normal downloads remain the default; unsupported custom-folder saving is not treated as an error.
- Accessible tab roles, arrow/Home/End navigation, URL deep links, skip link and focus transfer for cross-panel actions.
- Keyboard-accessible native file inputs, focus after recipient selection/removal, visible focus rings, reduced-motion support.
- Responsive results including long download filenames; secondary button contrast fixes.
- Privacy wording distinguishes local file contents/private keys from network key lookups and email operations.

## Validation

- `npm test`: 40 tests pass, including 11 new navigation/component tests. UI tests mock cryptography; existing crypto tests remain unchanged.
- `npm run build`: passes.
- `git diff --check`: passes.
- Chromium browser test with freshly generated, synthetic PGP keys:
  - Import public key in Encrypt, select file, encrypt and download.
  - Independently decrypt browser output with OpenPGP.js and compare exact contents.
  - Select encrypted file, move to Key Ring, import a passphrase-protected private key, return to Decrypt without losing the selected file.
  - Decrypt and download; recovered contents match the original exactly.
  - All five tabs at 1440, 768, 390 and 320px: one visible panel and no document-level overflow.
  - No browser JavaScript errors or external requests in this local-import workflow.
- Independent read-only review: secondary-button contrast and inline-transition focus findings fixed and covered by follow-up checks.

### Existing validation debt

`npm run typecheck` reports four existing errors. The same errors were reproduced against untouched commit `5bf17c1` in a temporary checkout:

- `functions/api/[[catchall]].ts`: missing `Fetcher`, missing `PagesFunction`, implicitly-any `context`.
- `tests/decrypt-signed.test.ts`: `null` passed where `PrivateKey | undefined` is expected.

Online email lookup, invitations, and notification delivery were not exercised against live services. No claim of full WCAG compliance or cross-browser certification is made. Nothing was deployed.
