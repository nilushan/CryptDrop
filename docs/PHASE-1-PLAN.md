# Phase 1: Reframe & Guided UX

## Overview

Restructure the CryptDrop app page from a tab-based layout into a wizard-style flow with clear step progression. The user chooses a path upfront ("Encrypt a file" or "Decrypt a file") and is guided through each step with progress indicators, inline explanations, and simplified language.

## Goals

- Replace "send files" language with "encrypt files" / "decrypt files"
- Two explicit entry paths: Encrypt vs Decrypt
- Wizard-style step-by-step flow with progress indicators
- Simplified key generation ("Create My Keys" as primary action)
- Advanced options (import existing keys) behind a toggle
- Inline educational context using the padlock analogy
- Zero infrastructure changes — purely frontend

## Architecture

### Deployment Target
- **Frontend**: Cloudflare Pages (static Astro output)
- **Backend** (future Phase 2): Cloudflare Workers + D1

### Tech Stack (unchanged)
- Astro 5.x (static site generator)
- OpenPGP.js (client-side encryption)
- Vanilla JS (no framework dependency)
- Custom utility CSS classes

## User Flows

### Flow A: "I want to encrypt a file for someone"

```
[Path Selection] → [Step 1: Find Recipient] → [Step 2: Encrypt File]
                                                 └─ Optional: sign with your keys
```

Encrypting only requires the **recipient's public key**. The sender's private key is only needed for **signing** (optional).

1. **Path Selection Screen**
   - Two cards: "Encrypt a File" and "Decrypt a File"
   - Brief description on each card
   - Padlock analogy teaser linking to /how-it-works

2. **Step 1: Find Recipient**
   - Email lookup on keyserver
   - Import key file alternative
   - "Recipient not found" → invitation instructions
   - Shows recipient confirmation with fingerprint

3. **Step 2: Encrypt & Download**
   - File drop zone
   - Optional signing section (checkbox, unchecked by default)
   - If signing checked and no keys: inline key setup appears
   - If signing checked and keys loaded: shows "Signing as: ..." confirmation
   - Encrypt button (enabled when recipient key + file selected, regardless of signing)
   - Success state with download

### Flow B: "I received an encrypted file"

```
[Path Selection] → [Step 1: Set Up Your Keys] → [Step 2: Select Encrypted File] → [Step 3: Decrypt]
```

1. **Path Selection Screen** (same as Flow A)

2. **Step 1: Set Up Your Keys** (same as Flow A)

3. **Step 2: Select Encrypted File**
   - Drop zone for .pgp/.gpg/.asc files
   - Optional: verify sender by email lookup or key import

4. **Step 3: Decrypt & Download**
   - Decrypt button
   - Signature verification result
   - Success state with download

## Component Breakdown

### HTML Structure (`src/pages/app/index.astro`)

```
Layout
├── Progress Bar (steps indicator)
├── Path Selection Screen (#screen-path-select)
│   ├── Encrypt Card
│   └── Decrypt Card
├── Encrypt Flow Screens
│   ├── #screen-encrypt-keys (Step 1)
│   ├── #screen-encrypt-recipient (Step 2)
│   └── #screen-encrypt-file (Step 3)
├── Decrypt Flow Screens
│   ├── #screen-decrypt-keys (Step 1)
│   ├── #screen-decrypt-file (Step 2)
│   └── #screen-decrypt-result (Step 3)
├── Key Status Indicator (floating)
└── Toast Notifications
```

### JavaScript Structure (`public/js/app.js`)

The existing monolithic app.js is refactored into clear sections:

1. **State Management** — app state object, state update functions
2. **Wizard Navigation** — screen transitions, progress bar updates, back/forward
3. **Key Management** — generate, import, export, status updates
4. **Encryption Flow** — recipient lookup, file selection, encrypt
5. **Decryption Flow** — file selection, sender lookup, decrypt
6. **UI Utilities** — toast, drag-drop, file helpers, HTML escaping

### Progress Indicator

Visual breadcrumb showing current step:

```
Encrypt Flow: [Keys] → [Recipient] → [Encrypt]
Decrypt Flow: [Keys] → [File] → [Decrypt]
```

- Completed steps: filled circle + green
- Current step: highlighted circle + indigo
- Future steps: empty circle + gray

## State Shape

```javascript
let state = {
  // Existing
  privateKey: null,
  publicKey: null,
  armoredPublic: null,
  armoredPrivate: null,
  recipientKey: null,
  senderKey: null,
  selectedFile: null,
  encryptedFile: null,
  userInfo: null,

  // New: wizard state
  currentFlow: null,       // 'encrypt' | 'decrypt' | null
  currentStep: 0,          // 0 = path select, 1-3 = flow steps
};
```

## Copy Changes

| Before | After |
|--------|-------|
| "Your Keys" tab | "Set Up Your Keys" step |
| "Generate New" | "Create My Keys" |
| "Import Existing" | "I already have keys" |
| "Encrypt" tab | "Encrypt a File" path card |
| "Decrypt" tab | "Decrypt a File" path card |
| "Find Key" | "Find Their Public Key" |
| "Encrypt & Download" | "Encrypt & Download File" |
| "Decrypt & Download" | "Decrypt & Download File" |

## Educational Inline Tips

Each step includes a collapsible/subtle tip:

- **Keys step**: "Think of your keys like a padlock system — your public key is an open padlock anyone can close, but only your private key can open it."
- **Recipient step**: "You need their public key (their open padlock) to lock the file so only they can open it."
- **Encrypt step**: "The file is encrypted right here in your browser. It never leaves your device unencrypted."
- **Decrypt step**: "Only your private key can decrypt this file. No one else — not even CryptDrop — can read it."

## File Changes

| File | Change |
|------|--------|
| `src/pages/app/index.astro` | Complete rewrite — wizard UI |
| `public/js/app.js` | Refactor — add wizard nav, keep crypto logic |
| `src/layouts/Layout.astro` | No changes |

## Testing Strategy

- **Unit tests** (Vitest + jsdom): wizard navigation, state management, utility functions
- **DOM interaction tests**: screen transitions, button states, progress updates
- **Crypto function tests**: mock openpgp.js, test encrypt/decrypt flow orchestration

## Open Decisions for Future Phases

- localStorage persistence for returning users (Phase 4)
- Key dashboard with fingerprint + history (Phase 4)
- Server-side recipient lookup fallback (Phase 2)
- SendGrid invitation emails (Phase 3)
