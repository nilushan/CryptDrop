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
import LockIllustration from '../shared/LockIllustration';

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

  const canDecrypt = !!privateKey && !!encryptedFile && !decrypting;

  return (
    <div className="fade-in">
      <div className="card mb-4">
        <h3 className="card-title">Select Encrypted File</h3>
        <label className="drop-zone drop-zone-lg block">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          <svg className="drop-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <p className="text-sm text-gray-500">Drop encrypted file here or click to select</p>
        </label>
        {encryptedFile && (
          <div className="mt-3 file-info">{encryptedFile.name} ({formatSize(encryptedFile.size)})</div>
        )}
      </div>

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
            <button onClick={handleReset} className="btn-sm">Decrypt Another</button>
            <button onClick={() => $activeTab.set('decrypt')} className="btn-sm btn-ghost-sm">Go to Decrypt tab</button>
          </div>
        </div>
      )}
    </div>
  );
}
