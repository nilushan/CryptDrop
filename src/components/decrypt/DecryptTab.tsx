import { useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import { showToast } from '../../stores/toast';
import { decryptFileData } from '../../lib/openpgp-helpers';
import { formatSize, sanitizeFolderName, saveToFolder } from '../../lib/file-helpers';
import type { PublicKey } from 'openpgp';
import FolderBar from '../shared/FolderBar';
import SenderContactPills from '../shared/SenderContactPills';
import SenderLookup from './SenderLookup';
import LockIllustration from '../shared/LockIllustration';

export default function DecryptTab() {
  const privateKey = useStore($privateKey);
  const userInfo = useStore($userInfo);

  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [senderKey, setSenderKey] = useState<PublicKey | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [result, setResult] = useState<{ filename: string; size: number; sigText: string; savedPath: string } | null>(null);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [senderEmail, setSenderEmail] = useState('');
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

  function handleSwitchToKeys() {
    $activeTab.set('keys');
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

  const canDecrypt = !!privateKey && !!encryptedFile && !decrypting;

  return (
    <div>
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Decrypt a File</h2>
          <p className="tab-subtitle">Unlock an encrypted file using your private key.</p>
        </div>
        {privateKey && (
          <div className="key-badge key-badge-ok">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/></svg>
            <span>{userInfo || 'Key loaded'}</span>
          </div>
        )}
      </div>

      <FolderBar folderHandle={folderHandle} onFolderChange={setFolderHandle} />

      <div className="local-assurance-bar mb-4">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <span>Decryption happens <strong>entirely in your browser</strong>. Your private key and file content never leave your device.</span>
      </div>

      {!privateKey && (
        <div className="notice-box notice-info mb-4">
          <p className="text-sm text-indigo-800 font-medium mb-1">Private key required</p>
          <p className="text-xs text-indigo-700">You need your private key to decrypt files. Set it up in the <button onClick={handleSwitchToKeys} className="link-inline">Keys tab</button> or use the Wizard.</p>
        </div>
      )}

      {/* File drop */}
      <div className="card mb-4">
        <h3 className="card-title">Encrypted File</h3>
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
        {encryptedFile && (
          <div className="mt-3 file-info">{encryptedFile.name} ({formatSize(encryptedFile.size)})</div>
        )}
      </div>

      {/* Verify sender */}
      <SenderContactPills onSenderKeyLoaded={(key) => setSenderKey(key)} />
      <SenderLookup onSenderKeyLoaded={(key) => setSenderKey(key)} />

      <button onClick={handleDecrypt} className="btn-primary w-full" disabled={!canDecrypt}>
        {decrypting ? 'Decrypting…' : 'Decrypt & Download File'}
      </button>

      {result && (
        <div className="success-box mt-4 fade-in">
          <LockIllustration ownerName={userInfo || 'You'} animationType="unlock" />
          <p className="success-title">Decryption Successful</p>
          <p className="success-body">
            Decrypted "{result.filename}" ({formatSize(result.size)}). Saved to: {result.savedPath}{result.sigText}
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleResetFile} className="btn-sm">Decrypt Another File</button>
            <button onClick={handleResetAll} className="btn-sm btn-ghost-sm">Clear All</button>
          </div>
        </div>
      )}
    </div>
  );
}
