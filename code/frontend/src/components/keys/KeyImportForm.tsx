import { useId, useState } from 'react';
import { importPrivateKey } from '../../lib/openpgp-helpers';
import { setKeys } from '../../stores/keys';
import { showToast } from '../../stores/toast';
import FileDropZone from '../shared/FileDropZone';
import FormField from '../shared/FormField';
import ActionButton from '../shared/ActionButton';

interface Props {
  onBack: () => void;
  /** Called after successful key import. */
  onSuccess?: () => void;
}

export default function KeyImportForm({ onBack, onSuccess }: Props) {
  const passphraseId = useId();
  const [error, setError] = useState('');
  const [armoredKey, setArmoredKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [importing, setImporting] = useState(false);

  function handleFile(file: File) {
    file.text().then((text) => {
      setError('');
      setArmoredKey(text);
      setFileName(file.name);
      showToast('Key file loaded — enter passphrase and click Import', 'info');
    }).catch((e: Error) => setError('Could not read key file: ' + e.message));
  }

  async function handleImport() {
    if (!armoredKey) {
      showToast('Select a key file first', 'warning');
      return;
    }
    setImporting(true);
    setError('');
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
      setError('Import failed: ' + msg);
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
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to options
      </button>
      <div className="private-key-card">
        <h3 className="private-key-section-title">Import Existing Keys</h3>
        <p className="private-key-section-body">Load a private key file (.asc) you already have. It will be held in memory for this session only.</p>
        <div className="key-gen-local-note mt-3">
          <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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
          <FormField id={passphraseId} label="Key passphrase (if protected)" help="Select a private key file first. Enter its existing passphrase if it has one." error={error}>
            <input id={passphraseId} type="password" autoComplete="off" className="input w-full"
              value={passphrase} onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
              aria-describedby={`${passphraseId}-help${error ? ` ${passphraseId}-error` : ''}`} />
          </FormField>
          <ActionButton onClick={handleImport} disabled={!armoredKey} loading={importing} loadingText="Importing…" className="btn-vault-action mt-3">
            Import Keys
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
