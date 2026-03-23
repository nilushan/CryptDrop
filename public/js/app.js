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
  currentFlow: null,   // 'encrypt' | 'decrypt' | null
  currentStep: 0,      // 0 = path select, 1-2 = flow steps
  // Recipient contact info (for display and filename)
  recipientInfo: null,  // { email, name, fingerprint }
};

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

// ==================== WIZARD NAVIGATION ====================
/** @type {Record<'encrypt' | 'decrypt', string[]>} */
var FLOW_SCREENS = {
  encrypt: ['screen-encrypt-recipient', 'screen-encrypt-file'],
  decrypt: ['screen-decrypt-keys', 'screen-decrypt-file'],
};

/** @type {Record<'encrypt' | 'decrypt', string[]>} */
var FLOW_LABELS = {
  encrypt: ['Find Recipient', 'Encrypt File'],
  decrypt: ['Your Keys', 'Decrypt File'],
};

function getAllScreenIds() {
  return [
    'screen-path-select',
    'screen-encrypt-recipient', 'screen-encrypt-file',
    'screen-decrypt-keys', 'screen-decrypt-file',
  ];
}

/**
 * @param {string} screenId
 * @returns {void}
 */
function showScreen(screenId) {
  getAllScreenIds().forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      if (id === screenId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
}

/**
 * @param {'encrypt' | 'decrypt'} flow
 * @returns {void}
 */
function startFlow(flow) {
  state.currentFlow = flow;
  state.currentStep = 1;
  showScreen(FLOW_SCREENS[flow][0]);
  updateProgressBar();
  if (flow === 'decrypt') updateKeysLoadedState();
  if (flow === 'encrypt') { updateSignSection(); renderContactList(); }
}

function advanceStep() {
  if (!state.currentFlow) return;
  var screens = FLOW_SCREENS[state.currentFlow];
  var nextStep = state.currentStep + 1;
  if (nextStep > screens.length) return;
  state.currentStep = nextStep;
  showScreen(screens[nextStep - 1]);
  updateProgressBar();
  if (state.currentFlow === 'encrypt') updateRecipientDisplay();
}

function navigateBack() {
  if (!state.currentFlow) return;
  if (state.currentStep <= 1) {
    startOver();
    return;
  }
  state.currentStep--;
  showScreen(FLOW_SCREENS[state.currentFlow][state.currentStep - 1]);
  updateProgressBar();
}

function startOver() {
  state.currentFlow = null;
  state.currentStep = 0;
  state.recipientKey = null;
  state.recipientInfo = null;
  state.senderKey = null;
  state.selectedFile = null;
  state.encryptedFile = null;
  showScreen('screen-path-select');
  updateProgressBar();
  resetRecipientUI();
  resetEncryptFileUI();
  resetDecryptFileUI();
}

/** @returns {void} */
function updateProgressBar() {
  var bar = /** @type {HTMLElement} */ (document.getElementById('progress-bar'));
  var indicators = /** @type {HTMLElement} */ (document.getElementById('step-indicators'));
  if (!state.currentFlow || state.currentStep === 0) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  var labels = FLOW_LABELS[state.currentFlow];
  var totalSteps = labels.length;

  // Clear existing indicators safely
  while (indicators.firstChild) {
    indicators.removeChild(indicators.firstChild);
  }

  for (var i = 0; i < totalSteps; i++) {
    var stepNum = i + 1;
    var isCompleted = stepNum < state.currentStep;
    var isCurrent = stepNum === state.currentStep;

    var wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-1';

    var circle = document.createElement('div');
    circle.className = isCompleted
      ? 'bg-green-600 text-white'
      : isCurrent
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-200 text-gray-500';
    circle.style.cssText = 'width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;';
    circle.textContent = isCompleted ? '\u2713' : String(stepNum);

    var label = document.createElement('span');
    label.className = 'text-xs ' + (isCurrent ? 'text-indigo-600 font-medium' : 'text-gray-400');
    label.style.cssText = 'max-width:80px;white-space:nowrap;';
    label.textContent = labels[i];

    wrapper.appendChild(circle);
    wrapper.appendChild(label);

    if (i < totalSteps - 1) {
      var line = document.createElement('div');
      line.style.cssText = 'width:24px;height:1px;background:#d1d5db;margin:0 4px;';
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

  // Update decrypt flow key state
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

  // Update sign section in encrypt flow
  updateSignSection();
}

/** @returns {void} */
function updateKeyStatus() {
  var el = /** @type {HTMLElement} */ (document.getElementById('keyStatus'));
  if (state.privateKey) {
    var uid = state.userInfo || 'Key loaded';
    el.textContent = uid;
    el.className = 'text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700';
  } else {
    el.textContent = 'No keys loaded';
    el.className = 'text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500';
  }
  updateKeysLoadedState();
  updateEncryptButton();
  updateDecryptButton();
}

// ==================== TOAST NOTIFICATIONS ====================
/**
 * @param {string} msg
 * @param {ToastType} [type]
 * @returns {void}
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

// ==================== KEY GENERATION (DECRYPT FLOW) ====================
/** @returns {void} */
function generateKeys() {
  // Only used in decrypt flow now
  /** @type {HTMLElement} */ (document.getElementById('generate-form-decrypt')).classList.remove('hidden');
  /** @type {HTMLElement} */ (document.getElementById('btnGenerateDecrypt')).classList.add('hidden');
}

async function doGenerateKeysDecrypt() {
  await _generateKeys('genNameDecrypt', 'genEmailDecrypt', 'genPassphraseDecrypt', 'btnDoGenerateDecrypt');
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
  btn.innerHTML = '<span class="spinner"></span> Generating...';
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
    toast('Keys generated! Key files downloaded.', 'success');
    advanceStep();
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
 * @returns {void}
 */
function handleImportFileSelect(event) {
  var file = /** @type {HTMLInputElement} */ (event.target).files?.[0];
  if (!file) return;
  var capturedFile = file;
  file.text().then(function(text) {
    pendingImportText = text;
    var labels = document.querySelectorAll('#importFileLabelDecrypt, #importFileLabelSign');
    labels.forEach(function(l) { l.textContent = capturedFile.name; });
    var btns = document.querySelectorAll('#btnImportDecrypt, #btnImportSign');
    btns.forEach(function(b) { /** @type {HTMLButtonElement} */ (b).disabled = false; });
    toast('Key file loaded — enter your passphrase and click Import', 'info');
  });
}

async function applyImportKey() {
  // Used in decrypt flow only
  if (!pendingImportText) { toast('Select a key file first', 'warning'); return; }
  var passphrase = /** @type {HTMLInputElement} */ (document.getElementById('importPassphraseDecrypt')).value;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnImportDecrypt'));
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Importing...';
  try {
    var privKey = await openpgp.readPrivateKey({ armoredKey: pendingImportText });
    if (!privKey.isDecrypted()) {
      if (!passphrase) { toast('This key requires a passphrase', 'warning'); btn.disabled = false; btn.textContent = 'Import & Continue'; return; }
      try {
        state.privateKey = await openpgp.decryptKey({ privateKey: privKey, passphrase: passphrase });
      } catch (decryptErr) {
        toast('Wrong passphrase — please try again', 'error'); return;
      }
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
    advanceStep();
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
  if (!checked) {
    setup.classList.add('hidden');
    return;
  }
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
    /** @type {HTMLElement} */ (document.getElementById('sign-keys-loaded-info')).textContent = 'Signing as: ' + (state.userInfo || 'Unknown');
    /** @type {HTMLElement} */ (document.getElementById('sign-keys-loaded-fp')).textContent = 'Fingerprint: ' + fp;
  } else {
    loadedEl.classList.add('hidden');
    formEl.classList.remove('hidden');
  }
}

/** @returns {void} */
function generateKeysForSigning() {
  /** @type {HTMLElement} */ (document.getElementById('generate-form-sign')).classList.remove('hidden');
  /** @type {HTMLElement} */ (document.getElementById('btnGenerateSign')).classList.add('hidden');
}

async function doGenerateKeysSign() {
  await _generateKeysForSigning('genNameSign', 'genEmailSign', 'genPassphraseSign', 'btnDoGenerateSign');
}

/**
 * @param {string} nameId
 * @param {string} emailId
 * @param {string} passphraseId
 * @param {string} btnId
 * @returns {Promise<void>}
 */
async function _generateKeysForSigning(nameId, emailId, passphraseId, btnId) {
  var name = /** @type {HTMLInputElement} */ (document.getElementById(nameId)).value.trim();
  var email = /** @type {HTMLInputElement} */ (document.getElementById(emailId)).value.trim();
  var passphrase = /** @type {HTMLInputElement} */ (document.getElementById(passphraseId)).value;
  if (!name || !email) { toast('Please enter your name and email', 'warning'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email address', 'warning'); return; }
  if (!passphrase) { toast('Please set a passphrase to protect your private key', 'warning'); return; }
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById(btnId));
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating...';
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
    toast('Keys generated! You can now sign files.', 'success');
  } catch (e) {
    toast('Key generation failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Keys';
  }
}

async function applyImportKeyForSigning() {
  if (!pendingImportText) { toast('Select a key file first', 'warning'); return; }
  var passphrase = /** @type {HTMLInputElement} */ (document.getElementById('importPassphraseSign')).value;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnImportSign'));
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Importing...';
  try {
    var privKey = await openpgp.readPrivateKey({ armoredKey: pendingImportText });
    if (!privKey.isDecrypted()) {
      if (!passphrase) { toast('This key requires a passphrase', 'warning'); btn.disabled = false; btn.textContent = 'Import Key'; return; }
      try {
        state.privateKey = await openpgp.decryptKey({ privateKey: privKey, passphrase: passphrase });
      } catch (decryptErr) {
        toast('Wrong passphrase — please try again', 'error'); return;
      }
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
    toast('Private key imported — you can now sign files.', 'success');
  } catch (e) {
    toast('Import failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Import Key';
  }
}

// ==================== RECIPIENT KEY LOOKUP ====================
/**
 * @returns {Promise<void>}
 */
async function lookupRecipient() {
  var email = /** @type {HTMLInputElement} */ (document.getElementById('recipientEmail')).value.trim();
  if (!email) { toast('Enter a recipient email', 'warning'); return; }
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnLookup'));
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Searching...';
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
        'Hi! I want to send you an encrypted file.\n\n1. Go to: ' + window.location.origin + '/app\n2. Choose "Encrypt a File" and create your keys\n3. Share your public key with me\n4. Let me know when done!';
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
    // Auto-save to contacts
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
 * @returns {Promise<void>}
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
 * @returns {void}
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
 * @returns {void}
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

// ==================== ENCRYPT ====================
/** @returns {void} */
function updateEncryptButton() {
  var btn = document.getElementById('btnEncrypt');
  if (btn) /** @type {HTMLButtonElement} */ (btn).disabled = !(state.recipientKey && state.selectedFile);
}

/**
 * @returns {Promise<void>}
 */
async function encryptFile() {
  if (!state.recipientKey || !state.selectedFile) return;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnEncrypt'));
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Encrypting...';
  try {
    var fileData = new Uint8Array(await state.selectedFile.arrayBuffer());
    var message = await openpgp.createMessage({ binary: fileData, filename: state.selectedFile.name });
    /** @type {import('openpgp').EncryptOptions & { format: 'binary' }} */
    var encryptOpts = { message: message, encryptionKeys: state.recipientKey, format: /** @type {'binary'} */ ('binary') };
    if (/** @type {HTMLInputElement} */ (document.getElementById('signFile')).checked && state.privateKey) {
      /** @type {any} */ (encryptOpts).signingKeys = state.privateKey;
    }
    var encrypted = await openpgp.encrypt(encryptOpts);
    var recipientSuffix = '';
    if (state.recipientInfo) {
      var rName = (state.recipientInfo.name || state.recipientInfo.email || '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      if (rName) recipientSuffix = '_for_' + rName;
    }
    downloadBlob(new Blob([encrypted], { type: 'application/pgp-encrypted' }), state.selectedFile.name + recipientSuffix + '.pgp');
    var successEl = /** @type {HTMLElement} */ (document.getElementById('encrypt-success'));
    successEl.classList.remove('hidden');
    var recipientLabel = state.recipientInfo ? ' for ' + (state.recipientInfo.name || state.recipientInfo.email) : '';
    /** @type {HTMLElement} */ (document.getElementById('encrypt-success-text')).textContent =
      'Encrypted "' + state.selectedFile.name + '"' + recipientLabel + ' (' + formatSize(state.selectedFile.size) + '). The .pgp file has been downloaded.';
    toast('File encrypted and downloaded!', 'success');
  } catch (e) {
    toast('Encryption failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    /** @type {HTMLButtonElement} */ (btn).disabled = false;
    btn.textContent = 'Encrypt & Download File';
    updateEncryptButton();
  }
}

// ==================== DECRYPT ====================
/** @returns {void} */
function updateDecryptButton() {
  var btn = document.getElementById('btnDecrypt');
  if (btn) /** @type {HTMLButtonElement} */ (btn).disabled = !(state.privateKey && state.encryptedFile);
}

/**
 * @returns {Promise<void>}
 */
async function lookupSender() {
  var email = /** @type {HTMLInputElement} */ (document.getElementById('senderEmail')).value.trim();
  if (!email) return;
  var statusEl = /** @type {HTMLElement} */ (document.getElementById('senderStatus'));
  try {
    var resp = await fetch('https://keys.openpgp.org/vks/v1/by-email/' + encodeURIComponent(email));
    if (resp.status === 404) {
      state.senderKey = null;
      statusEl.classList.remove('hidden');
      var warningP = document.createElement('p');
      warningP.className = 'text-sm text-amber-600';
      warningP.textContent = 'No key found. Signature verification will be skipped.';
      setElementContent(statusEl, warningP);
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
 * @returns {Promise<void>}
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

/**
 * @returns {Promise<void>}
 */
async function decryptFile() {
  if (!state.privateKey || !state.encryptedFile) return;
  var btn = /** @type {HTMLButtonElement} */ (document.getElementById('btnDecrypt'));
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Decrypting...';
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
    downloadBlob(new Blob([result.data]), outName);
    var sigText = '';
    if (state.senderKey && result.signatures && result.signatures.length > 0) {
      try { await result.signatures[0].verified; sigText = ' Signature verified!'; } catch (e) { sigText = ' Warning: signature could not be verified.'; }
    } else if (!state.senderKey) { sigText = ' Signature not checked (no sender key provided).'; }
    resultEl.classList.remove('hidden');
    /** @type {HTMLElement} */ (document.getElementById('decryptResultText')).textContent = 'Decrypted "' + outName + '" (' + formatSize(result.data.byteLength) + ').' + sigText;
    toast('File decrypted!', 'success');
  } catch (e) {
    toast('Decryption failed: ' + (/** @type {Error} */ (e)).message, 'error');
  } finally {
    /** @type {HTMLButtonElement} */ (btn).disabled = false;
    btn.textContent = 'Decrypt & Download File';
    updateDecryptButton();
  }
}

// ==================== UI RESET HELPERS ====================
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

function resetDecryptFileUI() {
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
function resetDecryptFile() { resetDecryptFileUI(); }

// ==================== UTILITY ====================
/** @param {string} text @param {string} filename @returns {void} */
function downloadTextFile(text, filename) { downloadBlob(new Blob([text], { type: 'text/plain' }), filename); }
/** @param {Blob} blob @param {string} filename @returns {void} */
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

// ==================== INIT ====================
updateProgressBar();
renderContactList();
