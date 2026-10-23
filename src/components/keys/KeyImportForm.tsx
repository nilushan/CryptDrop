import { useState } from 'react';
import { importPrivateKey } from '../../lib/openpgp-helpers';
import { setKeys } from '../../stores/keys';
import { showToast } from '../../stores/toast';
import FileDropZone from '../shared/FileDropZone';

interface Props {
  onBack: () => void;
  /** Called after successful key import. */
  onSuccess?: () => void;
}

export default function KeyImportForm({ onBack, onSuccess }: Props) {
  const [armoredKey, setArmoredKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [importing, setImporting] = useState(false);

  function handleFile(file: File) {
    file.text().then((text) => {
      setArmoredKey(text);
      setFileName(file.name);
      showToast('Key file loaded — enter passphrase and click Import', 'info');
    });
  }

  async function handleImport() {
    if (!armoredKey) {
      showToast('Select a key file first', 'warning');
      return;
    }
    setImporting(true);
    try {
      const result = await importPrivateKey(armoredKey, passphrase);
      setKeys(result.privateKey, result.publicKey, armoredKey, result.armoredPublic, result.userInfo);
      if (result.isUnprotected) {
        showToast('Key imported for this session only. Add passphrase protection in a trusted PGP tool before remembering it on this device.', 'warning');
      } else {
        showToast('Keys imported: ' + result.userInfo, 'success');
      }
      setPassphrase('');
      onSuccess?.();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('passphrase')) {
        showToast(msg, 'warning');
      } else {
        showToast('Import failed: ' + msg, 'error');
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} className="keys-back-link">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to options
      </button>
      <div className="private-key-card">
        <h3 className="private-key-section-title">Import Existing Keys</h3>
        <p className="private-key-section-body">Load a private key file (.asc) you already have. It will be held in memory for this session only.</p>
        <div className="key-gen-local-note mt-3">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Read locally — your key never leaves your device.
        </div>
        <div className="mt-4">
          <FileDropZone
            onFile={handleFile}
            placeholder={fileName || 'Drop your private key file here or click to select'}
            size="sm"
            accept=".asc,.key,.pgp,.gpg,text/plain,application/pgp-keys,application/pgp-encrypted,application/octet-stream"
            className="mb-3"
          />
          <input
            type="password"
            placeholder="Passphrase (if your key has one)"
            className="input w-full mb-3"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <button onClick={handleImport} disabled={!armoredKey || importing} className="btn-vault-action">
            {importing ? 'Importing…' : 'Import Keys'}
          </button>
        </div>
      </div>
    </div>
  );
}
