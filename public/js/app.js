// ==================== STATE ====================
/** @type {AppState} */
var state = {
  privateKey: null,
  publicKey: null,
  armoredPublic: null,
  armoredPrivate: null,
  recipientKey: null,
  senderKey: null,
  selectedFile: null,
  encryptedFile: null,
  userInfo: null,
  // Wizard state
  currentFlow: null,
  currentStep: 0,
  recipientInfo: null,
};

/** @type {Contact | null} */
var quickContact = null;

// ==================== CONTACTS (localStorage) ====================
var CONTACTS_KEY = 'cryptdrop_contacts';

/** @returns {Contact[]} */
function getContacts() {
  try {
    var raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

/**
 * @param {string} email
 * @param {string} name
 * @param {string} armoredPublicKey
 * @param {string} fingerprint
 * @returns {Contact[]}
 */
function saveContact(email, name, armoredPublicKey, fingerprint) {
  var contacts = getContacts();
  var existing = contacts.findIndex(function(c) { return c.email === email; });
  var entry = {
    email: email,
    name: name || '',
    armoredPublicKey: armoredPublicKey,
    fingerprint: fingerprint || '',
    lastUpdated: new Date().toISOString(),
  };
  if (existing >= 0) {
    contacts[existing] = entry;
  } else {
    contacts.push(entry);
  }
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  return contacts;
}

/**
 * @param {string} email
 * @returns {Contact[]}
 */
function removeContact(email) {
  var contacts = getContacts().filter(function(c) { return c.email !== email; });
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  return contacts;
}

function clearContacts() {
  localStorage.removeItem(CONTACTS_KEY);
}

/** @returns {void} */
function renderContactList() {
  var listEl = /** @type {HTMLElement} */ (document.getElementById('saved-contacts'));
  if (!listEl) return;
  var contacts = getContacts();
  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
  if (contacts.length === 0) {
    listEl.classList.add('hidden');
    return;
  }
  listEl.classList.remove('hidden');
  var heading = document.createElement('p');
  heading.className = 'text-xs font-medium text-gray-500 mb-2';
  heading.textContent = 'Saved Recipients';
  listEl.appendChild(heading);

  contacts.forEach(function(/** @type {Contact} */ contact) {
    var row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 mb-1';

    var info = document.createElement('button');
    info.className = 'flex-1 text-left cursor-pointer bg-transparent border-0 p-0';
    info.type = 'button';
    var nameSpan = document.createElement('span');
    nameSpan.className = 'text-sm font-medium text-gray-800 block';
    nameSpan.textContent = contact.name || contact.email;
    var emailSpan = document.createElement('span');
    emailSpan.className = 'text-xs text-gray-500 block';
    emailSpan.textContent = contact.name ? contact.email : '';
    info.appendChild(nameSpan);
    if (contact.name) info.appendChild(emailSpan);
    info.addEventListener('click', function() { selectContact(contact); });

    var actions = document.createElement('div');
    actions.className = 'flex gap-1';

    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer bg-transparent border-0 px-1';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.addEventListener('click', function(e) { e.stopPropagation(); refreshContact(contact.email); });

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'text-xs text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-0 px-1';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', function(e) { e.stopPropagation(); removeContact(contact.email); renderContactList(); });

    actions.appendChild(refreshBtn);
    actions.appendChild(removeBtn);
    row.appendChild(info);
    row.appendChild(actions);
    listEl.appendChild(row);
  });
}

/**
 * @param {Contact} contact
 * @returns {Promise<void>}
 */
async function selectContact(contact) {
  try {
    state.recipientKey = await openpgp.readKey({ armoredKey: contact.armoredPublicKey });
    state.recipientInfo = { email: contact.email, name: contact.name, fingerprint: contact.fingerprint };
    var statusEl = /** @type {HTMLElement} */ (document.getElementById('recipientStatus'));
    var fp = state.recipientKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
    statusEl.classList.remove('hidden');
    setElementContent(statusEl, createStatusBox('Recipient: ' + (contact.name || contact.email), 'Fingerprint: ' + fp, 'success'));
    /** @type {HTMLElement} */ (document.getElementById('inviteBox')).classList.add('hidden');
    /** @type {HTMLElement} */ (document.getElementById('recipient-continue')).classList.remove('hidden');
    /** @type {HTMLInputElement} */ (document.getElementById('recipientEmail')).value = contact.email;
    updateEncryptButton();
    updateRecipientDisplay();
    toast('Loaded saved recipient', 'success');
  } catch (e) {
    toast('Failed to load saved key — try refreshing', 'error');
  }
}

/**
 * @param {string} email
 * @returns {Promise<void>}
 */
async function refreshContact(email) {
  toast('Refreshing key for ' + email + '...', 'info');
  try {
    var resp = await fetch('https://keys.openpgp.org/vks/v1/by-email/' + encodeURIComponent(email));
    if (!resp.ok) { toast('Key not found on keyserver for ' + email, 'warning'); return; }
    var armored = await resp.text();
    var key = await openpgp.readKey({ armoredKey: armored });
    var uid = key.users[0] && key.users[0].userID ? key.users[0].userID.userID : email;
    var fp = key.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
    var name = uid.indexOf('<') > 0 ? uid.substring(0, uid.indexOf('<')).trim() : '';
    saveContact(email, name, armored, fp);
    renderContactList();
    toast('Key refreshed for ' + email, 'success');
  } catch (e) {
    toast('Refresh failed: ' + (/** @type {Error} */ (e)).message, 'error');
  }
}

/** @returns {void} */
function updateRecipientDisplay() {
  var el = document.getElementById('encrypt-recipient-info');
  if (!el) return;
  if (state.recipientInfo) {
    el.classList.remove('hidden');
    var nameEl = document.getElementById('encrypt-recipient-name');
    if (nameEl) nameEl.textContent = state.recipientInfo.name || state.recipientInfo.email;
    var emailEl = document.getElementById('encrypt-recipient-email');
    if (emailEl) emailEl.textContent = state.recipientInfo.name ? state.recipientInfo.email : '';
  } else {
    el.classList.add('hidden');
  }
}

// ==================== TAB NAVIGATION ====================
/** @type {'encrypt' | 'decrypt' | 'keys' | 'wizard'} */
var activeTab = 'encrypt';

/**
 * @param {'encrypt' | 'decrypt' | 'keys' | 'wizard'} tab
 */
function switchTab(tab) {
  activeTab = tab;
  // Update tab button styles
  document.querySelectorAll('.app-tab').forEach(function(btn) {
    btn.classList.remove('active');
    if (/** @type {HTMLElement} */ (btn).dataset.tab === tab) btn.classList.add('active');
  });
  // Show/hide panels
  ['encrypt', 'decrypt', 'keys', 'wizard'].forEach(function(t) {
    var panel = document.getElementById('tab-' + t);
    if (panel) panel.classList.toggle('hidden', t !== tab);
  });

  if (tab === 'encrypt') {
    renderQuickContactList(getContacts(), '');
    var searchEl = /** @type {HTMLInputElement | null} */ (document.getElementById('quick-search'));
    if (searchEl) searchEl.value = '';
  }
  if (tab === 'decrypt') {
    renderDecryptSenderContacts();
    updateDecryptKeyBadge();
    updateDecryptButton();
  }
  if (tab === 'keys') {
    renderKeysTab();
  }
  if (tab === 'wizard') {
    renderContactList();
    renderWizardSenderContacts();
    updateSignSection();
  }
}

// ==================== WIZARD NAVIGATION ====================
/** @type {'encrypt' | 'decrypt' | null} */
var wizardFlow = null;
/** @type {number} */
var wizardStep = 0;

/** @type {Record<'encrypt' | 'decrypt', string[]>} */
var WIZARD_SCREENS = {
  encrypt: ['wizard-encrypt-recipient', 'wizard-encrypt-file'],
  decrypt: ['wizard-decrypt-keys', 'wizard-decrypt-file'],
};

/** @type {Record<'encrypt' | 'decrypt', string[]>} */
var WIZARD_LABELS = {
  encrypt: ['Find Recipient', 'Encrypt File'],
  decrypt: ['Your Keys', 'Decrypt File'],
};

/**
 * @param {'encrypt' | 'decrypt'} flow
 */
function startWizardFlow(flow) {
  wizardFlow = flow;
  wizardStep = 1;
  showWizardScreen(WIZARD_SCREENS[flow][0]);
  updateWizardProgress();
  if (flow === 'decrypt') updateKeysLoadedState();
  if (flow === 'encrypt') { updateSignSection(); renderContactList(); }
}

function wizardAdvance() {
  if (!wizardFlow) return;
  var screens = WIZARD_SCREENS[wizardFlow];
  var next = wizardStep + 1;
  if (next > screens.length) return;
  wizardStep = next;
  showWizardScreen(screens[next - 1]);
  updateWizardProgress();
  if (wizardFlow === 'encrypt') updateRecipientDisplay();
}

function wizardBack() {
  if (!wizardFlow) { showWizardHome(); return; }
  if (wizardStep <= 1) { showWizardHome(); return; }
  wizardStep--;
  showWizardScreen(WIZARD_SCREENS[wizardFlow][wizardStep - 1]);
  updateWizardProgress();
}

function showWizardHome() {
  wizardFlow = null;
  wizardStep = 0;
  var allScreens = ['wizard-home', 'wizard-encrypt-recipient', 'wizard-encrypt-file', 'wizard-decrypt-keys', 'wizard-decrypt-file'];
  allScreens.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  var home = document.getElementById('wizard-home');
  if (home) home.classList.remove('hidden');
  var progress = document.getElementById('wizard-progress');
  if (progress) progress.classList.add('hidden');
}

/**
 * @param {string} screenId
 */
function showWizardScreen(screenId) {
  var allScreens = ['wizard-home', 'wizard-encrypt-recipient', 'wizard-encrypt-file', 'wizard-decrypt-keys', 'wizard-decrypt-file'];
  allScreens.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  var el = document.getElementById(screenId);
  if (el) el.classList.remove('hidden');
}

function updateWizardProgress() {
  var progress = document.getElementById('wizard-progress');
  var indicators = document.getElementById('wizard-step-indicators');
  if (!progress || !indicators) return;

  if (!wizardFlow || wizardStep === 0) {
    progress.classList.add('hidden');
    return;
  }
  progress.classList.remove('hidden');

  var labels = WIZARD_LABELS[wizardFlow];
  while (indicators.firstChild) indicators.removeChild(indicators.firstChild);

  for (var i = 0; i < labels.length; i++) {
    var stepNum = i + 1;
    var isCompleted = stepNum < wizardStep;
    var isCurrent = stepNum === wizardStep;

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:4px;';

    var circle = document.createElement('div');
    circle.style.cssText = 'width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;';
    circle.style.background = isCompleted ? '#16a34a' : isCurrent ? '#4f46e5' : '#e5e7eb';
    circle.style.color = (isCompleted || isCurrent) ? '#fff' : '#9ca3af';
    circle.textContent = isCompleted ? '\u2713' : String(stepNum);

    var label = document.createElement('span');
    label.style.cssText = 'font-size:12px;white-space:nowrap;';
    label.style.color = isCurrent ? '#4f46e5' : '#9ca3af';
    label.style.fontWeight = isCurrent ? '500' : '400';
    label.textContent = labels[i];

    wrapper.appendChild(circle);
    wrapper.appendChild(label);

    if (i < labels.length - 1) {
      var line = document.createElement('div');
      line.style.cssText = 'width:20px;height:1px;background:#d1d5db;margin:0 2px;';
      wrapper.appendChild(line);
    }
    indicators.appendChild(wrapper);
  }
}

// ==================== SAFE DOM HELPERS ====================
/**
 * @param {string} text
 * @param {string | null} subText
 * @param {StatusType} type
 * @returns {HTMLElement}
 */
function createStatusBox(text, subText, type) {
  /** @type {Record<StatusType, { bg: string; border: string; text: string; sub: string }>} */
  var colors = {
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', sub: 'text-green-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', sub: 'text-amber-600' },
  };
  var c = colors[type] || colors.success;
  var box = document.createElement('div');
  box.className = c.bg + ' border ' + c.border + ' rounded-md p-3';
  var p = document.createElement('p');
  p.className = 'text-sm font-medium ' + c.text;
  p.textContent = text;
  box.appendChild(p);
  if (subText) {
    var sub = document.createElement('p');
    sub.className = 'text-xs ' + c.sub + ' font-mono mt-1';
    sub.textContent = subText;
    box.appendChild(sub);
  }
  return box;
}

/**
 * @param {HTMLElement} el
 * @param {Node} node
 * @returns {void}
 */
function setElementContent(el, node) {
  while (el.firstChild) el.removeChild(el.firstChild);
  el.appendChild(node);
}

// ==================== KEY STATUS ====================
/** @returns {void} */
function updateKeysLoadedState() {
  if (!state.privateKey) return;
  var fp = /** @type {import('openpgp').PublicKey} */ (state.publicKey).getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';

  var loadedEl = document.getElementById('decrypt-keys-loaded');
  var setupEl = document.getElementById('decrypt-keys-setup');
  var infoEl = document.getElementById('decrypt-keys-loaded-info');
  var fpEl = document.getElementById('decrypt-keys-loaded-fp');
  if (loadedEl && setupEl && infoEl && fpEl) {
    loadedEl.classList.remove('hidden');
    setupEl.classList.add('hidden');
    infoEl.textContent = 'Keys loaded: ' + (state.userInfo || 'Unknown');
    fpEl.textContent = 'Fingerprint: ' + fp;
  }
  updateSignSection();
}

/** @returns {void} */
function updateKeyStatus() {
  var el = /** @type {HTMLElement} */ (document.getElementById('keyStatus'));
  if (state.privateKey) {
    var uid = state.userInfo || 'Key loaded';
    el.textContent = uid;
    el.className = 'key-pill key-pill-ok';
  } else {
    el.textContent = 'No keys loaded';
    el.className = 'key-pill';
  }
  updateKeysLoadedState();
  updateEncryptButton();
  updateDecryptButton();
  renderKeysTab();
  updateDecryptKeyBadge();
}

/** @returns {void} */
function updateDecryptKeyBadge() {
  var badge = document.getElementById('decrypt-key-badge');
  var label = document.getElementById('decrypt-key-badge-label');
  var notice = document.getElementById('decrypt-no-keys');
  if (!badge || !notice) return;
  if (state.privateKey) {
    badge.classList.remove('hidden');
    if (label) label.textContent = state.userInfo || 'Key loaded';
    notice.classList.add('hidden');
  } else {
    badge.classList.add('hidden');
    notice.classList.remove('hidden');
  }
}

// ==================== TOAST ====================
/**
 * @param {string} msg
 * @param {ToastType} [type]
 */
function toast(msg, type) {
  type = type || 'info';
  /** @type {HTMLElement & { _timeout?: ReturnType<typeof setTimeout> }} */
  var el = /** @type {HTMLElement & { _timeout?: ReturnType<typeof setTimeout> }} */ (document.getElementById('toast'));
  var inner = /** @type {HTMLElement} */ (document.getElementById('toastInner'));
  /** @type {Record<ToastType, string>} */
  var colors = {
    info: 'bg-gray-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-600 text-white',
  };
  inner.className = 'px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ' + (colors[type] || colors.info);
  inner.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(function() { el.classList.add('hidden'); }, 4000);
}

// ==================== KEYS TAB ====================
/** @type {'private' | 'public'} */
var activeKeysSubtab = 'private';

/**
 * @param {'private' | 'public'} subtab
 */
function switchKeysSubtab(subtab) {
  activeKeysSubtab = subtab;
  // Update sub-tab button styles
  document.querySelectorAll('.keys-subtab').forEach(function(btn) {
    btn.classList.remove('active');
    if (/** @type {HTMLElement} */ (btn).dataset.keysSubtab === subtab) btn.classList.add('active');
  });
  // Toggle panels
  var privatePanel = document.getElementById('keys-panel-private');
  var publicPanel = document.getElementById('keys-panel-public');
  if (privatePanel) privatePanel.classList.toggle('hidden', subtab !== 'private');
  if (publicPanel) publicPanel.classList.toggle('hidden', subtab !== 'public');
  renderKeysTab();
}

function showKeysGenerateForm() {
  var empty = document.getElementById('keys-private-empty');
  var gen = document.getElementById('keys-private-generate');
  var imp = document.getElementById('keys-private-import');
  var loaded = document.getElementById('keys-private-loaded');
  if (empty) empty.classList.add('hidden');
  if (gen) gen.classList.remove('hidden');
  if (imp) imp.classList.add('hidden');
  if (loaded) loaded.classList.add('hidden');
}

function showKeysImportForm() {
  var empty = document.getElementById('keys-private-empty');
  var gen = document.getElementById('keys-private-generate');
  var imp = document.getElementById('keys-private-import');
  var loaded = document.getElementById('keys-private-loaded');
  if (empty) empty.classList.add('hidden');
  if (gen) gen.classList.add('hidden');
  if (imp) imp.classList.remove('hidden');
  if (loaded) loaded.classList.add('hidden');
}

function showKeysChoiceScreen() {
  var empty = document.getElementById('keys-private-empty');
  var gen = document.getElementById('keys-private-generate');
  var imp = document.getElementById('keys-private-import');
  var loaded = document.getElementById('keys-private-loaded');
  if (empty) empty.classList.remove('hidden');
  if (gen) gen.classList.add('hidden');
  if (imp) imp.classList.add('hidden');
  if (loaded) loaded.classList.add('hidden');
}

/** @returns {void} */
function renderKeysTab() {
  var empty = document.getElementById('keys-private-empty');
  var gen = document.getElementById('keys-private-generate');
  var imp = document.getElementById('keys-private-import');
  var loaded = document.getElementById('keys-private-loaded');

  // Private key panel — 4 mutually exclusive states
  if (state.privateKey && state.publicKey) {
    if (empty) empty.classList.add('hidden');
    if (gen) gen.classList.add('hidden');
    if (imp) imp.classList.add('hidden');
    if (loaded) loaded.classList.remove('hidden');
    var fp = /** @type {import('openpgp').PublicKey} */ (state.publicKey).getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
    var nameEl = document.getElementById('keys-loaded-name');
    var fpEl = document.getElementById('keys-loaded-fp');
    if (nameEl) nameEl.textContent = state.userInfo || 'Unknown';
    if (fpEl) fpEl.textContent = 'Fingerprint: ' + fp;
  } else {
    // Only reset to choice screen if no form is currently open
    if (loaded) loaded.classList.add('hidden');
    var genVisible = gen && !gen.classList.contains('hidden');
    var impVisible = imp && !imp.classList.contains('hidden');
    if (!genVisible && !impVisible) {
      if (empty) empty.classList.remove('hidden');
    }
  }

  // Public key panel — loaded vs empty
  var pubLoaded = document.getElementById('keys-your-public-loaded');
  var pubEmpty = document.getElementById('keys-your-public-empty');
  if (pubLoaded && pubEmpty) {
    if (state.publicKey) {
      pubLoaded.classList.remove('hidden');
      pubEmpty.classList.add('hidden');
    } else {
      pubLoaded.classList.add('hidden');
      pubEmpty.classList.remove('hidden');
    }
  }

  // Recipients' public keys section (uses innerHTML with sanitised contact data from localStorage)
  var contactsEl = document.getElementById('saved-contacts-keys');
  var emptyContactsEl = document.getElementById('saved-contacts-keys-empty');
  var contacts = getContacts();
  if (contactsEl && emptyContactsEl) {
    if (contacts.length > 0) {
      contactsEl.classList.remove('hidden');
      emptyContactsEl.classList.add('hidden');
      contactsEl.innerHTML = contacts.map(function(c) { // eslint-disable-line no-unsanitized/property
        var fp8 = c.fingerprint ? c.fingerprint.slice(-8).toUpperCase() : '';
        return '<div class="contact-key-row">' +
          '<div class="contact-key-info">' +
            '<span class="contact-key-name">' + escHtml(c.name || c.email) + '</span>' +
            '<span class="contact-key-email">' + escHtml(c.email) + '</span>' +
            (fp8 ? '<span class="contact-key-fp">…' + escHtml(fp8) + '</span>' : '') +
          '</div>' +
          '<button onclick="removeContact(\'' + c.email.replace(/'/g, "\\'") + '\');renderKeysTab();" class="btn-contact-remove" title="Remove">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>';
      }).join('');
    } else {
      contactsEl.classList.add('hidden');
      emptyContactsEl.classList.remove('hidden');
    }
  }
}

function showKeyImportForm() {
  showKeysChoiceScreen();
}

async function doGenerateKeysTab() {
  await _generateKeys('genNameKeys', 'genEmailKeys', 'genPassphraseKeys', 'btnDoGenerateKeys');
}

async function applyImportKeyTab() {
  if (!pendingImportText) { toast('Select a key file first', 'warning'); return; }
  var passphrase = /** @type {HTMLInputElement} */ (document.getElementById('importPassphraseKeys')).value;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnImportKeys'));
  btn.disabled = true;
  btn.textContent = 'Importing…';
  try {
    var privKey = await openpgp.readPrivateKey({ armoredKey: pendingImportText });
    if (!privKey.isDecrypted()) {
      if (!passphrase) { toast('This key requires a passphrase', 'warning'); btn.disabled = false; btn.textContent = 'Import Keys'; return; }
      try {
        state.privateKey = await openpgp.decryptKey({ privateKey: privKey, passphrase: passphrase });
      } catch (_e) { toast('Wrong passphrase — please try again', 'error'); btn.disabled = false; btn.textContent = 'Import Keys'; return; }
    } else {
      state.privateKey = privKey;
    }
    state.armoredPrivate = pendingImportText;
    state.publicKey = /** @type {import('openpgp').PrivateKey} */ (state.privateKey).toPublic();
    state.armoredPublic = /** @type {import('openpgp').PublicKey} */ (state.publicKey).armor();
    var uid = state.privateKey.users[0] && state.privateKey.users[0].userID ? state.privateKey.users[0].userID.userID : 'Unknown';
    state.userInfo = uid;
    pendingImportText = null;
    updateKeyStatus();
    toast('Keys imported: ' + uid, 'success');
  } catch (e) {
    toast('Import failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Import Keys';
  }
}

// ==================== KEY GENERATION (WIZARD DECRYPT FLOW) ====================
/** @returns {void} */
function generateKeys() {
  /** @type {HTMLElement} */ (document.getElementById('generate-form-decrypt')).classList.remove('hidden');
  /** @type {HTMLElement} */ (document.getElementById('btnGenerateDecrypt')).classList.add('hidden');
}

async function doGenerateKeysDecrypt() {
  await _generateKeysAndAdvance('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
}

/**
 * @param {string} nameId
 * @param {string} emailId
 * @param {string} passphraseId
 * @param {string} btnId
 * @returns {Promise<void>}
 */
async function _generateKeys(nameId, emailId, passphraseId, btnId) {
  var name = /** @type {HTMLInputElement} */ (document.getElementById(nameId)).value.trim();
  var email = /** @type {HTMLInputElement} */ (document.getElementById(emailId)).value.trim();
  var passphrase = /** @type {HTMLInputElement} */ (document.getElementById(passphraseId)).value;
  if (!name || !email) { toast('Please enter your name and email', 'warning'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email address', 'warning'); return; }
  if (!passphrase) { toast('Please set a passphrase to protect your private key', 'warning'); return; }
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById(btnId));
  btn.disabled = true;
  btn.textContent = 'Generating…';
  try {
    var result = await openpgp.generateKey(/** @type {any} */ ({
      type: 'ecc', curve: 'curve25519',
      userIDs: [{ name: name, email: email }], passphrase: passphrase, format: 'armored',
    }));
    state.armoredPrivate = result.privateKey;
    state.armoredPublic = result.publicKey;
    state.privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey: result.privateKey }), passphrase: passphrase,
    });
    state.publicKey = await openpgp.readKey({ armoredKey: result.publicKey });
    state.userInfo = name + ' <' + email + '>';
    downloadTextFile(result.privateKey, name.replace(/\s/g, '_') + '_PRIVATE.asc');
    downloadTextFile(result.publicKey, name.replace(/\s/g, '_') + '_PUBLIC.asc');
    updateKeyStatus();
    toast('Keys generated! Files downloaded.', 'success');
  } catch (e) {
    toast('Key generation failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Keys & Download';
  }
}

/**
 * Generate keys and auto-advance the wizard.
 * @param {string} nameId @param {string} emailId @param {string} passphraseId @param {string} btnId
 */
async function _generateKeysAndAdvance(nameId, emailId, passphraseId, btnId) {
  var name = /** @type {HTMLInputElement} */ (document.getElementById(nameId)).value.trim();
  var email = /** @type {HTMLInputElement} */ (document.getElementById(emailId)).value.trim();
  var passphrase = /** @type {HTMLInputElement} */ (document.getElementById(passphraseId)).value;
  if (!name || !email) { toast('Please enter your name and email', 'warning'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email address', 'warning'); return; }
  if (!passphrase) { toast('Please set a passphrase', 'warning'); return; }
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById(btnId));
  btn.disabled = true;
  btn.textContent = 'Generating…';
  try {
    var result = await openpgp.generateKey(/** @type {any} */ ({
      type: 'ecc', curve: 'curve25519',
      userIDs: [{ name: name, email: email }], passphrase: passphrase, format: 'armored',
    }));
    state.armoredPrivate = result.privateKey;
    state.armoredPublic = result.publicKey;
    state.privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey: result.privateKey }), passphrase: passphrase,
    });
    state.publicKey = await openpgp.readKey({ armoredKey: result.publicKey });
    state.userInfo = name + ' <' + email + '>';
    downloadTextFile(result.privateKey, name.replace(/\s/g, '_') + '_PRIVATE.asc');
    downloadTextFile(result.publicKey, name.replace(/\s/g, '_') + '_PUBLIC.asc');
    updateKeyStatus();
    toast('Keys generated! Files downloaded.', 'success');
    wizardAdvance();
  } catch (e) {
    toast('Key generation failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate & Continue';
  }
}

// ==================== KEY IMPORT ====================
/** @type {string | null} */
var pendingImportText = null;

/**
 * @param {Event} event
 */
function handleImportFileSelect(event) {
  var file = /** @type {HTMLInputElement} */ (event.target).files?.[0];
  if (!file) return;
  var capturedFile = file;
  file.text().then(function(text) {
    pendingImportText = text;
    // Update labels and enable buttons across all import contexts
    var labels = document.querySelectorAll('#importFileLabelDecrypt, #importFileLabelSign, #importFileLabelKeys');
    labels.forEach(function(l) { l.textContent = capturedFile.name; });
    var btns = document.querySelectorAll('#btnImportDecrypt, #btnImportSign, #btnImportKeys');
    btns.forEach(function(b) { /** @type {HTMLButtonElement} */ (b).disabled = false; });
    toast('Key file loaded — enter passphrase and click Import', 'info');
  });
}

async function applyImportKey() {
  if (!pendingImportText) { toast('Select a key file first', 'warning'); return; }
  var passphrase = /** @type {HTMLInputElement} */ (document.getElementById('importPassphraseDecrypt')).value;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnImportDecrypt'));
  btn.disabled = true;
  btn.textContent = 'Importing…';
  try {
    var privKey = await openpgp.readPrivateKey({ armoredKey: pendingImportText });
    if (!privKey.isDecrypted()) {
      if (!passphrase) { toast('This key requires a passphrase', 'warning'); btn.disabled = false; btn.textContent = 'Import & Continue'; return; }
      try {
        state.privateKey = await openpgp.decryptKey({ privateKey: privKey, passphrase: passphrase });
      } catch (_e) { toast('Wrong passphrase — please try again', 'error'); btn.disabled = false; btn.textContent = 'Import & Continue'; return; }
    } else {
      state.privateKey = privKey;
    }
    state.armoredPrivate = pendingImportText;
    state.publicKey = /** @type {import('openpgp').PrivateKey} */ (state.privateKey).toPublic();
    state.armoredPublic = /** @type {import('openpgp').PublicKey} */ (state.publicKey).armor();
    var uid = state.privateKey.users[0] && state.privateKey.users[0].userID ? state.privateKey.users[0].userID.userID : 'Unknown';
    state.userInfo = uid;
    pendingImportText = null;
    updateKeyStatus();
    toast('Private key imported: ' + uid, 'success');
    wizardAdvance();
  } catch (e) {
    toast('Import failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Import & Continue';
  }
}

// ==================== SIGNING (OPTIONAL FOR ENCRYPT) ====================
/** @returns {void} */
function toggleSignSection() {
  var checked = /** @type {HTMLInputElement} */ (document.getElementById('signFile')).checked;
  var setup = /** @type {HTMLElement} */ (document.getElementById('sign-key-setup'));
  if (!checked) { setup.classList.add('hidden'); return; }
  setup.classList.remove('hidden');
  updateSignSection();
}

function updateSignSection() {
  var loadedEl = document.getElementById('sign-keys-loaded');
  var formEl = document.getElementById('sign-keys-form');
  if (!loadedEl || !formEl) return;
  if (state.privateKey) {
    var fp = /** @type {import('openpgp').PublicKey} */ (state.publicKey).getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
    loadedEl.classList.remove('hidden');
    formEl.classList.add('hidden');
    var infoEl = document.getElementById('sign-keys-loaded-info');
    var fpEl = document.getElementById('sign-keys-loaded-fp');
    if (infoEl) infoEl.textContent = 'Signing as: ' + (state.userInfo || 'Unknown');
    if (fpEl) fpEl.textContent = 'Fingerprint: ' + fp;
  } else {
    loadedEl.classList.add('hidden');
    formEl.classList.remove('hidden');
  }
}

// ==================== RECIPIENT KEY LOOKUP ====================
async function lookupRecipient() {
  var email = /** @type {HTMLInputElement} */ (document.getElementById('recipientEmail')).value.trim();
  if (!email) { toast('Enter a recipient email', 'warning'); return; }
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnLookup'));
  btn.disabled = true;
  btn.textContent = 'Searching…';
  var statusEl = /** @type {HTMLElement} */ (document.getElementById('recipientStatus'));
  var inviteBox = /** @type {HTMLElement} */ (document.getElementById('inviteBox'));
  var continueBtn = /** @type {HTMLElement} */ (document.getElementById('recipient-continue'));
  try {
    var resp = await fetch('https://keys.openpgp.org/vks/v1/by-email/' + encodeURIComponent(email));
    if (resp.status === 404) {
      state.recipientKey = null;
      statusEl.classList.add('hidden');
      continueBtn.classList.add('hidden');
      inviteBox.classList.remove('hidden');
      /** @type {HTMLElement} */ (document.getElementById('inviteText')).textContent =
        'Hi! I want to send you an encrypted file.\n\n1. Go to: ' + window.location.origin + '/app\n2. Choose "Wizard" → Encrypt to create your keys\n3. Share your public key with me\n4. Let me know when done!';
      toast('Recipient not found on keyserver', 'warning');
      updateEncryptButton();
      return;
    }
    if (!resp.ok) throw new Error('Keyserver returned ' + resp.status);
    var armored = await resp.text();
    state.recipientKey = await openpgp.readKey({ armoredKey: armored });
    inviteBox.classList.add('hidden');
    var uid = state.recipientKey.users[0] && state.recipientKey.users[0].userID ? state.recipientKey.users[0].userID.userID : email;
    var fp = state.recipientKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
    var name = uid.indexOf('<') > 0 ? uid.substring(0, uid.indexOf('<')).trim() : '';
    state.recipientInfo = { email: email, name: name, fingerprint: fp };
    saveContact(email, name, armored, fp);
    renderContactList();
    statusEl.classList.remove('hidden');
    setElementContent(statusEl, createStatusBox('Key found: ' + uid, 'Fingerprint: ' + fp, 'success'));
    continueBtn.classList.remove('hidden');
    updateRecipientDisplay();
    toast('Recipient key found!', 'success');
  } catch (e) {
    toast('Lookup failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Find Their Key';
    updateEncryptButton();
  }
}

/**
 * @param {Event} event
 */
async function importRecipientKeyFile(event) {
  var file = /** @type {HTMLInputElement} */ (event.target).files?.[0];
  if (!file) return;
  try {
    var text = await file.text();
    state.recipientKey = await openpgp.readKey({ armoredKey: text });
    var uid = state.recipientKey.users[0] && state.recipientKey.users[0].userID ? state.recipientKey.users[0].userID.userID : 'Unknown';
    var fp = state.recipientKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
    var email = uid.indexOf('<') > 0 ? uid.substring(uid.indexOf('<') + 1, uid.indexOf('>')) : '';
    var name = uid.indexOf('<') > 0 ? uid.substring(0, uid.indexOf('<')).trim() : uid;
    state.recipientInfo = { email: email, name: name, fingerprint: fp };
    if (email) {
      saveContact(email, name, text, fp);
      renderContactList();
    }
    var statusEl = /** @type {HTMLElement} */ (document.getElementById('recipientStatus'));
    statusEl.classList.remove('hidden');
    setElementContent(statusEl, createStatusBox('Key imported: ' + uid, 'Fingerprint: ' + fp, 'success'));
    /** @type {HTMLElement} */ (document.getElementById('inviteBox')).classList.add('hidden');
    /** @type {HTMLElement} */ (document.getElementById('recipient-continue')).classList.remove('hidden');
    updateRecipientDisplay();
    toast('Recipient key imported', 'success');
  } catch (e) {
    toast('Import failed: ' + (/** @type {Error} */ (e)).message, 'error');
  }
  updateEncryptButton();
}

// ==================== FILE SELECTION ====================
/**
 * @param {{ target: { files: File[] } }} event
 */
function handleFileSelect(event) {
  var file = event.target.files[0];
  if (!file) return;
  state.selectedFile = file;
  var info = /** @type {HTMLElement} */ (document.getElementById('selectedFileInfo'));
  info.classList.remove('hidden');
  info.textContent = file.name + ' (' + formatSize(file.size) + ')';
  updateEncryptButton();
}

/**
 * @param {{ target: { files: File[] } }} event
 */
function handleEncryptedFileSelect(event) {
  var file = event.target.files[0];
  if (!file) return;
  state.encryptedFile = file;
  var info = /** @type {HTMLElement} */ (document.getElementById('encryptedFileInfo'));
  info.classList.remove('hidden');
  info.textContent = file.name + ' (' + formatSize(file.size) + ')';
  updateDecryptButton();
}

// Wizard decrypt tab uses separate state slot to avoid conflicts with the Decrypt tab
/** @type {File | null} */
var wizardEncryptedFile = null;
/** @type {import('openpgp').PublicKey | null} */
var wizardSenderKey = null;

/**
 * @param {{ target: { files: File[] } }} event
 */
function handleEncryptedFileSelectWizard(event) {
  var file = event.target.files[0];
  if (!file) return;
  wizardEncryptedFile = file;
  var info = /** @type {HTMLElement} */ (document.getElementById('encryptedFileInfoWizard'));
  if (info) { info.classList.remove('hidden'); info.textContent = file.name + ' (' + formatSize(file.size) + ')'; }
  updateDecryptButtonWizard();
}

function updateDecryptButtonWizard() {
  var btn = /** @type {HTMLButtonElement | null} */ (document.getElementById('btnDecryptWizard'));
  if (btn) btn.disabled = !(state.privateKey && wizardEncryptedFile);
}

// ==================== ENCRYPT ====================
/** @returns {void} */
function updateEncryptButton() {
  var btn = document.getElementById('btnEncrypt');
  if (btn) /** @type {HTMLButtonElement} */ (btn).disabled = !(state.recipientKey && state.selectedFile);
}

async function encryptFile() {
  if (!state.recipientKey || !state.selectedFile) return;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnEncrypt'));
  btn.disabled = true;
  btn.textContent = 'Encrypting…';
  try {
    var fileData = new Uint8Array(await state.selectedFile.arrayBuffer());
    var message = await openpgp.createMessage({ binary: fileData, filename: state.selectedFile.name });
    /** @type {import('openpgp').EncryptOptions & { format: 'binary' }} */
    var encryptOpts = { message: message, encryptionKeys: state.recipientKey, format: /** @type {'binary'} */ ('binary') };
    if (/** @type {HTMLInputElement} */ (document.getElementById('signFile')).checked && state.privateKey) {
      /** @type {any} */ (encryptOpts).signingKeys = state.privateKey;
    }
    var encrypted = await openpgp.encrypt(encryptOpts);
    var recipientEmail = state.recipientInfo ? state.recipientInfo.email : '';
    var recipientLabel = state.recipientInfo ? ' for ' + (state.recipientInfo.name || recipientEmail) : '';
    var outFilename = state.selectedFile.name + '.pgp';
    var subDir = 'encrypted/' + sanitizeFolderName(recipientEmail || 'unknown');
    await saveToFolder(new Blob([encrypted], { type: 'application/pgp-encrypted' }), outFilename, subDir);
    var savedPath = savedFolderHandle
      ? savedFolderHandle.name + '/' + subDir + '/' + outFilename
      : outFilename;
    var successEl = /** @type {HTMLElement} */ (document.getElementById('encrypt-success'));
    successEl.classList.remove('hidden');
    /** @type {HTMLElement} */ (document.getElementById('encrypt-success-text')).textContent =
      'Encrypted "' + state.selectedFile.name + '"' + recipientLabel + ' (' + formatSize(state.selectedFile.size) + '). Saved to: ' + savedPath;
    toast('File encrypted and downloaded!', 'success');
  } catch (e) {
    toast('Encryption failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    /** @type {HTMLButtonElement} */ (btn).disabled = false;
    btn.textContent = 'Encrypt & Download File';
    updateEncryptButton();
  }
}

// ==================== DECRYPT (DECRYPT TAB) ====================
/** @returns {void} */
function updateDecryptButton() {
  var btn = document.getElementById('btnDecrypt');
  if (btn) /** @type {HTMLButtonElement} */ (btn).disabled = !(state.privateKey && state.encryptedFile);
}

async function lookupSender() {
  var email = /** @type {HTMLInputElement} */ (document.getElementById('senderEmail')).value.trim();
  if (!email) return;
  var statusEl = /** @type {HTMLElement} */ (document.getElementById('senderStatus'));
  try {
    var resp = await fetch('https://keys.openpgp.org/vks/v1/by-email/' + encodeURIComponent(email));
    if (resp.status === 404) {
      state.senderKey = null;
      statusEl.classList.remove('hidden');
      var p = document.createElement('p');
      p.className = 'text-sm text-amber-600';
      p.textContent = 'No key found. Signature verification will be skipped.';
      setElementContent(statusEl, p);
      return;
    }
    if (!resp.ok) throw new Error('Status ' + resp.status);
    var armored = await resp.text();
    state.senderKey = await openpgp.readKey({ armoredKey: armored });
    var uid = state.senderKey.users[0] && state.senderKey.users[0].userID ? state.senderKey.users[0].userID.userID : email;
    statusEl.classList.remove('hidden');
    setElementContent(statusEl, createStatusBox('Verification key found: ' + uid, null, 'success'));
    toast('Sender key found', 'success');
  } catch (e) {
    toast('Lookup failed: ' + (/** @type {Error} */ (e)).message, 'error');
  }
}

/**
 * @param {Event} event
 */
async function importSenderKeyFile(event) {
  var file = /** @type {HTMLInputElement} */ (event.target).files?.[0];
  if (!file) return;
  try {
    var text = await file.text();
    state.senderKey = await openpgp.readKey({ armoredKey: text });
    var uid = state.senderKey.users[0] && state.senderKey.users[0].userID ? state.senderKey.users[0].userID.userID : 'Unknown';
    var statusEl = /** @type {HTMLElement} */ (document.getElementById('senderStatus'));
    statusEl.classList.remove('hidden');
    setElementContent(statusEl, createStatusBox('Verification key imported: ' + uid, null, 'success'));
    toast('Sender key imported', 'success');
  } catch (e) {
    toast('Import failed: ' + (/** @type {Error} */ (e)).message, 'error');
  }
}

async function decryptFile() {
  if (!state.privateKey || !state.encryptedFile) return;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnDecrypt'));
  btn.disabled = true;
  btn.textContent = 'Decrypting…';
  var resultEl = /** @type {HTMLElement} */ (document.getElementById('decryptResult'));
  resultEl.classList.add('hidden');
  try {
    var fileData = new Uint8Array(await state.encryptedFile.arrayBuffer());
    var message = await openpgp.readMessage({ binaryMessage: fileData });
    /** @type {any} */
    var decryptOpts = { message: message, decryptionKeys: state.privateKey, format: 'binary' };
    if (state.senderKey) decryptOpts.verificationKeys = state.senderKey;
    var result = await openpgp.decrypt(decryptOpts);
    var outName = result.filename || state.encryptedFile.name.replace(/\.(pgp|gpg|asc)$/, '') || 'decrypted_file';
    var senderEmailVal = /** @type {HTMLInputElement | null} */ (document.getElementById('senderEmail'));
    var senderLabel = senderEmailVal && senderEmailVal.value.trim() ? senderEmailVal.value.trim() : 'unknown';
    var decSubDir = 'decrypted/' + sanitizeFolderName(senderLabel);
    await saveToFolder(new Blob([result.data]), outName, decSubDir);
    var decSavedPath = savedFolderHandle ? savedFolderHandle.name + '/' + decSubDir + '/' + outName : outName;
    var sigText = '';
    if (state.senderKey && result.signatures && result.signatures.length > 0) {
      try { await result.signatures[0].verified; sigText = ' Signature verified!'; } catch (_e) { sigText = ' Warning: signature could not be verified.'; }
    } else if (!state.senderKey) { sigText = ' Signature not checked (no sender key provided).'; }
    resultEl.classList.remove('hidden');
    /** @type {HTMLElement} */ (document.getElementById('decryptResultText')).textContent = 'Decrypted "' + outName + '" (' + formatSize(result.data.byteLength) + '). Saved to: ' + decSavedPath + sigText;
    toast('File decrypted!', 'success');
  } catch (e) {
    toast('Decryption failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    /** @type {HTMLButtonElement} */ (btn).disabled = false;
    btn.textContent = 'Decrypt & Download File';
    updateDecryptButton();
  }
}

// ==================== DECRYPT (WIZARD) ====================
async function lookupSenderWizard() {
  var emailEl = /** @type {HTMLInputElement | null} */ (document.getElementById('senderEmailWizard'));
  if (!emailEl) return;
  var email = emailEl.value.trim();
  if (!email) return;
  var statusEl = /** @type {HTMLElement} */ (document.getElementById('senderStatusWizard'));
  try {
    var resp = await fetch('https://keys.openpgp.org/vks/v1/by-email/' + encodeURIComponent(email));
    if (resp.status === 404) {
      wizardSenderKey = null;
      statusEl.classList.remove('hidden');
      var p = document.createElement('p');
      p.className = 'text-sm text-amber-600';
      p.textContent = 'No key found. Signature verification will be skipped.';
      setElementContent(statusEl, p);
      return;
    }
    if (!resp.ok) throw new Error('Status ' + resp.status);
    var armored = await resp.text();
    wizardSenderKey = await openpgp.readKey({ armoredKey: armored });
    var uid = wizardSenderKey.users[0] && wizardSenderKey.users[0].userID ? wizardSenderKey.users[0].userID.userID : email;
    statusEl.classList.remove('hidden');
    setElementContent(statusEl, createStatusBox('Verification key found: ' + uid, null, 'success'));
    toast('Sender key found', 'success');
  } catch (e) {
    toast('Lookup failed: ' + (/** @type {Error} */ (e)).message, 'error');
  }
}

/**
 * @param {Event} event
 */
async function importSenderKeyFileWizard(event) {
  var file = /** @type {HTMLInputElement} */ (event.target).files?.[0];
  if (!file) return;
  try {
    var text = await file.text();
    wizardSenderKey = await openpgp.readKey({ armoredKey: text });
    var uid = wizardSenderKey.users[0] && wizardSenderKey.users[0].userID ? wizardSenderKey.users[0].userID.userID : 'Unknown';
    var statusEl = /** @type {HTMLElement} */ (document.getElementById('senderStatusWizard'));
    if (statusEl) { statusEl.classList.remove('hidden'); setElementContent(statusEl, createStatusBox('Verification key imported: ' + uid, null, 'success')); }
    toast('Sender key imported', 'success');
  } catch (e) {
    toast('Import failed: ' + (/** @type {Error} */ (e)).message, 'error');
  }
}

async function decryptFileWizard() {
  if (!state.privateKey || !wizardEncryptedFile) return;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnDecryptWizard'));
  btn.disabled = true;
  btn.textContent = 'Decrypting…';
  var resultEl = /** @type {HTMLElement} */ (document.getElementById('decryptResultWizard'));
  if (resultEl) resultEl.classList.add('hidden');
  try {
    var fileData = new Uint8Array(await wizardEncryptedFile.arrayBuffer());
    var message = await openpgp.readMessage({ binaryMessage: fileData });
    /** @type {any} */
    var decryptOpts = { message: message, decryptionKeys: state.privateKey, format: 'binary' };
    if (wizardSenderKey) decryptOpts.verificationKeys = wizardSenderKey;
    var result = await openpgp.decrypt(decryptOpts);
    var outName = result.filename || wizardEncryptedFile.name.replace(/\.(pgp|gpg|asc)$/, '') || 'decrypted_file';
    var wizSenderEmailEl = /** @type {HTMLInputElement | null} */ (document.getElementById('senderEmailWizard'));
    var wizSenderLabel = wizSenderEmailEl && wizSenderEmailEl.value.trim() ? wizSenderEmailEl.value.trim() : 'unknown';
    var wizDecSubDir = 'decrypted/' + sanitizeFolderName(wizSenderLabel);
    await saveToFolder(new Blob([result.data]), outName, wizDecSubDir);
    var wizSavedPath = savedFolderHandle ? savedFolderHandle.name + '/' + wizDecSubDir + '/' + outName : outName;
    var sigText = '';
    if (wizardSenderKey && result.signatures && result.signatures.length > 0) {
      try { await result.signatures[0].verified; sigText = ' Signature verified!'; } catch (_e) { sigText = ' Warning: signature could not be verified.'; }
    } else if (!wizardSenderKey) { sigText = ' Signature not checked (no sender key provided).'; }
    if (resultEl) {
      resultEl.classList.remove('hidden');
      var textEl = document.getElementById('decryptResultTextWizard');
      if (textEl) textEl.textContent = 'Decrypted "' + outName + '" (' + formatSize(result.data.byteLength) + '). Saved to: ' + wizSavedPath + sigText;
    }
    toast('File decrypted!', 'success');
  } catch (e) {
    toast('Decryption failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Decrypt & Download File';
    updateDecryptButtonWizard();
  }
}

function resetDecryptFileWizard() {
  wizardEncryptedFile = null;
  wizardSenderKey = null;
  var info = document.getElementById('encryptedFileInfoWizard');
  if (info) { info.classList.add('hidden'); info.textContent = ''; }
  var result = document.getElementById('decryptResultWizard');
  if (result) result.classList.add('hidden');
  var statusEl = document.getElementById('senderStatusWizard');
  if (statusEl) { statusEl.classList.add('hidden'); while (statusEl.firstChild) statusEl.removeChild(statusEl.firstChild); }
  var fileInput = /** @type {HTMLInputElement | null} */ (document.getElementById('fileToDecryptWizard'));
  if (fileInput) fileInput.value = '';
  var senderEmail = /** @type {HTMLInputElement | null} */ (document.getElementById('senderEmailWizard'));
  if (senderEmail) senderEmail.value = '';
  updateDecryptButtonWizard();
}

// ==================== QUICK ENCRYPT ====================
/**
 * Build an X icon SVG element safely (no innerHTML).
 * @returns {SVGSVGElement}
 */
function buildXIcon() {
  var svg = /** @type {SVGSVGElement} */ (document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
  svg.setAttribute('width', '14'); svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M18 6L6 18M6 6l12 12');
  path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '2'); path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}

/**
 * @param {Contact[]} contacts
 * @param {string} query
 */
function renderQuickContactList(contacts, query) {
  var listEl = /** @type {HTMLElement} */ (document.getElementById('quick-contact-list'));
  var emptyEl = /** @type {HTMLElement} */ (document.getElementById('quick-empty'));
  var emptyMsg = /** @type {HTMLElement} */ (document.getElementById('quick-empty-msg'));
  if (!listEl || !emptyEl) return;

  var filtered = query.trim()
    ? contacts.filter(function(c) {
        var q = query.toLowerCase();
        return c.email.toLowerCase().indexOf(q) >= 0 || (c.name && c.name.toLowerCase().indexOf(q) >= 0);
      })
    : contacts;

  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

  if (filtered.length === 0) {
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    emptyMsg.textContent = query ? 'No recipients match "' + query + '".' : 'No saved recipients yet.';
    return;
  }

  listEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  filtered.forEach(function(contact) {
    var card = document.createElement('div');
    card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #e5e7eb;border-radius:0.625rem;padding:0.75rem 1rem;cursor:pointer;transition:border-color 0.15s,box-shadow 0.15s;';
    card.setAttribute('data-email', contact.email);

    var left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:0.75rem;min-width:0;flex:1;';

    var avatar = document.createElement('div');
    avatar.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:0.875rem;font-weight:600;flex-shrink:0;user-select:none;';
    avatar.textContent = (contact.name || contact.email).charAt(0).toUpperCase();

    var info = document.createElement('div');
    info.style.cssText = 'min-width:0;';
    var nameEl = document.createElement('p');
    nameEl.style.cssText = 'font-size:0.875rem;font-weight:500;color:#111827;margin:0 0 0.1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    nameEl.textContent = contact.name || contact.email;
    var emailEl = document.createElement('p');
    emailEl.style.cssText = 'font-size:0.75rem;color:#6b7280;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    emailEl.textContent = contact.name ? contact.email : '';
    info.appendChild(nameEl);
    if (contact.name) info.appendChild(emailEl);
    left.appendChild(avatar);
    left.appendChild(info);

    var right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:0.5rem;flex-shrink:0;opacity:0;transition:opacity 0.15s;';

    var encryptBtn = document.createElement('button');
    encryptBtn.type = 'button';
    encryptBtn.style.cssText = 'font-size:0.75rem;background:#4f46e5;color:#fff;padding:0.3rem 0.75rem;border-radius:0.375rem;border:none;cursor:pointer;white-space:nowrap;';
    encryptBtn.textContent = 'Encrypt file';
    encryptBtn.addEventListener('click', function(e) { e.stopPropagation(); openQuickPanel(contact); });

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.style.cssText = 'color:#d1d5db;background:transparent;border:none;cursor:pointer;padding:0.25rem;display:flex;align-items:center;';
    removeBtn.title = 'Remove contact';
    removeBtn.appendChild(buildXIcon());
    removeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      removeContact(contact.email);
      var remaining = getContacts();
      var searchEl = /** @type {HTMLInputElement | null} */ (document.getElementById('quick-search'));
      renderQuickContactList(remaining, searchEl ? searchEl.value : '');
      if (quickContact && quickContact.email === contact.email) closeQuickPanel();
    });

    right.appendChild(encryptBtn);
    right.appendChild(removeBtn);
    card.appendChild(left);
    card.appendChild(right);

    card.addEventListener('mouseenter', function() { right.style.opacity = '1'; card.style.borderColor = '#818cf8'; card.style.boxShadow = '0 2px 8px rgb(99 102 241 / 0.1)'; });
    card.addEventListener('mouseleave', function() { right.style.opacity = '0'; card.style.borderColor = quickContact && quickContact.email === contact.email ? '#6366f1' : '#e5e7eb'; card.style.boxShadow = ''; });
    card.addEventListener('click', function() { openQuickPanel(contact); });
    listEl.appendChild(card);
  });
}

/**
 * @param {string} query
 */
function filterQuickContacts(query) {
  renderQuickContactList(getContacts(), query);
}

/**
 * @param {Contact} contact
 */
function openQuickPanel(contact) {
  quickContact = contact;

  var panel = /** @type {HTMLElement} */ (document.getElementById('quick-encrypt-panel'));
  /** @type {HTMLElement} */ (document.getElementById('quick-panel-name')).textContent = contact.name || contact.email;
  /** @type {HTMLElement} */ (document.getElementById('quick-panel-fp')).textContent =
    contact.fingerprint ? 'Fingerprint: ' + contact.fingerprint : contact.email;

  // Highlight selected card
  document.querySelectorAll('#quick-contact-list > div').forEach(function(el) {
    /** @type {HTMLElement} */ (el).style.borderColor = '#e5e7eb';
    /** @type {HTMLElement} */ (el).style.background = '#fff';
  });
  var sel = /** @type {HTMLElement | null} */ (document.querySelector('#quick-contact-list > div[data-email="' + CSS.escape(contact.email) + '"]'));
  if (sel) { sel.style.borderColor = '#6366f1'; sel.style.background = '#eef2ff'; }

  resetQuickPanel();
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeQuickPanel() {
  quickContact = null;
  state.selectedFile = null;
  /** @type {HTMLElement} */ (document.getElementById('quick-encrypt-panel')).classList.add('hidden');
  document.querySelectorAll('#quick-contact-list > div').forEach(function(el) {
    /** @type {HTMLElement} */ (el).style.borderColor = '#e5e7eb';
    /** @type {HTMLElement} */ (el).style.background = '#fff';
  });
}

/**
 * @param {Event} event
 */
function handleQuickFileSelect(event) {
  var file = /** @type {HTMLInputElement} */ (event.target).files?.[0];
  if (!file) return;
  state.selectedFile = file;
  var info = /** @type {HTMLElement} */ (document.getElementById('quick-file-info'));
  info.classList.remove('hidden');
  info.textContent = file.name + ' (' + formatSize(file.size) + ')';
  /** @type {HTMLButtonElement} */ (document.getElementById('btnEncryptQuick')).disabled = false;
}

function toggleQuickSign() {
  var checked = /** @type {HTMLInputElement} */ (document.getElementById('quick-sign')).checked;
  var statusEl = /** @type {HTMLElement} */ (document.getElementById('quick-sign-status'));
  if (!checked) { statusEl.classList.add('hidden'); return; }
  statusEl.classList.remove('hidden');
  if (state.privateKey) {
    var fp = /** @type {import('openpgp').PublicKey} */ (state.publicKey).getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
    setElementContent(statusEl, createStatusBox('Signing as: ' + (state.userInfo || 'Unknown'), 'Fingerprint: ' + fp, 'success'));
  } else {
    var warn = document.createElement('p');
    warn.style.cssText = 'font-size:0.75rem;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:0.375rem;padding:0.5rem 0.75rem;margin:0;';
    warn.textContent = 'No private key loaded. Set up your keys in the Keys tab first.';
    setElementContent(statusEl, warn);
  }
}

async function encryptQuick() {
  if (!quickContact || !state.selectedFile) return;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnEncryptQuick'));
  btn.disabled = true;
  btn.textContent = 'Encrypting…';
  try {
    var recipientKey = await openpgp.readKey({ armoredKey: quickContact.armoredPublicKey });
    var fileData = new Uint8Array(await state.selectedFile.arrayBuffer());
    var message = await openpgp.createMessage({ binary: fileData, filename: state.selectedFile.name });
    /** @type {import('openpgp').EncryptOptions & { format: 'binary' }} */
    var encryptOpts = { message: message, encryptionKeys: recipientKey, format: /** @type {'binary'} */ ('binary') };
    if (/** @type {HTMLInputElement} */ (document.getElementById('quick-sign')).checked && state.privateKey) {
      /** @type {any} */ (encryptOpts).signingKeys = state.privateKey;
    }
    var encrypted = await openpgp.encrypt(encryptOpts);
    var qOutFilename = state.selectedFile.name + '.pgp';
    var qSubDir = 'encrypted/' + sanitizeFolderName(quickContact.email || 'unknown');
    await saveToFolder(new Blob([encrypted], { type: 'application/pgp-encrypted' }), qOutFilename, qSubDir);
    var qSavedPath = savedFolderHandle ? savedFolderHandle.name + '/' + qSubDir + '/' + qOutFilename : qOutFilename;
    /** @type {HTMLElement} */ (document.getElementById('quick-success')).classList.remove('hidden');
    /** @type {HTMLElement} */ (document.getElementById('quick-success-text')).textContent =
      '"' + state.selectedFile.name + '" encrypted for ' + (quickContact.name || quickContact.email) + ' (' + formatSize(state.selectedFile.size) + '). Saved to: ' + qSavedPath;
    toast('File encrypted!', 'success');
  } catch (e) {
    toast('Encryption failed: ' + (/** @type {Error} */ (e)).message, 'error');
    btn.disabled = false;
  } finally {
    btn.textContent = 'Encrypt & Download';
    if (state.selectedFile) btn.disabled = false;
  }
}

function resetQuickPanel() {
  state.selectedFile = null;
  var fileInfo = /** @type {HTMLElement} */ (document.getElementById('quick-file-info'));
  if (fileInfo) { fileInfo.classList.add('hidden'); fileInfo.textContent = ''; }
  var fileInput = /** @type {HTMLInputElement | null} */ (document.getElementById('quick-file-input'));
  if (fileInput) fileInput.value = '';
  var success = document.getElementById('quick-success');
  if (success) success.classList.add('hidden');
  var btn = /** @type {HTMLButtonElement | null} */ (document.getElementById('btnEncryptQuick'));
  if (btn) btn.disabled = true;
}

// ==================== DECRYPT SENDER CONTACTS ====================
/**
 * @param {string} senderEmailId
 * @param {string} senderStatusId
 * @param {string} containerId
 * @param {function(import('openpgp').PublicKey): void} onLoaded
 */
function renderSenderContactPills(senderEmailId, senderStatusId, containerId, onLoaded) {
  var container = /** @type {HTMLElement | null} */ (document.getElementById(containerId));
  if (!container) return;
  var contacts = getContacts();
  while (container.firstChild) container.removeChild(container.firstChild);
  if (contacts.length === 0) { container.classList.add('hidden'); return; }

  container.classList.remove('hidden');
  var label = document.createElement('p');
  label.style.cssText = 'font-size:0.75rem;font-weight:500;color:#6b7280;margin:0 0 0.375rem;';
  label.textContent = 'From saved contacts:';
  container.appendChild(label);

  var pills = document.createElement('div');
  pills.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.5rem;';

  contacts.forEach(function(contact) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'font-size:0.75rem;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;padding:0.25rem 0.75rem;border-radius:9999px;cursor:pointer;transition:all 0.15s;';
    btn.textContent = contact.name || contact.email;
    btn.addEventListener('mouseenter', function() { btn.style.background = '#eef2ff'; btn.style.borderColor = '#c7d2fe'; });
    btn.addEventListener('mouseleave', function() { btn.style.background = '#f9fafb'; btn.style.borderColor = '#e5e7eb'; });
    btn.addEventListener('click', function() {
      var emailInput = /** @type {HTMLInputElement | null} */ (document.getElementById(senderEmailId));
      if (emailInput) emailInput.value = contact.email;
      openpgp.readKey({ armoredKey: contact.armoredPublicKey }).then(function(key) {
        onLoaded(key);
        var uid = contact.name ? contact.name + ' <' + contact.email + '>' : contact.email;
        var statusEl = /** @type {HTMLElement | null} */ (document.getElementById(senderStatusId));
        if (statusEl) { statusEl.classList.remove('hidden'); setElementContent(statusEl, createStatusBox('Verification key: ' + uid, null, 'success')); }
        toast('Sender key loaded', 'success');
      }).catch(function() { toast('Could not load key for ' + contact.email, 'error'); });
    });
    pills.appendChild(btn);
  });
  container.appendChild(pills);
}

function renderDecryptSenderContacts() {
  renderSenderContactPills('senderEmail', 'senderStatus', 'decrypt-sender-contacts', function(key) { state.senderKey = key; });
}

function renderWizardSenderContacts() {
  renderSenderContactPills('senderEmailWizard', 'senderStatusWizard', 'wizard-sender-contacts', function(key) { wizardSenderKey = key; });
}

// ==================== RESET HELPERS ====================
function resetRecipientUI() {
  state.recipientInfo = null;
  var statusEl = document.getElementById('recipientStatus');
  if (statusEl) { statusEl.classList.add('hidden'); while (statusEl.firstChild) statusEl.removeChild(statusEl.firstChild); }
  var inviteBox = document.getElementById('inviteBox');
  if (inviteBox) inviteBox.classList.add('hidden');
  var continueBtn = document.getElementById('recipient-continue');
  if (continueBtn) continueBtn.classList.add('hidden');
  var emailInput = /** @type {HTMLInputElement | null} */ (document.getElementById('recipientEmail'));
  if (emailInput) emailInput.value = '';
  updateRecipientDisplay();
}

function resetEncryptFileUI() {
  state.selectedFile = null;
  var info = document.getElementById('selectedFileInfo');
  if (info) { info.classList.add('hidden'); info.textContent = ''; }
  var success = document.getElementById('encrypt-success');
  if (success) success.classList.add('hidden');
  var fileInput = /** @type {HTMLInputElement | null} */ (document.getElementById('fileToEncrypt'));
  if (fileInput) fileInput.value = '';
  updateEncryptButton();
}

function resetDecryptTab() {
  state.encryptedFile = null;
  state.senderKey = null;
  var info = document.getElementById('encryptedFileInfo');
  if (info) { info.classList.add('hidden'); info.textContent = ''; }
  var result = document.getElementById('decryptResult');
  if (result) result.classList.add('hidden');
  var senderStatus = document.getElementById('senderStatus');
  if (senderStatus) { senderStatus.classList.add('hidden'); while (senderStatus.firstChild) senderStatus.removeChild(senderStatus.firstChild); }
  var fileInput = /** @type {HTMLInputElement | null} */ (document.getElementById('fileToDecrypt'));
  if (fileInput) fileInput.value = '';
  var senderEmail = /** @type {HTMLInputElement | null} */ (document.getElementById('senderEmail'));
  if (senderEmail) senderEmail.value = '';
  updateDecryptButton();
}

function resetEncryptFile() { resetEncryptFileUI(); }
function resetDecryptFile() { resetDecryptTab(); }

// ==================== FILE SYSTEM ACCESS API ====================
/** @type {FileSystemDirectoryHandle | null} */
var savedFolderHandle = null;

/** @returns {boolean} */
function isFSASupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Sanitize an email or string for use as a directory name.
 * Keeps letters, digits, at-sign, dot and dash. Replaces everything else with underscore.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFolderName(name) {
  return name.replace(/[^a-zA-Z0-9@._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'unknown';
}

/** Show or hide the FSA unavailable notice. */
function renderFolderUI() {
  var supported = isFSASupported();
  document.querySelectorAll('.fsa-notice').forEach(function(el) {
    /** @type {HTMLElement} */ (el).classList.toggle('hidden', supported);
  });
  document.querySelectorAll('.fsa-folder-row').forEach(function(el) {
    /** @type {HTMLElement} */ (el).classList.toggle('hidden', !supported);
  });
  updateFolderBadge();
}

/** Update the "Save folder: …" badge shown on each tab. */
function updateFolderBadge() {
  document.querySelectorAll('.fsa-folder-name').forEach(function(el) {
    /** @type {HTMLElement} */ (el).textContent = savedFolderHandle ? savedFolderHandle.name : 'Not set';
  });
  document.querySelectorAll('.fsa-folder-set').forEach(function(el) {
    /** @type {HTMLButtonElement} */ (el).textContent = savedFolderHandle ? 'Change folder' : 'Set save folder';
  });
}

/** Prompt the user to pick the root save folder. */
async function pickSaveFolder() {
  if (!isFSASupported()) { toast('Your browser doesn\'t support folder saving', 'warning'); return; }
  try {
    savedFolderHandle = await /** @type {any} */ (window).showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
    updateFolderBadge();
    toast('Save folder set: ' + /** @type {FileSystemDirectoryHandle} */ (savedFolderHandle).name, 'success');
  } catch (e) {
    // User cancelled — don't show an error
    if (/** @type {Error} */ (e).name !== 'AbortError') {
      toast('Could not access folder: ' + /** @type {Error} */ (e).message, 'error');
    }
  }
}

/**
 * Write a Blob to <rootFolder>/<subDir>/<filename>, creating sub-dirs as needed.
 * Falls back to a regular browser download if no folder handle is set or an error occurs.
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} subDir  e.g. "encrypted/alice@example.com"
 * @returns {Promise<void>}
 */
async function saveToFolder(blob, filename, subDir) {
  if (!savedFolderHandle) { downloadBlob(blob, filename); return; }
  try {
    var parts = subDir.split('/').filter(Boolean);
    var dir = /** @type {FileSystemDirectoryHandle} */ (savedFolderHandle);
    for (var i = 0; i < parts.length; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    var fileHandle = await dir.getFileHandle(filename, { create: true });
    var writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    // Show the relative path in the success message via a data attribute
    var pathEl = document.querySelector('[data-save-path]');
    var relPath = savedFolderHandle.name + '/' + subDir + '/' + filename;
    if (pathEl) /** @type {HTMLElement} */ (pathEl).dataset.savePath = relPath;
  } catch (e) {
    toast('Folder save failed — downloading instead: ' + /** @type {Error} */ (e).message, 'warning');
    downloadBlob(blob, filename);
  }
}

// ==================== UTILITY ====================
/** @param {string} text @param {string} filename */
function downloadTextFile(text, filename) { downloadBlob(new Blob([text], { type: 'text/plain' }), filename); }
/** @param {Blob} blob @param {string} filename */
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function downloadPublicKey() { if (state.armoredPublic) downloadTextFile(state.armoredPublic, 'public_key.asc'); }
function downloadPrivateKey() { if (state.armoredPrivate) downloadTextFile(state.armoredPrivate, 'private_key.asc'); }
function copyPublicKey() {
  if (!state.armoredPublic) { toast('No public key loaded', 'warning'); return; }
  navigator.clipboard.writeText(state.armoredPublic).then(function() {
    toast('Public key copied to clipboard', 'success');
  }).catch(function() {
    toast('Could not copy — please copy manually', 'error');
  });
}
function sharePublicKeyViaEmail() {
  if (!state.armoredPublic) { toast('No public key loaded', 'warning'); return; }
  var uid = state.userInfo || 'My CryptDrop Public Key';
  var subject = encodeURIComponent('My PGP Public Key — ' + uid);
  var body = encodeURIComponent(
    'Hi,\n\nHere is my PGP public key so you can send me encrypted files via CryptDrop (https://cryptdrop.app).\n\n' +
    state.armoredPublic +
    '\n\nYou can paste this key directly into CryptDrop when encrypting a file for me.'
  );
  window.open('mailto:?subject=' + subject + '&body=' + body);
}
async function publishPublicKey() {
  if (!state.armoredPublic) { toast('No public key loaded', 'warning'); return; }
  var statusEl = document.getElementById('publish-status');
  var btn = /** @type {HTMLButtonElement} */ (document.querySelector('[onclick="publishPublicKey()"]'));
  if (btn) { btn.disabled = true; btn.textContent = 'Publishing…'; }
  if (statusEl) { statusEl.className = 'mt-3'; statusEl.textContent = ''; }
  try {
    var resp = await fetch('https://keys.openpgp.org/vks/v1/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keytext: state.armoredPublic })
    });
    var data = await resp.json();
    if (resp.ok) {
      if (statusEl) {
        statusEl.className = 'mt-3 notice-box notice-info';
        statusEl.innerHTML = '<p class="text-sm text-indigo-800"><strong>Key uploaded!</strong> Check your email — keys.openpgp.org will send a verification link to confirm your address and make the key searchable.</p>';
        statusEl.classList.remove('hidden');
      }
      toast('Key uploaded — check your email to verify', 'success');
    } else {
      var msg = (data && data.error) ? data.error : ('HTTP ' + resp.status);
      if (statusEl) {
        statusEl.className = 'mt-3 notice-box notice-warn';
        statusEl.textContent = 'Upload failed: ' + msg;
        statusEl.classList.remove('hidden');
      }
      toast('Publish failed: ' + msg, 'error');
    }
  } catch (e) {
    var errMsg = /** @type {Error} */ (e).message;
    if (statusEl) {
      statusEl.className = 'mt-3 notice-box notice-warn';
      statusEl.textContent = 'Network error: ' + errMsg;
      statusEl.classList.remove('hidden');
    }
    toast('Publish failed: ' + errMsg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Publish to Keyserver'; }
  }
}
/**
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
/** @param {string} str @returns {string} */
function escHtml(str) { var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
/** @returns {void} */
function copyInvite() { navigator.clipboard.writeText(/** @type {HTMLElement} */ (document.getElementById('inviteText')).textContent || '').then(function() { toast('Copied!', 'success'); }); }

// ==================== DRAG & DROP ====================
document.querySelectorAll('.drop-zone').forEach(function(zone) {
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', function() { zone.classList.remove('dragover'); });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.classList.remove('dragover');
    var input = zone.querySelector('input[type="file"]');
    var dt = /** @type {DragEvent} */ (e);
    if (input && dt.dataTransfer && dt.dataTransfer.files.length) {
      /** @type {HTMLInputElement} */ (input).files = dt.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });
});

// ==================== LEGACY COMPAT SHIMS (used by tests & wizard sign section) ====================
// These map the old wizard-as-top-level-navigation API to the new tab+wizard architecture.

/**
 * @param {'encrypt' | 'decrypt'} flow
 */
function startFlow(flow) {
  switchTab('wizard');
  startWizardFlow(flow);
}

function advanceStep() {
  wizardAdvance();
}

function navigateBack() {
  wizardBack();
}

function startOver() {
  wizardFlow = null;
  wizardStep = 0;
  quickContact = null;
  state.recipientKey = null;
  state.recipientInfo = null;
  state.senderKey = null;
  state.selectedFile = null;
  state.encryptedFile = null;
  wizardEncryptedFile = null;
  wizardSenderKey = null;
  showWizardHome();
  resetRecipientUI();
  resetEncryptFileUI();
  resetDecryptTab();
  resetQuickPanel();
  // Redirect to encrypt tab
  switchTab('encrypt');
}

// Signing functions used in sign section (mapped to Keys tab flow)
function generateKeysForSigning() {
  // No-op: sign section now links to Keys tab
}

/**
 * @param {string} nameId @param {string} emailId @param {string} passphraseId @param {string} btnId
 */
async function _generateKeysForSigning(nameId, emailId, passphraseId, btnId) {
  await _generateKeys(nameId, emailId, passphraseId, btnId);
}

async function applyImportKeyForSigning() {
  // Keys tab import is the canonical flow; sign section points there
  await applyImportKeyTab();
}

function updateProgressBar() {
  updateWizardProgress();
}

// ==================== INIT ====================
renderFolderUI();
switchTab('encrypt');
