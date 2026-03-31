import { useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { $privateKey, $userInfo } from '../../stores/keys';
import { $activeTab } from '../../stores/activeTab';
import { showToast } from '../../stores/toast';
import { decryptFileData } from '../../lib/openpgp-helpers';
import { formatSize, sanitizeFolderName, saveToFolder } from '../../lib/file-helpers';
import type { PublicKey } from 'openpgp';
import SenderContactPills from '../shared/SenderContactPills';
import SenderLookup from '../decrypt/SenderLookup';
import FileSelectedCard from '../shared/FileSelectedCard';
import ActionButton from '../shared/ActionButton';
import SuccessState from '../shared/SuccessState';
import SignatureResult from '../shared/SignatureResult';

export default function WizardDecryptFile() {
  const privateKey = useStore($privateKey);
  const userInfo = useStore($userInfo);

  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [senderKey, setSenderKey] = useState<PublicKey | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [result, setResult] = useState<{ filename: string; size: number; sigText: string; savedPath: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
      const subDir = 'decrypted/' + sanitizeFolderName('unknown');
      const savedPath = await saveToFolder(new Blob([decResult.data as BlobPart]), outName, subDir, null);
      setResult({ filename: outName, size: decResult.data.byteLength, sigText: decResult.signatureText, savedPath });
      showToast('File decrypted!', 'success');
    } catch (e) {
      showToast('Decryption failed: ' + (e as Error).message, 'error');
    } finally {
      setDecrypting(false);
    }
  }

  function handleReset() {
    setEncryptedFile(null);
    setSenderKey(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="fade-in">
      <div className="card mb-4">
        <h3 className="card-title">Select Encrypted File</h3>
        {!encryptedFile ? (
          <label className="drop-zone drop-zone-lg block">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            <svg className="drop-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p className="text-sm text-gray-500">Drop encrypted file here or click to select</p>
          </label>
        ) : (
          <FileSelectedCard file={encryptedFile} variant="decrypt" />
        )}
      </div>

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
          <button onClick={() => setSenderKey(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', padding: '0.125rem', fontSize: '0.75rem' }}>clear</button>
        </div>
      ) : (
        <>
          <SenderContactPills onSenderKeyLoaded={(key) => setSenderKey(key)} />
          <SenderLookup onSenderKeyLoaded={(key) => setSenderKey(key)} />
        </>
      )}

      <ActionButton onClick={handleDecrypt} disabled={!privateKey || !encryptedFile} loading={decrypting} loadingText="Unlocking...">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Unlock & Download File
      </ActionButton>

      {result && (
        <div className="mt-4">
          <SuccessState
            type="decrypt"
            ownerName={userInfo || 'You'}
            title="File Unlocked!"
            description={`Decrypted "${result.filename}" (${formatSize(result.size)}). Saved to: ${result.savedPath}`}
          >
            <SignatureResult signatureText={result.sigText} />
            <div className="flex gap-2 mt-3" style={{ justifyContent: 'center' }}>
              <button onClick={handleReset} className="btn-sm">Unlock Another</button>
              <button onClick={() => $activeTab.set('decrypt')} className="btn-sm btn-ghost-sm">Go to Decrypt tab</button>
            </div>
          </SuccessState>
        </div>
      )}
    </div>
  );
}
