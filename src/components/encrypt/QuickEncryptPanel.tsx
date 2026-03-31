import { useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { touchContact, type Contact } from '../../stores/contacts';
import { $privateKey, $publicKey, $userInfo } from '../../stores/keys';
import { showToast } from '../../stores/toast';
import { encryptFileData } from '../../lib/openpgp-helpers';
import { formatSize, sanitizeFolderName, saveToFolder } from '../../lib/file-helpers';
import FileSelectedCard from '../shared/FileSelectedCard';
import ActionButton from '../shared/ActionButton';
import SuccessState from '../shared/SuccessState';
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
      touchContact(contact.email);
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

  if (success) {
    return (
      <div className="encrypt-panel">
        <SuccessState
          type="encrypt"
          ownerName={success.ownerName}
          title="File Locked!"
          description={success.text}
        >
          <button onClick={handleReset} className="btn-sm">Lock another file</button>
        </SuccessState>
      </div>
    );
  }

  return (
    <div className="encrypt-panel animate-fade-in">
      <div className="encrypt-panel-header">
        <div>
          <p className="encrypt-panel-label">Encrypting for</p>
          <p className="encrypt-panel-name">{contact.name || contact.email}</p>
          <p className="encrypt-panel-fp">{contact.fingerprint ? 'Fingerprint: ' + contact.fingerprint : contact.email}</p>
        </div>
        <button onClick={onClose} className="btn-ghost-sm">&times; change</button>
      </div>

      {!selectedFile ? (
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
      ) : (
        <FileSelectedCard file={selectedFile} variant="encrypt" />
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

      <ActionButton
        onClick={handleEncrypt}
        disabled={!selectedFile || (signEnabled && !privateKey)}
        loading={encrypting}
        loadingText="Locking..."
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        {signEnabled ? 'Lock & Sign' : 'Lock & Download'}
      </ActionButton>
    </div>
  );
}
