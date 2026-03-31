import { useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $publicKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import { showToast } from '../../stores/toast';
import { encryptFileData } from '../../lib/openpgp-helpers';
import { formatSize, sanitizeFolderName, saveToFolder } from '../../lib/file-helpers';
import type { PublicKey } from 'openpgp';
import FileSelectedCard from '../shared/FileSelectedCard';
import ActionButton from '../shared/ActionButton';
import SuccessState from '../shared/SuccessState';

interface Props {
  recipientKey: PublicKey;
  recipientInfo: RecipientInfo;
  onBack: () => void;
}

export default function WizardEncryptFile({ recipientKey, recipientInfo, onBack }: Props) {
  const privateKey = useStore($privateKey);
  const publicKey = useStore($publicKey);
  const userInfo = useStore($userInfo);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signEnabled, setSignEnabled] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  function handleSwitchToKeys() {
    $activeTab.set('keyring');
  }

  async function handleEncrypt() {
    if (!selectedFile || !recipientKey) return;
    setEncrypting(true);
    try {
      const fileData = new Uint8Array(await selectedFile.arrayBuffer());
      const encrypted = await encryptFileData(fileData, selectedFile.name, recipientKey, signEnabled ? privateKey ?? undefined : undefined);
      const recipientEmail = recipientInfo.email;
      const outFilename = selectedFile.name + '_for_' + sanitizeFolderName(recipientEmail || 'unknown') + '.pgp';
      const subDir = 'encrypted/' + sanitizeFolderName(recipientEmail || 'unknown');
      const savedPath = await saveToFolder(new Blob([encrypted as BlobPart], { type: 'application/pgp-encrypted' }), outFilename, subDir, null);
      setSuccess(`Encrypted "${selectedFile.name}" for ${recipientInfo.name || recipientEmail} (${formatSize(selectedFile.size)}). Saved to: ${savedPath}`);
      showToast('File encrypted and downloaded!', 'success');
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
    <div className="fade-in">
      {/* Recipient info banner */}
      <div className="notice-box notice-info mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-indigo-500">Encrypting for</p>
          <p className="text-sm font-semibold text-indigo-900">{recipientInfo.name || recipientInfo.email}</p>
          {recipientInfo.name && <p className="text-xs text-indigo-600">{recipientInfo.email}</p>}
        </div>
        <button onClick={onBack} className="link-inline text-xs">Change</button>
      </div>

      {/* File select */}
      <div className="card mb-4">
        <h3 className="card-title">Select File to Encrypt</h3>
        <p className="text-xs text-gray-500 mb-4">The file is encrypted entirely in your browser.</p>
        {!selectedFile ? (
          <label className="drop-zone drop-zone-lg block">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            <svg className="drop-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p className="text-sm text-gray-500">Drop a file here or click to select</p>
          </label>
        ) : (
          <FileSelectedCard file={selectedFile} variant="encrypt" />
        )}
      </div>

      {/* Sign option */}
      <div className="card mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="rounded border-gray-300" checked={signEnabled} onChange={(e) => setSignEnabled(e.target.checked)} />
          Sign this file (optional — proves it's from you)
        </label>
        <p className="text-xs text-gray-400 mt-1 ml-5">Requires your private key. Set it up in the <button onClick={handleSwitchToKeys} className="link-inline">Keys tab</button>.</p>
        {signEnabled && (
          <div className="mt-3">
            {privateKey ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm font-medium text-green-800">Signing as: {userInfo || 'Unknown'}</p>
                <p className="text-xs text-green-600 font-mono mt-1">Fingerprint: {fingerprint}</p>
              </div>
            ) : (
              <div className="notice-box notice-info mb-3">
                <p className="text-xs text-indigo-700">No private key loaded. <button onClick={handleSwitchToKeys} className="link-inline">Set up your keys</button> first.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ActionButton
        onClick={handleEncrypt}
        disabled={!selectedFile || (signEnabled && !privateKey)}
        loading={encrypting}
        loadingText="Locking..."
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        {signEnabled ? 'Lock & Sign File' : 'Lock & Download File'}
      </ActionButton>

      {success && (
        <div className="mt-4">
          <SuccessState
            type="encrypt"
            ownerName={recipientInfo.name || recipientInfo.email}
            title="File Locked!"
            description={success}
          >
            <div className="flex gap-2" style={{ justifyContent: 'center' }}>
              <button onClick={handleReset} className="btn-sm">Lock Another File</button>
              <button onClick={() => $activeTab.set('encrypt')} className="btn-sm btn-ghost-sm">Go to Encrypt tab</button>
            </div>
          </SuccessState>
        </div>
      )}
    </div>
  );
}
