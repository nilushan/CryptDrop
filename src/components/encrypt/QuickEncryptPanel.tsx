import { useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import type { Contact } from '../../stores/contacts';
import { $privateKey, $publicKey, $userInfo } from '../../stores/keys';
import { showToast } from '../../stores/toast';
import { encryptFileData } from '../../lib/openpgp-helpers';
import { formatSize, sanitizeFolderName, saveToFolder } from '../../lib/file-helpers';
import LockIllustration from '../shared/LockIllustration';
import * as openpgp from 'openpgp';

interface Props {
  contact: Contact;
  folderHandle: FileSystemDirectoryHandle | null;
  onClose: () => void;
}

export default function QuickEncryptPanel({ contact, folderHandle, onClose }: Props) {
  const privateKey = useStore($privateKey);
  const publicKey = useStore($publicKey);
  const userInfo = useStore($userInfo);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signEnabled, setSignEnabled] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [success, setSuccess] = useState<{ text: string; ownerName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
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
    if (file) setSelectedFile(file);
  }

  async function handleEncrypt() {
    if (!selectedFile) return;
    setEncrypting(true);
    try {
      const recipientKey = await openpgp.readKey({ armoredKey: contact.armoredPublicKey });
      const fileData = new Uint8Array(await selectedFile.arrayBuffer());
      const encrypted = await encryptFileData(fileData, selectedFile.name, recipientKey, signEnabled ? privateKey ?? undefined : undefined);
      const outFilename = selectedFile.name + '_for_' + sanitizeFolderName(contact.email || 'unknown') + '.pgp';
      const subDir = 'encrypted/' + sanitizeFolderName(contact.email || 'unknown');
      const savedPath = await saveToFolder(new Blob([encrypted as BlobPart], { type: 'application/pgp-encrypted' }), outFilename, subDir, folderHandle);
      setSuccess({
        text: `"${selectedFile.name}" encrypted for ${contact.name || contact.email} (${formatSize(selectedFile.size)}). Saved to: ${savedPath}`,
        ownerName: contact.name || contact.email,
      });
      showToast('File encrypted!', 'success');
    } catch (e) {
      showToast('Encryption failed: ' + (e as Error).message, 'error');
    } finally {
      setEncrypting(false);
    }
  }

  function handleReset() {
    setSelectedFile(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const fingerprint = publicKey
    ? publicKey.getFingerprint().toUpperCase().match(/.{1,4}/g)?.join(' ') ?? ''
    : '';

  return (
    <div className="encrypt-panel">
      <div className="encrypt-panel-header">
        <div>
          <p className="encrypt-panel-label">Encrypting for</p>
          <p className="encrypt-panel-name">{contact.name || contact.email}</p>
          <p className="encrypt-panel-fp">{contact.fingerprint ? 'Fingerprint: ' + contact.fingerprint : contact.email}</p>
        </div>
        <button onClick={onClose} className="btn-ghost-sm">&times; change</button>
      </div>

      <label
        className="drop-zone drop-zone-lg block"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <svg className="drop-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <p className="text-sm text-gray-500">Drop a file here or click to select</p>
      </label>
      {selectedFile && (
        <div className="file-info mt-3">{selectedFile.name} ({formatSize(selectedFile.size)})</div>
      )}

      <div className="sign-row">
        <input
          type="checkbox"
          id="quick-sign-react"
          className="rounded border-gray-300"
          checked={signEnabled}
          onChange={(e) => setSignEnabled(e.target.checked)}
        />
        <label htmlFor="quick-sign-react" className="text-xs text-gray-500 cursor-pointer">
          Sign this file <span className="text-gray-400">(optional — requires your private key)</span>
        </label>
      </div>
      {signEnabled && (
        <div className="mb-3">
          {privateKey ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm font-medium text-green-800">Signing as: {userInfo || 'Unknown'}</p>
              <p className="text-xs text-green-600 font-mono mt-1">Fingerprint: {fingerprint}</p>
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', margin: 0 }}>
              No private key loaded. Set up your keys in the Keys tab first.
            </p>
          )}
        </div>
      )}

      <button onClick={handleEncrypt} className="btn-primary w-full" disabled={!selectedFile || encrypting}>
        {encrypting ? 'Encrypting…' : 'Encrypt & Download'}
      </button>

      {success && (
        <div className="success-box mt-4 fade-in">
          <LockIllustration ownerName={success.ownerName} animationType="lock" />
          <p className="success-title">Encrypted!</p>
          <p className="success-body">{success.text}</p>
          <button onClick={handleReset} className="btn-sm mt-2">Encrypt another file</button>
        </div>
      )}
    </div>
  );
}
