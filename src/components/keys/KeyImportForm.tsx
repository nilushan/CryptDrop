import { useState, useRef } from 'react';
import { importPrivateKey } from '../../lib/openpgp-helpers';
import { setKeys } from '../../stores/keys';
import { showToast } from '../../stores/toast';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      setArmoredKey(text);
      setFileName(file.name);
      showToast('Key file loaded — enter passphrase and click Import', 'info');
    });
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
    if (e.dataTransfer?.files.length && fileInputRef.current) {
      fileInputRef.current.files = e.dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
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
      showToast('Keys imported: ' + result.userInfo, 'success');
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
          <label
            className="drop-zone drop-zone-sm block mb-3"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".asc,.key,.pgp,.gpg"
              className="hidden"
              onChange={handleFileSelect}
            />
            <p className="text-sm text-gray-500">
              {fileName || 'Drop your private key file here or click to select'}
            </p>
          </label>
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
