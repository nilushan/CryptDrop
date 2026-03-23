// ==================== STATE ====================
let state = {
  privateKey: null,
  publicKey: null,
  armoredPublic: null,
  armoredPrivate: null,
  recipientKey: null,
  senderKey: null,
  selectedFile: null,
  encryptedFile: null,
  userInfo: null,
};

// ==================== TAB SWITCHING ====================
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('border-indigo-500', 'text-indigo-600');
    b.classList.add('border-transparent', 'text-gray-500');
  });
  document.getElementById('tab-' + tab).classList.add('border-indigo-500', 'text-indigo-600');
  document.getElementById('tab-' + tab).classList.remove('border-transparent', 'text-gray-500');

  document.querySelectorAll('[id^="panel-"]').forEach(p => p.classList.add('hidden'));
  document.getElementById('panel-' + tab).classList.remove('hidden');

  if (tab === 'decrypt') updateDecryptTab();
}

// ==================== KEY MODE TOGGLE ====================
let pendingImportText = null;

function resetKeyButtons() {
  const gen = document.getElementById('btnGenerate');
  gen.disabled = false;
  gen.textContent = 'Generate Keys';
  const imp = document.getElementById('btnImport');
  imp.disabled = !pendingImportText;
  imp.textContent = 'Import Key';
}

function switchKeyMode(mode) {
  resetKeyButtons();
  const genBtn = document.getElementById('keymode-generate');
  const impBtn = document.getElementById('keymode-import');
  const genForm = document.getElementById('keyform-generate');
  const impForm = document.getElementById('keyform-import');
  if (mode === 'generate') {
    genBtn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
    genBtn.classList.remove('text-gray-500');
    impBtn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
    impBtn.classList.add('text-gray-500');
    genForm.classList.remove('hidden');
    impForm.classList.add('hidden');
  } else {
    impBtn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
    impBtn.classList.remove('text-gray-500');
    genBtn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
    genBtn.classList.add('text-gray-500');
    impForm.classList.remove('hidden');
    genForm.classList.add('hidden');
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  const inner = document.getElementById('toastInner');
  const colors = {
    info: 'bg-gray-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-600 text-white',
  };
  inner.className = 'px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ' + (colors[type] || colors.info);
  inner.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.add('hidden'), 4000);
}

// ==================== KEY STATUS ====================
function updateKeyStatus() {
  const el = document.getElementById('keyStatus');
  const publishBtn = document.getElementById('btnPublish');
  if (state.privateKey) {
    const uid = state.userInfo || 'Key loaded';
    el.textContent = uid;
    el.className = 'text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700';
    publishBtn.disabled = false;
    const info = document.getElementById('keyInfo');
    info.classList.remove('hidden');
    const fp = state.publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g).join(' ');
    document.getElementById('keyInfoText').textContent = 'Fingerprint: ' + fp;
  } else {
    el.textContent = 'No keys loaded';
    el.className = 'text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500';
    publishBtn.disabled = true;
    document.getElementById('keyInfo').classList.add('hidden');
  }
  updateEncryptButton();
  updateDecryptButton();
}

// ==================== KEY GENERATION ====================
async function generateKeys() {
  const name = document.getElementById('genName').value.trim();
  const email = document.getElementById('genEmail').value.trim();
  const passphrase = document.getElementById('genPassphrase').value;
  if (!name || !email) { toast('Please enter your name and email', 'warning'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email address', 'warning'); return; }
  if (!passphrase) { toast('Please set a passphrase to protect your private key', 'warning'); return; }
  const btn = document.getElementById('btnGenerate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating...';
  try {
    const { privateKey, publicKey } = await openpgp.generateKey({
      type: 'ecc', curve: 'curve25519',
      userIDs: [{ name, email }], passphrase, format: 'armored',
    });
    state.armoredPrivate = privateKey;
    state.armoredPublic = publicKey;
    state.privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey: privateKey }), passphrase,
    });
    state.publicKey = await openpgp.readKey({ armoredKey: publicKey });
    state.userInfo = name + ' <' + email + '>';
    downloadTextFile(privateKey, name.replace(/\s/g, '_') + '_PRIVATE.asc');
    downloadTextFile(publicKey, name.replace(/\s/g, '_') + '_PUBLIC.asc');
    updateKeyStatus();
    toast('Keys generated! Private and public key files downloaded.', 'success');
  } catch (e) {
    toast('Key generation failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Keys';
  }
}

// ==================== KEY IMPORT ====================
function handleImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  file.text().then(text => {
    pendingImportText = text;
    document.getElementById('importFileLabel').textContent = file.name;
    document.getElementById('btnImport').disabled = false;
    toast('Key file loaded — enter your passphrase and click Import', 'info');
  });
}

async function applyImportKey() {
  if (!pendingImportText) { toast('Select a key file first', 'warning'); return; }
  const passphrase = document.getElementById('importPassphrase').value;
  const btn = document.getElementById('btnImport');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Importing...';
  try {
    const privKey = await openpgp.readPrivateKey({ armoredKey: pendingImportText });
    if (!privKey.isDecrypted()) {
      if (!passphrase) { toast('This key requires a passphrase', 'warning'); btn.disabled = false; btn.textContent = 'Import Key'; return; }
      try {
        state.privateKey = await openpgp.decryptKey({ privateKey: privKey, passphrase });
      } catch (decryptErr) {
        toast('Wrong passphrase — please try again', 'error'); return;
      }
    } else {
      state.privateKey = privKey;
    }
    state.armoredPrivate = pendingImportText;
    state.publicKey = state.privateKey.toPublic();
    state.armoredPublic = state.publicKey.armor();
    const uid = state.privateKey.users[0]?.userID?.userID || 'Unknown';
    state.userInfo = uid;
    pendingImportText = null;
    updateKeyStatus();
    toast('Private key imported: ' + uid, 'success');
  } catch (e) {
    toast('Import failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Import Key';
  }
}

// ==================== KEY PUBLISHING ====================
async function publishKey() {
  if (!state.armoredPublic) { toast('No public key to publish', 'warning'); return; }
  const btn = document.getElementById('btnPublish');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Publishing...';
  const note = document.getElementById('publishNote');
  try {
    const uploadResp = await fetch('https://keys.openpgp.org/vks/v1/upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keytext: state.armoredPublic }),
    });
    if (!uploadResp.ok) throw new Error('Upload failed: server returned ' + uploadResp.status);
    const uploadData = await uploadResp.json();
    if (uploadData.token) {
      const emails = Object.keys(uploadData.status || {});
      const unpublished = emails.filter(e => uploadData.status[e] === 'unpublished');
      if (unpublished.length > 0) {
        await fetch('https://keys.openpgp.org/vks/v1/request-verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: uploadData.token, addresses: unpublished }),
        });
        note.classList.remove('hidden');
        note.textContent = 'Key uploaded! Verification email sent to ' + unpublished.join(', ') + '.';
        note.className = 'text-xs text-amber-600 mt-2';
        toast('Verification email sent — check your inbox', 'success');
      } else {
        note.classList.remove('hidden');
        note.textContent = 'Public key published successfully.';
        note.className = 'text-xs text-green-600 mt-2';
        toast('Public key published!', 'success');
      }
    }
  } catch (e) {
    note.classList.remove('hidden');
    note.textContent = 'Publish failed: ' + e.message;
    note.className = 'text-xs text-red-600 mt-2';
    toast('Failed to publish key', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publish Public Key';
  }
}

// ==================== RECIPIENT KEY LOOKUP ====================
async function lookupRecipient() {
  const email = document.getElementById('recipientEmail').value.trim();
  if (!email) { toast('Enter a recipient email', 'warning'); return; }
  const btn = document.getElementById('btnLookup');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Searching...';
  const statusEl = document.getElementById('recipientStatus');
  const inviteBox = document.getElementById('inviteBox');
  try {
    const resp = await fetch('https://keys.openpgp.org/vks/v1/by-email/' + encodeURIComponent(email));
    if (resp.status === 404) {
      state.recipientKey = null;
      statusEl.classList.add('hidden');
      inviteBox.classList.remove('hidden');
      document.getElementById('inviteText').textContent =
        'Hi! I want to send you an encrypted file.\n\n1. Go to: ' + window.location.origin + '\n2. Generate a key pair with your email (' + email + ')\n3. Publish your public key and verify via email\n4. Let me know when done!';
      toast('Recipient not found on keyserver', 'warning');
      updateEncryptButton();
      return;
    }
    if (!resp.ok) throw new Error('Keyserver returned ' + resp.status);
    const armored = await resp.text();
    state.recipientKey = await openpgp.readKey({ armoredKey: armored });
    inviteBox.classList.add('hidden');
    const uid = state.recipientKey.users[0]?.userID?.userID || email;
    const fp = state.recipientKey.getFingerprint().toUpperCase().match(/.{1,4}/g).join(' ');
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-md p-3"><p class="text-sm font-medium text-green-800">Key found: ' + escHtml(uid) + '</p><p class="text-xs text-green-600 font-mono mt-1">Fingerprint: ' + fp + '</p></div>';
    toast('Recipient key found!', 'success');
  } catch (e) {
    toast('Lookup failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Find Key';
    updateEncryptButton();
  }
}

async function importRecipientKeyFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    state.recipientKey = await openpgp.readKey({ armoredKey: text });
    const uid = state.recipientKey.users[0]?.userID?.userID || 'Unknown';
    const statusEl = document.getElementById('recipientStatus');
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-md p-3"><p class="text-sm font-medium text-green-800">Key imported: ' + escHtml(uid) + '</p></div>';
    document.getElementById('inviteBox').classList.add('hidden');
    toast('Recipient key imported', 'success');
  } catch (e) {
    toast('Import failed: ' + e.message, 'error');
  }
  updateEncryptButton();
}

// ==================== FILE SELECTION ====================
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  state.selectedFile = file;
  const info = document.getElementById('selectedFileInfo');
  info.classList.remove('hidden');
  info.textContent = file.name + ' (' + formatSize(file.size) + ')';
  updateEncryptButton();
}

// ==================== ENCRYPT ====================
function updateEncryptButton() {
  document.getElementById('btnEncrypt').disabled = !(state.recipientKey && state.selectedFile);
}

async function encryptFile() {
  if (!state.recipientKey || !state.selectedFile) return;
  const btn = document.getElementById('btnEncrypt');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Encrypting...';
  try {
    const fileData = new Uint8Array(await state.selectedFile.arrayBuffer());
    const message = await openpgp.createMessage({ binary: fileData, filename: state.selectedFile.name });
    const encryptOpts = { message, encryptionKeys: state.recipientKey, format: 'binary' };
    if (document.getElementById('signFile').checked && state.privateKey) {
      encryptOpts.signingKeys = state.privateKey;
    }
    const encrypted = await openpgp.encrypt(encryptOpts);
    downloadBlob(new Blob([encrypted], { type: 'application/pgp-encrypted' }), state.selectedFile.name + '.pgp');
    toast('File encrypted and downloaded!', 'success');
  } catch (e) {
    toast('Encryption failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Encrypt & Download';
    updateEncryptButton();
  }
}

// ==================== DECRYPT ====================
function updateDecryptTab() {
  const el = document.getElementById('decryptKeyStatus');
  if (state.privateKey) {
    el.innerHTML = '<span class="text-green-600 font-medium">Your private key is loaded (' + escHtml(state.userInfo) + '). Ready to decrypt.</span>';
  } else {
    el.textContent = 'You need to load your private key to decrypt files. Go to the "Your Keys" tab first.';
  }
}

function handleEncryptedFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  state.encryptedFile = file;
  const info = document.getElementById('encryptedFileInfo');
  info.classList.remove('hidden');
  info.textContent = file.name + ' (' + formatSize(file.size) + ')';
  updateDecryptButton();
}

function updateDecryptButton() {
  document.getElementById('btnDecrypt').disabled = !(state.privateKey && state.encryptedFile);
}

async function lookupSender() {
  const email = document.getElementById('senderEmail').value.trim();
  if (!email) return;
  const statusEl = document.getElementById('senderStatus');
  try {
    const resp = await fetch('https://keys.openpgp.org/vks/v1/by-email/' + encodeURIComponent(email));
    if (resp.status === 404) {
      state.senderKey = null;
      statusEl.classList.remove('hidden');
      statusEl.innerHTML = '<p class="text-sm text-amber-600">No key found. Signature verification will be skipped.</p>';
      return;
    }
    if (!resp.ok) throw new Error('Status ' + resp.status);
    const armored = await resp.text();
    state.senderKey = await openpgp.readKey({ armoredKey: armored });
    const uid = state.senderKey.users[0]?.userID?.userID || email;
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-md p-3"><p class="text-sm font-medium text-green-800">Verification key found: ' + escHtml(uid) + '</p></div>';
    toast('Sender key found', 'success');
  } catch (e) {
    toast('Lookup failed: ' + e.message, 'error');
  }
}

async function importSenderKeyFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    state.senderKey = await openpgp.readKey({ armoredKey: text });
    const uid = state.senderKey.users[0]?.userID?.userID || 'Unknown';
    const statusEl = document.getElementById('senderStatus');
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-md p-3"><p class="text-sm font-medium text-green-800">Verification key imported: ' + escHtml(uid) + '</p></div>';
    toast('Sender key imported', 'success');
  } catch (e) {
    toast('Import failed: ' + e.message, 'error');
  }
}

async function decryptFile() {
  if (!state.privateKey || !state.encryptedFile) return;
  const btn = document.getElementById('btnDecrypt');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Decrypting...';
  const resultEl = document.getElementById('decryptResult');
  resultEl.classList.add('hidden');
  try {
    const fileData = new Uint8Array(await state.encryptedFile.arrayBuffer());
    const message = await openpgp.readMessage({ binaryMessage: fileData });
    const decryptOpts = { message, decryptionKeys: state.privateKey, format: 'binary' };
    if (state.senderKey) decryptOpts.verificationKeys = state.senderKey;
    const { data, filename, signatures } = await openpgp.decrypt(decryptOpts);
    const outName = filename || state.encryptedFile.name.replace(/\.(pgp|gpg|asc)$/, '') || 'decrypted_file';
    downloadBlob(new Blob([data]), outName);
    let sigText = '';
    if (state.senderKey && signatures?.length > 0) {
      try { await signatures[0].verified; sigText = ' Signature verified!'; } catch { sigText = ' Warning: signature could not be verified.'; }
    } else if (!state.senderKey) { sigText = ' Signature not checked (no sender key provided).'; }
    resultEl.classList.remove('hidden');
    document.getElementById('decryptResultText').textContent = 'Decrypted "' + outName + '" (' + formatSize(data.byteLength) + ').' + sigText;
    toast('File decrypted!', 'success');
  } catch (e) {
    toast('Decryption failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Decrypt & Download';
    updateDecryptButton();
  }
}

// ==================== UTILITY ====================
function downloadTextFile(text, filename) { downloadBlob(new Blob([text], { type: 'text/plain' }), filename); }
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function downloadPublicKey() { if (state.armoredPublic) downloadTextFile(state.armoredPublic, 'public_key.asc'); }
function downloadPrivateKey() { if (state.armoredPrivate) downloadTextFile(state.armoredPrivate, 'private_key.asc'); }
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function escHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function copyInvite() { navigator.clipboard.writeText(document.getElementById('inviteText').textContent).then(() => toast('Copied!', 'success')); }

// ==================== DRAG & DROP ====================
document.querySelectorAll('.drop-zone').forEach(zone => {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const input = zone.querySelector('input[type="file"]');
    if (input && e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });
});
