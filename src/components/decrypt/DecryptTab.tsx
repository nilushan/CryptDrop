import { useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import { showToast } from '../../stores/toast';
import { decryptFileData } from '../../lib/openpgp-helpers';
import { formatSize, sanitizeFolderName, saveToFolder } from '../../lib/file-helpers';
import type { PublicKey } from 'openpgp';
import * as openpgp from 'openpgp';
import type { Contact } from '../../stores/contacts';
import FolderBar from '../shared/FolderBar';
import ContactListPicker from '../shared/ContactListPicker';
import KeyLookupCard from '../shared/KeyLookupCard';
import type { KeyLookupResult } from '../shared/KeyLookupCard';
import FileSelectedCard from '../shared/FileSelectedCard';
import ActionButton from '../shared/ActionButton';
import SuccessState from '../shared/SuccessState';
import SignatureResult from '../shared/SignatureResult';

export default function DecryptTab() {
  const privateKey = useStore($privateKey);
  const userInfo = useStore($userInfo);

  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [senderKey, setSenderKey] = useState<PublicKey | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [result, setResult] = useState<{ filename: string; size: number; sigText: string; savedPath: string } | null>(null);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [senderEmail, setSenderEmail] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setEncryptedFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }

  function handleDragLeave(e: React.DragEvent) {
    e.currentTarget.classList.remove('dragover');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) setEncryptedFile(file);
  }

  async function handleDecrypt() {
    if (!privateKey || !encryptedFile) return;
    setDecrypting(true);
    setResult(null);
    try {
      const fileData = new Uint8Array(await encryptedFile.arrayBuffer());
      const decResult = await decryptFileData(fileData, privateKey, senderKey);
      const outName = decResult.filename || encryptedFile.name.replace(/\.(pgp|gpg|asc)$/, '') || 'decrypted_file';
      const senderLabel = senderEmail.trim() || 'unknown';
      const subDir = 'decrypted/' + sanitizeFolderName(senderLabel);
      const savedPath = await saveToFolder(new Blob([decResult.data as BlobPart]), outName, subDir, folderHandle);
      setResult({ filename: outName, size: decResult.data.byteLength, sigText: decResult.signatureText, savedPath });
      showToast('File decrypted!', 'success');
    } catch (e) {
      showToast('Decryption failed: ' + (e as Error).message, 'error');
    } finally {
      setDecrypting(false);
    }
  }

  function handleResetFile() {
    setEncryptedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleResetAll() {
    handleResetFile();
    setSenderKey(null);
    setSenderEmail('');
  }

  async function handleSelectSenderContact(contact: Contact) {
    try {
      const key = await openpgp.readKey({ armoredKey: contact.armoredPublicKey });
      setSenderKey(key);
      showToast('Sender key loaded', 'success');
    } catch {
      showToast('Could not load key for ' + contact.email, 'error');
    }
  }

  function handleSenderKeyFound(result: KeyLookupResult) {
    setSenderKey(result.key);
    showToast('Sender key found', 'success');
  }

  if (result) {
    return (
      <div>
        <div className="tab-header">
          <div>
            <h2 className="tab-title">Decrypt a File</h2>
            <p className="tab-subtitle">Unlock an encrypted file using your private key.</p>
          </div>
        </div>
        <SuccessState
          type="decrypt"
          ownerName={userInfo || 'You'}
          title="File Unlocked!"
          description={`Decrypted "${result.filename}" (${formatSize(result.size)}). Saved to: ${result.savedPath}`}
        >
          <SignatureResult signatureText={result.sigText} />
          <div className="flex gap-2 mt-3" style={{ justifyContent: 'center' }}>
            <button onClick={handleResetFile} className="btn-sm">Unlock Another File</button>
            <button onClick={handleResetAll} className="btn-sm btn-ghost-sm">Clear All</button>
          </div>
        </SuccessState>
      </div>
    );
  }

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Unlock a File</h2>
          <p className="tab-subtitle">Decrypt an encrypted file using your private key.</p>
        </div>
        {privateKey && (
          <div className="key-badge key-badge-ok">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/></svg>
            <span>{userInfo || 'Key loaded'}</span>
          </div>
        )}
      </div>

      <FolderBar folderHandle={folderHandle} onFolderChange={setFolderHandle} />

      {!privateKey && (
        <div className="notice-box notice-info mb-4 animate-fade-in">
          <p className="text-sm text-indigo-800 font-medium mb-1">Private key required</p>
          <p className="text-xs text-indigo-700">You need your private key to decrypt files. Set it up in <button onClick={() => $activeTab.set('keyring')} className="link-inline">My Key Ring</button> or use the Wizard.</p>
        </div>
      )}

      {/* File drop */}
      <div className="card mb-4">
        <h3 className="card-title">Encrypted File</h3>
        {!encryptedFile ? (
          <label
            className="drop-zone drop-zone-lg block"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            <svg className="drop-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p className="text-sm text-gray-500">Drop an encrypted file here or click to select (.pgp, .gpg, .asc)</p>
          </label>
        ) : (
          <FileSelectedCard file={encryptedFile} variant="decrypt" />
        )}
      </div>

      {/* Verify sender */}
      {senderKey ? (
        <div className="animate-fade-in" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem',
          padding: '0.625rem 0.875rem', marginBottom: '0.75rem',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#16a34a', flexShrink: 0 }}>
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#166534' }}>Sender verification key loaded</span>
          <button
            onClick={() => setSenderKey(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', padding: '0.125rem', fontSize: '0.75rem' }}
          >
            clear
          </button>
        </div>
      ) : (
        <div className="card mb-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <h3 className="card-title" style={{ margin: '0 0 0.25rem' }}>Verify Sender <span className="text-gray-400 font-normal">(optional)</span></h3>
              <p className="text-xs text-gray-500" style={{ margin: 0 }}>If the file was signed, load the sender's public key to verify their identity.</p>
            </div>
            <button onClick={() => setShowLookup((v) => !v)} className="btn-ghost" style={{ flexShrink: 0 }}>
              {showLookup ? 'Cancel' : '+ New sender'}
            </button>
          </div>

          {!showLookup && (
            <ContactListPicker onSelect={handleSelectSenderContact} />
          )}

          {showLookup && (
            <KeyLookupCard
              placeholder="sender@email.com"
              buttonText="Find Key"
              onKeyFound={handleSenderKeyFound}
              saveToContacts={false}
              showCard={false}
            />
          )}
        </div>
      )}

      <ActionButton
        onClick={handleDecrypt}
        disabled={!privateKey || !encryptedFile}
        loading={decrypting}
        loadingText="Unlocking..."
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Unlock & Download File
      </ActionButton>
    </div>
  );
}
