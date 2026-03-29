/**
 * Test setup helper.
 * Creates the minimal DOM structure that app.js expects,
 * then loads app.js so all functions are available on `window`.
 *
 * Security note: innerHTML usage here is safe — content is a static
 * string literal used only in test setup, not derived from external input.
 * vm.runInNewContext evaluates our own app.js source file in tests only.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

// Augment Window with all globals injected by app.js via vm.runInNewContext
declare global {
  interface Window {
    // State
    state: AppState;
    // Tab navigation
    activeTab: 'encrypt' | 'decrypt' | 'keys' | 'wizard';
    switchTab: (tab: 'encrypt' | 'decrypt' | 'keys' | 'wizard') => void;
    // Wizard navigation
    wizardFlow: 'encrypt' | 'decrypt' | null;
    wizardStep: number;
    startWizardFlow: (flow: 'encrypt' | 'decrypt') => void;
    wizardAdvance: () => void;
    wizardBack: () => void;
    showWizardHome: () => void;
    updateWizardProgress: () => void;
    // Legacy shims
    startFlow: (flow: 'encrypt' | 'decrypt') => void;
    advanceStep: () => void;
    navigateBack: () => void;
    startOver: () => void;
    updateProgressBar: () => void;
    // Contacts
    getContacts: () => Contact[];
    saveContact: (email: string, name: string, armoredPublicKey: string, fingerprint: string) => Contact[];
    removeContact: (email: string) => Contact[];
    clearContacts: () => void;
    renderContactList: () => void;
    selectContact: (contact: Contact) => Promise<void>;
    refreshContact: (email: string) => Promise<void>;
    updateRecipientDisplay: () => void;
    // Keys tab
    activeKeysSubtab: 'private' | 'public';
    switchKeysSubtab: (subtab: 'private' | 'public') => void;
    showKeysGenerateForm: () => void;
    showKeysImportForm: () => void;
    showKeysChoiceScreen: () => void;
    renderKeysTab: () => void;
    showKeyImportForm: () => void;
    doGenerateKeysTab: () => Promise<void>;
    applyImportKeyTab: () => Promise<void>;
    // Key status
    updateKeysLoadedState: () => void;
    updateKeyStatus: () => void;
    updateDecryptKeyBadge: () => void;
    // Toast
    toast: (msg: string, type?: ToastType) => void;
    // DOM helpers
    createStatusBox: (text: string, subText: string | null, type: StatusType) => HTMLElement;
    setElementContent: (el: HTMLElement, node: Node) => void;
    // Key generation
    generateKeys: () => void;
    doGenerateKeysDecrypt: () => Promise<void>;
    _generateKeys: (nameId: string, emailId: string, passphraseId: string, btnId: string) => Promise<void>;
    // Signing
    generateKeysForSigning: () => void;
    doGenerateKeysSign: () => Promise<void>;
    _generateKeysForSigning: (nameId: string, emailId: string, passphraseId: string, btnId: string) => Promise<void>;
    toggleSignSection: () => void;
    updateSignSection: () => void;
    // Key import
    handleImportFileSelect: (event: Event) => void;
    applyImportKey: () => Promise<void>;
    applyImportKeyForSigning: () => Promise<void>;
    // Recipient lookup
    lookupRecipient: () => Promise<void>;
    importRecipientKeyFile: (event: Event) => Promise<void>;
    // File selection
    handleFileSelect: (event: { target: { files: File[] } }) => void;
    handleEncryptedFileSelect: (event: { target: { files: File[] } }) => void;
    // Encrypt / decrypt
    updateEncryptButton: () => void;
    encryptFile: () => Promise<void>;
    updateDecryptButton: () => void;
    lookupSender: () => Promise<void>;
    importSenderKeyFile: (event: Event) => Promise<void>;
    decryptFile: () => Promise<void>;
    // UI resets
    resetRecipientUI: () => void;
    resetEncryptFileUI: () => void;
    resetDecryptFileUI: () => void;
    resetEncryptFile: () => void;
    resetDecryptFile: () => void;
    // Quick encrypt
    renderQuickContactList: (contacts: Contact[], query: string) => void;
    filterQuickContacts: (query: string) => void;
    openQuickPanel: (contact: Contact) => void;
    closeQuickPanel: () => void;
    handleQuickFileSelect: (event: Event) => void;
    toggleQuickSign: () => void;
    encryptQuick: () => Promise<void>;
    resetQuickPanel: () => void;
    // Utility
    downloadTextFile: (text: string, filename: string) => void;
    downloadBlob: (blob: Blob, filename: string) => void;
    downloadPublicKey: () => void;
    downloadPrivateKey: () => void;
    copyPublicKey: () => void;
    sharePublicKeyViaEmail: () => void;
    publishPublicKey: () => Promise<void>;
    formatSize: (bytes: number) => string;
    escHtml: (str: string) => string;
    copyInvite: () => void;
    // openpgp global (CDN)
    openpgp: typeof import('openpgp');
  }
}

// Static HTML string for test DOM setup — no external input involved
const STATIC_TEST_HTML = [
  // Tab nav buttons
  '<nav>',
  '  <button class="app-tab active" data-tab="encrypt">Encrypt</button>',
  '  <button class="app-tab" data-tab="decrypt">Decrypt</button>',
  '  <button class="app-tab" data-tab="keys">Keys</button>',
  '  <button class="app-tab" data-tab="wizard">Wizard</button>',
  '</nav>',

  // ── Encrypt tab ──────────────────────────────────────────────
  '<div id="tab-encrypt">',
  '  <input id="quick-search" type="text"/>',
  '  <div id="quick-contact-list"></div>',
  '  <div id="quick-empty" class="hidden"><p id="quick-empty-msg"></p></div>',
  '  <div id="quick-encrypt-panel" class="hidden">',
  '    <p id="quick-panel-name"></p><p id="quick-panel-fp"></p>',
  '    <label id="quick-drop-zone" class="drop-zone"><input type="file" id="quick-file-input"/></label>',
  '    <div id="quick-file-info" class="hidden"></div>',
  '    <input type="checkbox" id="quick-sign"/>',
  '    <div id="quick-sign-status" class="hidden"></div>',
  '    <button id="btnEncryptQuick" disabled>Encrypt &amp; Download</button>',
  '    <div id="quick-success" class="hidden"><p id="quick-success-text"></p></div>',
  '  </div>',
  '</div>',

  // ── Decrypt tab ──────────────────────────────────────────────
  '<div id="tab-decrypt" class="hidden">',
  '  <div id="decrypt-key-badge" class="hidden"><span id="decrypt-key-badge-label"></span></div>',
  '  <div id="decrypt-no-keys"></div>',
  '  <label id="decryptDropZone" class="drop-zone"><input type="file" id="fileToDecrypt" class="hidden"/></label>',
  '  <div id="encryptedFileInfo" class="hidden"></div>',
  '  <div id="decrypt-sender-contacts" class="hidden"></div>',
  '  <input id="senderEmail" type="email"/><div id="senderStatus" class="hidden"></div>',
  '  <button id="btnDecrypt" disabled>Decrypt</button>',
  '  <div id="decryptResult" class="hidden"><p id="decryptResultText"></p></div>',
  '</div>',

  // ── Keys tab ─────────────────────────────────────────────────
  '<div id="tab-keys" class="hidden">',
  '  <div id="keys-subtab-bar">',
  '    <button class="keys-subtab active" data-keys-subtab="private">Private Key</button>',
  '    <button class="keys-subtab" data-keys-subtab="public">Public Keys</button>',
  '  </div>',
  '  <div id="keys-panel-private">',
  '    <div id="keys-private-empty">',
  '      <button id="btnGenerateKeys">Create My Keys</button>',
  '    </div>',
  '    <div id="keys-private-generate" class="hidden">',
  '      <input id="genNameKeys" type="text"/>',
  '      <input id="genEmailKeys" type="email"/>',
  '      <input id="genPassphraseKeys" type="password"/>',
  '      <button id="btnDoGenerateKeys">Generate Keys &amp; Download</button>',
  '    </div>',
  '    <div id="keys-private-import" class="hidden">',
  '      <label id="importDropLabelKeys" class="drop-zone"><input type="file" id="importKeyFileInputKeys" class="hidden"/><p id="importFileLabelKeys">Drop key file</p></label>',
  '      <input id="importPassphraseKeys" type="password"/>',
  '      <button id="btnImportKeys" disabled>Import Keys</button>',
  '    </div>',
  '    <div id="keys-private-loaded" class="hidden">',
  '      <p id="keys-loaded-name"></p><p id="keys-loaded-fp"></p>',
  '      <button id="btnDownloadPublic">Download Public Key</button>',
  '      <button id="btnDownloadPrivate">Download Private Key</button>',
  '    </div>',
  '  </div>',
  '  <div id="keys-panel-public" class="hidden">',
  '    <div id="keys-your-public-loaded" class="hidden"></div>',
  '    <div id="keys-your-public-empty"></div>',
  '    <div id="saved-contacts-keys" class="hidden"></div>',
  '    <div id="saved-contacts-keys-empty"></div>',
  '    <div id="publish-status" class="hidden"></div>',
  '  </div>',
  '</div>',

  // ── Wizard tab ───────────────────────────────────────────────
  '<div id="tab-wizard" class="hidden">',
  // Wizard home
  '  <div id="wizard-home">',
  '    <button onclick="startWizardFlow(\'encrypt\')">Encrypt a File</button>',
  '    <button onclick="startWizardFlow(\'decrypt\')">Decrypt a File</button>',
  '  </div>',
  // Progress bar
  '  <div id="wizard-progress" class="hidden">',
  '    <button id="wizard-back-btn">Back</button>',
  '    <div id="wizard-step-indicators"></div>',
  '  </div>',

  // Wizard screen: encrypt → recipient
  '  <section id="wizard-encrypt-recipient" class="hidden">',
  '    <div id="saved-contacts" class="hidden"></div>',
  '    <input id="recipientEmail" type="email"/><button id="btnLookup">Find Their Key</button>',
  '    <div id="recipientStatus" class="hidden"></div>',
  '    <div id="inviteBox" class="hidden"><div id="inviteText"></div></div>',
  '    <div id="recipient-continue" class="hidden"><button onclick="wizardAdvance()">Continue</button></div>',
  '  </section>',

  // Wizard screen: encrypt → file
  '  <section id="wizard-encrypt-file" class="hidden">',
  '    <div id="encrypt-recipient-info" class="hidden"><p id="encrypt-recipient-name"></p><p id="encrypt-recipient-email"></p></div>',
  '    <label id="encryptDropZone" class="drop-zone"><input type="file" id="fileToEncrypt" class="hidden"/></label>',
  '    <div id="selectedFileInfo" class="hidden"></div>',
  '    <input type="checkbox" id="signFile"/>',
  '    <div id="sign-key-setup" class="hidden">',
  '      <div id="sign-keys-loaded" class="hidden"><p id="sign-keys-loaded-info"></p><p id="sign-keys-loaded-fp"></p></div>',
  '      <div id="sign-keys-form">',
  '        <button id="btnGenerateSign">Create My Keys</button>',
  '        <div id="generate-form-sign" class="hidden">',
  '          <input id="genNameSign" type="text"/>',
  '          <input id="genEmailSign" type="email"/>',
  '          <input id="genPassphraseSign" type="password"/>',
  '          <button id="btnDoGenerateSign">Generate Keys</button>',
  '        </div>',
  '        <details id="import-toggle-sign"><summary>I already have keys</summary><div>',
  '          <label id="importDropLabelSign" class="drop-zone"><input type="file" id="importKeyFileInputSign" class="hidden"/><p id="importFileLabelSign">Drop key</p></label>',
  '          <input id="importPassphraseSign" type="password"/><button id="btnImportSign" disabled>Import Key</button>',
  '        </div></details>',
  '      </div>',
  '    </div>',
  '    <button id="btnEncrypt" disabled>Encrypt</button>',
  '    <div id="encrypt-success" class="hidden"><p id="encrypt-success-text"></p></div>',
  '  </section>',

  // Wizard screen: decrypt → keys
  '  <section id="wizard-decrypt-keys" class="hidden">',
  '    <div id="decrypt-keys-loaded" class="hidden"><p id="decrypt-keys-loaded-info"></p><p id="decrypt-keys-loaded-fp"></p></div>',
  '    <div id="decrypt-keys-setup">',
  '      <button id="btnGenerateDecrypt">Create My Keys</button>',
  '      <div id="generate-form-decrypt" class="hidden">',
  '        <input id="genNameDecrypt" type="text"/>',
  '        <input id="genEmailDecrypt" type="email"/>',
  '        <input id="genPassphraseDecrypt" type="password"/>',
  '        <button id="btnDoGenerateDecrypt">Generate</button>',
  '      </div>',
  '      <details id="import-toggle-decrypt"><summary>I already have keys</summary><div>',
  '        <label id="importDropLabelDecrypt" class="drop-zone"><input type="file" id="importKeyFileInputDecrypt" class="hidden"/><p id="importFileLabelDecrypt">Drop key</p></label>',
  '        <input id="importPassphraseDecrypt" type="password"/><button id="btnImportDecrypt" disabled>Import</button>',
  '      </div></details>',
  '    </div>',
  '  </section>',

  // Wizard screen: decrypt → file
  '  <section id="wizard-decrypt-file" class="hidden">',
  '    <label id="decryptDropZoneWizard" class="drop-zone"><input type="file" id="fileToDecryptWizard" class="hidden"/></label>',
  '    <div id="encryptedFileInfoWizard" class="hidden"></div>',
  '    <div id="wizard-sender-contacts" class="hidden"></div>',
  '    <input id="senderEmailWizard" type="email"/><div id="senderStatusWizard" class="hidden"></div>',
  '    <button id="btnDecryptWizard" disabled>Decrypt</button>',
  '    <div id="decryptResultWizard" class="hidden"><p id="decryptResultTextWizard"></p></div>',
  '  </section>',
  '</div>',

  // Global: key status float + toast
  '<div id="keyStatusFloat"><div id="keyStatus" class="key-pill">No keys loaded</div></div>',
  '<div id="toast" class="hidden"><div id="toastInner"></div></div>',
].join('\n');

export function setupDOM(): void {
  // Safe: static HTML string literal for test DOM — no external input
  document.body.innerHTML = STATIC_TEST_HTML; // eslint-disable-line no-unsanitized/property
  // Mock localStorage
  const store: Record<string, string> = {};
  window.localStorage = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, val: string) => { store[key] = String(val); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    length: 0,
    key: vi.fn(() => null),
  };
  window.openpgp = createMockOpenpgp() as typeof import('openpgp');
  const appJs = readFileSync(join(import.meta.dirname, '..', 'public', 'js', 'app.js'), 'utf-8');
  // Safe: evaluates our own source file in test context only
  vm.runInNewContext(appJs, window as unknown as vm.Context);
}

export function getState(): AppState {
  return window.state;
}

export function createMockOpenpgp(): Partial<typeof import('openpgp')> {
  return {
    generateKey: vi.fn().mockResolvedValue({
      privateKey: '-----BEGIN PGP PRIVATE KEY BLOCK-----\nmock-private\n-----END PGP PRIVATE KEY BLOCK-----',
      publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock-public\n-----END PGP PUBLIC KEY BLOCK-----',
    }),
    readPrivateKey: vi.fn().mockResolvedValue({
      isDecrypted: () => false,
      users: [{ userID: { userID: 'Test User <test@example.com>' } }],
      toPublic: () => ({
        armor: () => '-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock\n-----END PGP PUBLIC KEY BLOCK-----',
        getFingerprint: () => 'abcdef1234567890abcdef1234567890abcdef12',
      }),
      getFingerprint: () => 'abcdef1234567890abcdef1234567890abcdef12',
    }),
    readKey: vi.fn().mockResolvedValue({
      users: [{ userID: { userID: 'Test User <test@example.com>' } }],
      getFingerprint: () => 'abcdef1234567890abcdef1234567890abcdef12',
    }),
    decryptKey: vi.fn().mockImplementation(async ({ privateKey }: { privateKey: unknown }) => ({
      ...(privateKey as object),
      isDecrypted: () => true,
      toPublic: () => ({
        armor: () => '-----BEGIN PGP PUBLIC KEY BLOCK-----\nmock\n-----END PGP PUBLIC KEY BLOCK-----',
        getFingerprint: () => 'abcdef1234567890abcdef1234567890abcdef12',
      }),
      getFingerprint: () => 'abcdef1234567890abcdef1234567890abcdef12',
    })),
    createMessage: vi.fn().mockResolvedValue({}),
    encrypt: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    readMessage: vi.fn().mockResolvedValue({}),
    decrypt: vi.fn().mockResolvedValue({
      data: new Uint8Array([4, 5, 6]),
      filename: 'decrypted.txt',
      signatures: [],
    }),
  };
}
